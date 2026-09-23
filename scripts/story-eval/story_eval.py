#!/usr/bin/env python3
"""
StoryLoop story-output evaluator.

Answers one question before anything touching stories ships: is the output as
good as it was, and does it still never put words in a child's mouth?

    python3 scripts/story-eval/story_eval.py run      --out runs/baseline   [--reps 1] [--only id,id]
    python3 scripts/story-eval/story_eval.py score    --run runs/baseline   [--no-judge]
    python3 scripts/story-eval/story_eval.py compare  --baseline runs/baseline --candidate runs/candidate

`run` sends every note in cases.json through the real writer
(generateLearningStory, the function /api/generate calls, with every guard and
rescue) via run-stories.mts. `score` checks each draft two ways:

  1. Deterministic checks that cannot be argued with: every quoted phrase the
     child is presented as saying must appear in the note; framework language
     must match the country; no em dashes; the educator-ready sections are all
     there; numbers and capitalised names that are not in the note are listed.
  2. An independent judge (a different model from the writer, gpt-5.4 by
     default) that reads the note and the draft and lists anything presented as
     observed fact that the note does not support: invented speech, invented
     events, feelings stated as fact, new people. Interpretation of learning
     ("this shows...") is allowed and is not counted.

`compare` fails (exit code 1) if the candidate is worse than the baseline on
any hard invariant, invents more, or scores lower on fidelity or usefulness
beyond the judge's own run-to-run noise.

Keys are read from the environment, or from --env-file (default: the root
checkout's .env.local). They are never printed.
"""
import argparse
import concurrent.futures as futures
import json
import os
import re
import statistics
import subprocess
import sys
import time
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
CASES = HERE / "cases.json"
DEFAULT_ENV_FILE = Path("/Volumes/Dev SSD/storyloop/.env.local")
JUDGE_MODEL = os.environ.get("STORY_EVAL_JUDGE_MODEL", "gpt-5.4")

SPEECH_VERBS = (
    "said", "says", "asked", "asks", "called", "calls", "told", "tells", "explained", "shouted",
    "whispered", "replied", "sang", "exclaimed", "added", "announced", "answered", "cried",
    "yelled", "declared", "responded", "commented", "remarked", "saying", "asking", "telling",
)
SECTION_PATTERNS = {
    "learning_story": r"^\s*learning story\s*$",
    "learning_noticed": r"^\s*what learning (we|i) noticed|^\s*what (this )?learning shows",
    "curriculum": r"^\s*(curriculum|eylf|te wh[aā]riki)[^\n]*links?",
    "next": r"^\s*where to next|^\s*responding|^\s*next steps",
    "family": r"^\s*(family|wh[aā]nau)[^\n]*(link|connection)",
}
NZ_ONLY = ("te whāriki", "te whariki", "mana reo", "mana atua", "mana tangata", "mana whenua", "mana aotūroa", "mana aoturoa")
AU_ONLY = ("eylf", "outcome 1", "outcome 2", "outcome 3", "outcome 4", "outcome 5")
# Capitalised words that are fine in a draft even when the note never used them.
CAPITAL_OK = set("""
i we our the a an this that these those they he she it his her their them its as at in on and but so when while then
after before during with by for from to of if into onto near next where what why how who which
learning story curriculum links link family whānau whanau responding next steps noticed eylf te whāriki whariki
outcome outcomes mana reo atua tangata whenua aotūroa aoturoa children child kaiako tamariki māori maori english
belonging being becoming wellbeing identity communication contribution exploration
dispositions disposition teacher teachers educator educators centre home mum dad
monday tuesday wednesday thursday friday saturday sunday today yesterday tomorrow morning afternoon
australia australian new zealand aotearoa v2.0 framework frameworks principles practice practices
look now yes no ok okay green blue red yellow purple
""".split())
NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20, "thirty": 30, "forty": 40,
}


# --------------------------------------------------------------------- utils
# Only the AI keys are read. That file also holds the live Stripe key and the
# production database key, and nothing here should ever be able to reach them.
ENV_ALLOWLIST = {"OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_STORY_MODEL", "ANTHROPIC_STORY_MODEL"}


def load_env(env_file):
    path = Path(env_file) if env_file else DEFAULT_ENV_FILE
    if path.exists():
        for line in path.read_text().splitlines():
            match = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
            if match and match.group(1) in ENV_ALLOWLIST and match.group(1) not in os.environ:
                value = match.group(2).strip().strip('"').strip("'")
                os.environ[match.group(1)] = value


def norm(text):
    text = unicodedata.normalize("NFKC", text or "")
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    text = text.lower()
    text = re.sub(r"[^a-z0-9āēīōū' ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def strip_macrons(text):
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


def in_note(fragment, note):
    a, b = norm(fragment), norm(note)
    if not a:
        return True
    if a in b or strip_macrons(a) in strip_macrons(b):
        return True
    # Tolerate a dropped or added apostrophe ("its" / "it's").
    return a.replace("'", "") in b.replace("'", "")


def words(text):
    return len(re.findall(r"\b[\w'’-]+\b", text or ""))


# ------------------------------------------------------ deterministic checks
QUOTE_RE = re.compile(r'"([^"\n]{1,160})"|“([^”\n]{1,160})”|‘([^’\n]{1,160})’|(?<![A-Za-z])\'([^\'\n]{1,120})\'(?![A-Za-z])')


def find_quotes(story):
    out = []
    for match in QUOTE_RE.finditer(story or ""):
        text = next(group for group in match.groups() if group is not None)
        before = story[max(0, match.start() - 60):match.start()].lower()
        after = story[match.end():match.end() + 40].lower()
        speech = any(re.search(r"\b%s\b" % verb, before + " " + after) for verb in SPEECH_VERBS)
        out.append({"text": text.strip(), "speech": speech})
    return out


def check_story(case, result):
    story = result.get("story") or ""
    note = case["observations"]
    framework = case["framework"]
    lower = story.lower()
    issues = []      # hard failures
    warnings = []    # worth a human look

    # Quotes are only the child's words in the parts of the draft that report
    # what happened. "Where to next" and the family link suggest questions an
    # adult might ask ("How many do you have now?"), which are not claims about
    # what anyone said.
    observed = re.split(r"(?im)^\s*(where to next|responding|next steps|family link|wh[aā]nau link|family connection)", story)[0]
    for quote in find_quotes(observed):
        if in_note(quote["text"], note):
            continue
        # A quoted curriculum phrase or heading is not a child speaking.
        if not quote["speech"]:
            warnings.append({"kind": "quote_not_in_note", "text": quote["text"]})
            continue
        issues.append({"kind": "invented_speech", "text": quote["text"]})

    if framework == "NZ" and any(term in lower for term in AU_ONLY):
        issues.append({"kind": "framework_leak", "text": "Australian framework language in a New Zealand story"})
    if framework == "AU" and any(term in lower for term in NZ_ONLY):
        issues.append({"kind": "framework_leak", "text": "Te Whāriki language in an Australian story"})

    if "—" in story:
        issues.append({"kind": "em_dash", "text": "%d em dashes" % story.count("—")})

    missing = [name for name, pattern in SECTION_PATTERNS.items() if not re.search(pattern, story, re.I | re.M)]
    if missing:
        issues.append({"kind": "missing_sections", "text": ", ".join(missing)})

    # Numbers the note never gave. Outcome numbers and framework versions are
    # the framework's, not the child's.
    note_numbers = set(int(n) for n in re.findall(r"\b\d+\b", note))
    note_numbers |= set(v for k, v in NUMBER_WORDS.items() if re.search(r"\b%s\b" % k, note.lower()))
    age_numbers = set(int(n) for n in re.findall(r"\d+", case.get("ageGroup") or ""))
    body = re.sub(r"outcome\s+\d", "", lower)
    body = re.sub(r"v\d(\.\d)?", "", body)
    for token in re.findall(r"\b\d+\b", body):
        value = int(token)
        if value not in note_numbers and value not in age_numbers:
            warnings.append({"kind": "number_not_in_note", "text": token})
    for word, value in NUMBER_WORDS.items():
        if value >= 3 and re.search(r"\b%s\b" % word, body) and value not in note_numbers and value not in age_numbers:
            warnings.append({"kind": "number_not_in_note", "text": word})

    # Capitalised words that are not sentence starts, not in the note and not
    # framework vocabulary: usually a name the note never gave.
    known = set(norm(note).split()) | set(norm(" ".join(case.get("educatorNames") or [])).split())
    if case.get("childName"):
        known |= set(norm(case["childName"]).split())
    for sentence in re.split(r"(?<=[.!?:\n])\s+", story):
        tokens = re.findall(r"\b([A-ZĀĒĪŌŪ][a-zāēīōū'’]+)\b", sentence)
        for token in tokens[1:] if sentence and sentence[0].isupper() else tokens:
            key = norm(token).replace("'s", "")
            if key and key not in known and strip_macrons(key) not in CAPITAL_OK and key not in CAPITAL_OK:
                warnings.append({"kind": "capitalised_not_in_note", "text": token})

    return {
        "issues": issues,
        "warnings": dedupe(warnings),
        "words": words(story),
        "quotes": find_quotes(story),
        "quality": (result.get("storyQuality") or {}).get("score"),
        "pass": (result.get("storyQuality") or {}).get("passes"),
        "privacy_flags": privacy_flags(result),
    }


def privacy_flags(result):
    guardian = result.get("privacyGuardian") or {}
    return [issue.get("label") for issue in guardian.get("issues") or [] if isinstance(issue, dict)]


def dedupe(items):
    seen, out = set(), []
    for item in items:
        key = (item["kind"], item["text"].lower())
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


# ---------------------------------------------------------------- the judge
JUDGE_PROMPT = """You are auditing an AI-drafted early childhood learning story for fidelity to the educator's note.
You are strict, fair, and you know early childhood practice in New Zealand (Te Whāriki) and Australia (EYLF V2.0).

The draft may INTERPRET learning ("this shows...", "Noah may be exploring..."), suggest next steps, and suggest family
links. None of that counts against it. What counts is anything presented as something that HAPPENED, was SAID, or was
FELT that the note does not support.

Return JSON only, with these keys:
- invented_speech: list of words the draft presents the child (or anyone) as saying that are not in the note.
- invented_events: list of actions, objects, people or events presented as observed fact that the note does not contain.
- invented_feelings: list of emotions stated as observed fact (e.g. "proudly", "was frustrated") with no basis in the
  note. Hedged interpretation ("seemed", "may have felt") is fine and must NOT be listed.
- invented_people: names or people who are not in the note.
- fidelity: integer 1-10. 10 = every factual claim traceable to the note.
- usefulness: integer 1-10. Would an experienced registered ECE teacher use this with only light edits?
- reads_naturally: integer 1-10. Warm, specific, professional; not generic or padded.
- note: one sentence, the single most important thing an educator would change.
Be precise: quote the exact phrase from the draft in each list item. Empty lists when there is nothing."""


def judge(case, story, model):
    import requests

    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        return {"error": "no OPENAI_API_KEY"}
    content = "Country and framework: %s\nAge group: %s\nChild: %s\n\nEDUCATOR NOTE:\n%s\n\nDRAFT:\n%s" % (
        "New Zealand, Te Whāriki" if case["framework"] == "NZ" else "Australia, EYLF V2.0",
        case.get("ageGroup") or "not given",
        case.get("childName") or "not named in the note",
        case["observations"],
        story,
    )
    body = {
        "model": model,
        "messages": [{"role": "system", "content": JUDGE_PROMPT}, {"role": "user", "content": content}],
        "response_format": {"type": "json_object"},
    }
    if re.match(r"^(gpt-5|o\d)", model):
        body["reasoning_effort"] = "medium"
    for attempt in range(3):
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
                json=body,
                timeout=180,
            )
            data = response.json()
            if "error" in data:
                raise RuntimeError(data["error"].get("message"))
            return json.loads(data["choices"][0]["message"]["content"])
        except Exception as error:  # noqa: BLE001 - reported, retried
            last = str(error)
            time.sleep(2 * (attempt + 1))
    return {"error": last}


# ------------------------------------------------------------------ commands
def cmd_run(args):
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    cmd = [str(REPO / "node_modules/.bin/tsx"), str(HERE / "run-stories.mts"), str(CASES), str(out / "raw.json"),
           "--reps", str(args.reps), "--concurrency", str(args.concurrency)]
    if args.only:
        cmd += ["--only", args.only]
    print("Writing %s drafts with the real pipeline..." % ("all" if not args.only else args.only), file=sys.stderr)
    started = time.time()
    subprocess.run(cmd, cwd=REPO, check=True)
    print("Done in %ds -> %s" % (time.time() - started, out / "raw.json"), file=sys.stderr)


def cmd_score(args):
    run = Path(args.run)
    raw = json.loads((run / "raw.json").read_text())
    cases = {c["id"]: c for c in json.loads(CASES.read_text())}
    rows = []
    for item in raw["results"]:
        case = cases[item["id"]]
        if not item.get("ok"):
            rows.append({"id": item["id"], "rep": item["rep"], "error": item.get("error")})
            continue
        result = item["result"]
        row = {"id": item["id"], "rep": item["rep"], "ms": item["ms"], "check": check_story(case, result),
               "story": result.get("story")}
        rows.append(row)

    previous = {}
    if args.reuse_judge and (run / "scored.json").exists():
        for old in json.loads((run / "scored.json").read_text())["rows"]:
            if old.get("judge"):
                previous[(old["id"], old.get("rep"))] = old["judge"]
    if previous:
        for row in rows:
            if (row["id"], row.get("rep")) in previous:
                row["judge"] = previous[(row["id"], row.get("rep"))]
    if not args.no_judge:
        todo = [r for r in rows if "story" in r and "judge" not in r]
        with futures.ThreadPoolExecutor(max_workers=6) as pool:
            verdicts = list(pool.map(lambda r: judge(cases[r["id"]], r["story"], args.judge_model), todo))
        for row, verdict in zip(todo, verdicts):
            row["judge"] = verdict

    summary = summarise(rows)
    (run / "scored.json").write_text(json.dumps({"summary": summary, "rows": rows}, indent=2, ensure_ascii=False))
    (run / "report.md").write_text(render_report(run.name, summary, rows, cases), encoding="utf-8")
    print(json.dumps(summary, indent=2))


def summarise(rows):
    ok = [r for r in rows if "check" in r]
    judged = [r for r in ok if isinstance(r.get("judge"), dict) and "error" not in r["judge"]]

    def count(kind):
        return sum(1 for r in ok for i in r["check"]["issues"] if i["kind"] == kind)

    def judged_total(key):
        return sum(len(r["judge"].get(key) or []) for r in judged)

    def mean(key):
        values = [r["judge"].get(key) for r in judged if isinstance(r["judge"].get(key), (int, float))]
        return round(statistics.mean(values), 2) if values else None

    return {
        "drafts": len(rows),
        "errors": len(rows) - len(ok),
        "hard_pass_rate": round(sum(1 for r in ok if not r["check"]["issues"]) / max(1, len(ok)), 3),
        "invented_speech_deterministic": count("invented_speech"),
        "framework_leaks": count("framework_leak"),
        "em_dash_drafts": count("em_dash"),
        "missing_section_drafts": count("missing_sections"),
        "judged": len(judged),
        "judge_invented_speech": judged_total("invented_speech"),
        "judge_invented_events": judged_total("invented_events"),
        "judge_invented_feelings": judged_total("invented_feelings"),
        "judge_invented_people": judged_total("invented_people"),
        "fidelity": mean("fidelity"),
        "usefulness": mean("usefulness"),
        "reads_naturally": mean("reads_naturally"),
        "median_words": statistics.median([r["check"]["words"] for r in ok]) if ok else None,
        "median_seconds": round(statistics.median([r["ms"] for r in ok]) / 1000, 1) if ok else None,
        "pipeline_passes": sum(1 for r in ok if r["check"]["pass"]),
        "privacy_flagged_drafts": sum(1 for r in ok if r["check"]["privacy_flags"]),
        "mean_pipeline_quality": round(statistics.mean([r["check"]["quality"] for r in ok if isinstance(r["check"]["quality"], (int, float))]), 1) if ok else None,
    }


def render_report(name, summary, rows, cases):
    lines = ["# Story output report: %s" % name, "", "| Measure | Value |", "|---|---|"]
    for key, value in summary.items():
        lines.append("| %s | %s |" % (key.replace("_", " "), value))
    lines += ["", "## Drafts", ""]
    for row in rows:
        lines.append("### %s (rep %s)" % (row["id"], row.get("rep")))
        if "error" in row:
            lines += ["ERROR: %s" % row["error"], ""]
            continue
        check = row["check"]
        judge_result = row.get("judge") or {}
        lines.append("- words %s, pipeline quality %s, %.0fs, privacy check: %s" % (
            check["words"], check["quality"], row["ms"] / 1000, ", ".join(check["privacy_flags"]) or "clear"))
        for issue in check["issues"]:
            lines.append("- **FAIL** %s: %s" % (issue["kind"], issue["text"]))
        for warning in check["warnings"]:
            lines.append("- check %s: %s" % (warning["kind"], warning["text"]))
        if judge_result and "error" not in judge_result:
            lines.append("- judge: fidelity %s, usefulness %s, natural %s" % (
                judge_result.get("fidelity"), judge_result.get("usefulness"), judge_result.get("reads_naturally")))
            for key in ("invented_speech", "invented_events", "invented_feelings", "invented_people"):
                for item in judge_result.get(key) or []:
                    lines.append("- judge %s: %s" % (key, item))
            if judge_result.get("note"):
                lines.append("- judge note: %s" % judge_result["note"])
        lines += ["", "<details><summary>Note and draft</summary>", "", "NOTE: " + cases[row["id"]]["observations"], "",
                  "```", row["story"] or "", "```", "</details>", ""]
    return "\n".join(lines)


def cmd_compare(args):
    base = json.loads((Path(args.baseline) / "scored.json").read_text())["summary"]
    cand = json.loads((Path(args.candidate) / "scored.json").read_text())["summary"]
    failures = []
    for key in ("invented_speech_deterministic", "framework_leaks", "em_dash_drafts", "missing_section_drafts"):
        if (cand.get(key) or 0) > (base.get(key) or 0):
            failures.append("%s rose from %s to %s" % (key, base.get(key), cand.get(key)))
    if (cand.get("hard_pass_rate") or 0) < (base.get("hard_pass_rate") or 0):
        failures.append("hard pass rate fell from %s to %s" % (base.get("hard_pass_rate"), cand.get("hard_pass_rate")))
    # The judge is itself a model and varies run to run; allow one item of
    # noise per invented-content category, and 0.3 on the 1-10 scores.
    for key in ("judge_invented_speech", "judge_invented_events", "judge_invented_feelings", "judge_invented_people"):
        if (cand.get(key) or 0) > (base.get(key) or 0) + 1:
            failures.append("%s rose from %s to %s" % (key, base.get(key), cand.get(key)))
    for key in ("fidelity", "usefulness", "reads_naturally"):
        if base.get(key) is not None and cand.get(key) is not None and cand[key] < base[key] - 0.3:
            failures.append("%s fell from %s to %s" % (key, base[key], cand[key]))
    print("%-34s %10s %10s" % ("measure", "baseline", "candidate"))
    for key in base:
        print("%-34s %10s %10s" % (key, base.get(key), cand.get(key)))
    if failures:
        print("\nWORSE THAN BASELINE:\n  " + "\n  ".join(failures))
        sys.exit(1)
    print("\nOK: candidate is as good as or better than baseline on every measure.")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    parser.add_argument("--env-file", default=None)
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run")
    run.add_argument("--out", required=True)
    run.add_argument("--reps", type=int, default=1)
    run.add_argument("--only", default=None)
    run.add_argument("--concurrency", type=int, default=4)
    score = sub.add_parser("score")
    score.add_argument("--run", required=True)
    score.add_argument("--no-judge", action="store_true")
    score.add_argument("--reuse-judge", action="store_true", help="keep verdicts from an earlier score of this run")
    score.add_argument("--judge-model", default=JUDGE_MODEL)
    compare = sub.add_parser("compare")
    compare.add_argument("--baseline", required=True)
    compare.add_argument("--candidate", required=True)
    args = parser.parse_args()
    load_env(args.env_file)
    {"run": cmd_run, "score": cmd_score, "compare": cmd_compare}[args.command](args)


if __name__ == "__main__":
    main()
