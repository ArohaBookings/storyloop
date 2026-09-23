#!/usr/bin/env python3
"""
StoryLoop landing-page test: do people get it in ten seconds, and would they buy?

    python3 scripts/site-eval/site_eval.py shoot  --url https://storyloop.space --out runs/live
    python3 scripts/site-eval/site_eval.py panel  --shots runs/live --samples 120
    python3 scripts/site-eval/site_eval.py compare --baseline runs/live --candidate runs/new

SHOOT takes what a visitor actually sees: the first screen on a phone, a laptop
and a wide monitor, plus the whole page as text and in screenshots.

PANEL is a Monte Carlo panel. Each sample draws a visitor from a weighted mix
that mirrors where StoryLoop traffic really comes from (mostly educators on a
phone, arriving from a Facebook group), randomises the things that change how
a real person reacts (time on documentation, attitude to AI, tech comfort,
budget, how distracted they are), and shows that person:

  1. TEN SECONDS: only the first screen on their device. They say what they
     think the product is, who it is for, what it costs, and what they would do.
     Answers are graded against the truth by fixed rules, not by the model.
  2. SIXTY SECONDS: the whole page. They say how likely they are to sign up
     free, to pay after a trial at the real price, and what stops them.

The simulated people are a different model family from anything that wrote the
page (OpenAI, default gpt-5.4; add --models gpt-5.4,gpt-4.1 for two opinions).
Simulated intent is always too optimistic, so the funnel is CALIBRATED: the
baseline run is scaled to StoryLoop's real visitor-to-signup rate (pass
--real-signup-rate), and a candidate is reported as a lift on that. Treat the
absolute numbers as a model; treat a large relative lift or drop as a signal.
"""
import argparse
import base64
import concurrent.futures as futures
import io
import json
import math
import os
import random
import re
import statistics
import sys
import time
from pathlib import Path

DEFAULT_ENV_FILE = Path("/Volumes/Dev SSD/storyloop/.env.local")
ENV_ALLOWLIST = {"OPENAI_API_KEY"}

VIEWPORTS = {
    "phone": {"width": 390, "height": 844, "scale": 2, "mobile": True},
    "laptop": {"width": 1440, "height": 900, "scale": 1, "mobile": False},
    "wide": {"width": 2560, "height": 1440, "scale": 1, "mobile": False},
}

# Where visitors come from. Weights are the share of traffic; "phone" is the
# chance that person is on a phone. Educators from Facebook groups dominate.
PERSONAS = [
    {"id": "nz_kaiako", "w": 0.17, "phone": 0.8, "who": "a kaiako (teacher) at a kindergarten in New Zealand, uses Storypark, writes several learning stories a week"},
    {"id": "au_room_leader", "w": 0.20, "phone": 0.85, "who": "a room leader at a long day care centre in Australia, uses Educa, often finishes documentation at home at night"},
    {"id": "au_director", "w": 0.11, "phone": 0.4, "who": "the director of a 90-place long day care centre in Australia, responsible for the budget, the team's workload and meeting the National Quality Standard"},
    {"id": "nz_manager", "w": 0.08, "phone": 0.4, "who": "the manager of an education and care centre in New Zealand, answerable to ERO and worried about teacher burnout"},
    {"id": "skeptic", "w": 0.12, "phone": 0.6, "who": "an experienced early childhood teacher with 20 years in the sector who distrusts AI and cares deeply about authentic, child-centred documentation and children's privacy"},
    {"id": "student", "w": 0.08, "phone": 0.9, "who": "an early childhood student teacher on placement who finds writing learning stories slow and stressful"},
    {"id": "home_based", "w": 0.07, "phone": 0.8, "who": "a home-based educator (family day care in Australia or PORSE in New Zealand) working alone with four children"},
    {"id": "parent", "w": 0.08, "phone": 0.9, "who": "a parent of a three-year-old who clicked a link a friend shared; not an educator"},
    {"id": "area_manager", "w": 0.05, "phone": 0.3, "who": "an area manager for a group of eight childcare centres, comparing documentation tools for all of them"},
    {"id": "primary_teacher", "w": 0.04, "phone": 0.6, "who": "a primary school teacher (not early childhood) who saw the link in a teachers' group"},
]
# Measured on storyloop.space over 60 days to 2026-09-23: 55% of sessions were
# on a phone. The per-persona phone odds above average 0.69, so they are scaled
# to land on the real share.
PHONE_SCALE = 0.8

TARGET = {"nz_kaiako", "au_room_leader", "au_director", "nz_manager", "skeptic", "student", "home_based", "area_manager"}

TEN_SECOND_PROMPT = """You are role-playing a real person seeing a website for the first time. Stay in character.
You are {who}. {traits}
You are on your {device}. You {context}. You glanced at the screen below for about ten seconds, the way people really
do, before deciding whether to keep reading. You have NOT scrolled. Answer only from what you could take in during
those ten seconds. If something was not clear in that time, say so; do not work it out from outside knowledge.

Return JSON only:
- what_is_it: one sentence, in your own words, what this product does.
- who_for: who it is for.
- cost: what you believe it costs to start, in your own words ("free", a price, or "no idea").
- trial: what you believe you can try before paying, in your own words, or "no idea".
- next_action: one of "try the demo", "start free signup", "look at pricing", "scroll to learn more", "leave".
- clarity: 0-10, how clear it was what this is.
- trust: 0-10.
- interest: 0-10, for you personally.
- confusing: the one thing that confused or put you off, or "nothing"."""

SIXTY_SECOND_PROMPT = """You are role-playing a real person. Stay in character; be as sceptical or keen as that person really would be.
You are {who}. {traits}
You are on your {device}. You {context}. You have now spent about a minute on this website, scrolling the whole page.
The screenshots show the top of the page; the full text of the page follows. Prices are real.

PAGE TEXT:
{text}

Return JSON only:
- signup_free: 0-100, the chance you create a free account today.
- pay_after_trial: 0-100, the chance that, a month from now, you are paying for it (or your centre is).
- price_feels: "cheap", "fair", "expensive" or "not relevant to me".
- biggest_objection: the one thing most likely to stop you.
- missing: what you wanted to know and could not find, or "nothing".
- would_make_me_buy: the one change or proof that would most increase your chance of paying.
- one_line_verdict: what you would say to a colleague about it, in one sentence."""


# ------------------------------------------------------------------- helpers
def load_env(env_file):
    path = Path(env_file) if env_file else DEFAULT_ENV_FILE
    if path.exists():
        for line in path.read_text().splitlines():
            match = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
            if match and match.group(1) in ENV_ALLOWLIST and match.group(1) not in os.environ:
                os.environ[match.group(1)] = match.group(2).strip().strip('"').strip("'")


def b64_png(path, max_width=1400):
    from PIL import Image

    image = Image.open(path)
    if image.width > max_width:
        image = image.resize((max_width, int(image.height * max_width / image.width)))
    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="JPEG", quality=82)
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()


def ask(model, prompt, images):
    import requests

    content = [{"type": "text", "text": prompt}] + [{"type": "image_url", "image_url": {"url": url}} for url in images]
    body = {"model": model, "messages": [{"role": "user", "content": content}], "response_format": {"type": "json_object"}}
    if re.match(r"^(gpt-5|o\d)", model):
        body["reasoning_effort"] = "low"
    else:
        body["temperature"] = 1.0
    last = None
    for attempt in range(4):
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"], "Content-Type": "application/json"},
                json=body,
                timeout=180,
            )
            data = response.json()
            if "error" in data:
                raise RuntimeError(data["error"].get("message"))
            return json.loads(data["choices"][0]["message"]["content"])
        except Exception as error:  # noqa: BLE001 - retried, then reported
            last = str(error)
            time.sleep(3 * (attempt + 1))
    return {"error": last}


# ------------------------------------------------------------------- shoot
def cmd_shoot(args):
    from playwright.sync_api import sync_playwright

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    meta = {"url": args.url, "taken": time.strftime("%Y-%m-%d %H:%M:%S")}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, vp in VIEWPORTS.items():
            context = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                device_scale_factor=vp["scale"],
                is_mobile=vp["mobile"],
                has_touch=vp["mobile"],
                user_agent=(
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
                    if vp["mobile"] else None
                ),
            )
            page = context.new_page()
            page.goto(args.url, wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(2500)
            page.screenshot(path=str(out / ("%s-fold.png" % name)))
            if name != "wide":
                height = page.evaluate("document.documentElement.scrollHeight")
                page.screenshot(path=str(out / ("%s-full.png" % name)), full_page=True)
                meta["%s_height" % name] = height
            if name == "laptop":
                meta["fold_text"] = page.evaluate("""() => {
                  const out = [];
                  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                  while (walker.nextNode()) {
                    const node = walker.currentNode; const el = node.parentElement;
                    if (!el || !node.textContent.trim()) continue;
                    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
                    if (r.top < innerHeight && r.bottom > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05) out.push(node.textContent.trim());
                  }
                  return out.join(' ');
                }""")
                meta["page_text"] = page.evaluate("() => (document.querySelector('main') || document.body).innerText")
                meta["fold_words"] = len(meta["fold_text"].split())
                meta["page_words"] = len(meta["page_text"].split())
            context.close()
        browser.close()
    # The top of the full page, cut into two tall slices for the sixty-second read.
    from PIL import Image

    for name in ("phone", "laptop"):
        full = Image.open(out / ("%s-full.png" % name))
        slice_h = full.width * (2 if name == "phone" else 1.1)
        for index in range(2):
            top = int(index * slice_h)
            if top >= full.height:
                break
            full.crop((0, top, full.width, min(full.height, int(top + slice_h)))).save(out / ("%s-slice%d.png" % (name, index)))
    (out / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    print("Shots in %s: fold %s words on a laptop, %s words on the page" % (out, meta.get("fold_words"), meta.get("page_words")))


# ------------------------------------------------------------------- grading
def grade(answer):
    """Fixed rules, so the grade does not depend on another model's mood."""
    what = (answer.get("what_is_it") or "").lower()
    who = (answer.get("who_for") or "").lower()
    cost = (answer.get("cost") or "").lower()
    trial = (answer.get("trial") or "").lower()
    got_what = bool(re.search(r"learning stor|documentation|observation|stor(y|ies) (for|about) (children|child|kids)", what)) and bool(
        re.search(r"\bai\b|draft|writ|turn|generat|creat|produc|automat|quick|fast|help", what))
    got_who = bool(re.search(r"educator|teacher|kaiako|early childhood|\bece\b|childcare|child care|preschool|kindergarten|centre|center|daycare|day care", who))
    got_cost = bool(re.search(r"free|\$|nz\$|a\$|\b19\b|\b21\b", cost)) and "no idea" not in cost
    got_trial = bool(re.search(r"free|trial|demo|three stor|3 stor|try", trial)) and "no idea" not in trial
    return {"what": got_what, "who": got_who, "cost": got_cost, "trial": got_trial, "understood": got_what and got_who}


# ------------------------------------------------------------------- panel
def draw_visitor(rng):
    persona = rng.choices(PERSONAS, weights=[p["w"] for p in PERSONAS])[0]
    device = "phone" if rng.random() < persona["phone"] * PHONE_SCALE else rng.choice(["laptop", "laptop", "laptop", "wide"])
    traits = "You spend about %d hours a week on documentation. You are %s about AI tools. Your comfort with technology is %s. %s %s" % (
        rng.choice([1, 2, 3, 4, 5, 6, 8]),
        rng.choice(["enthusiastic", "curious", "neutral", "wary", "sceptical", "hostile"]),
        rng.choice(["low", "medium", "medium", "high"]),
        rng.choice(["Money is tight.", "You would pay for something that genuinely saves time.", "You never pay for software yourself.", "Your centre pays for tools if you can justify them."]),
        rng.choice(["You are tired and it is late.", "You are on a break and have a few minutes.", "You are distracted; children are nearby.", "You are focused and curious."]),
    )
    context = {
        "phone": rng.choice(["tapped a link in a Facebook group for early childhood educators", "tapped a link a colleague sent you", "found it from a Google search on your phone"]),
        "laptop": rng.choice(["clicked a link from a Facebook group", "found it searching Google for learning story help", "opened a link from a LinkedIn post"]),
        "wide": rng.choice(["found it searching Google at your desk", "clicked a link from a Facebook group on your office computer"]),
    }[device]
    device_label = {"phone": "phone", "laptop": "laptop", "wide": "large desktop monitor"}[device]
    return persona, device, device_label, traits, context


def cmd_panel(args):
    shots = Path(args.shots)
    meta = json.loads((shots / "meta.json").read_text())
    models = [m.strip() for m in args.models.split(",") if m.strip()]
    rng = random.Random(args.seed)
    visitors = [draw_visitor(rng) for _ in range(args.samples)]
    fold = {name: b64_png(shots / ("%s-fold.png" % name)) for name in VIEWPORTS}
    slices = {
        name: [b64_png(p) for p in sorted(shots.glob("%s-slice*.png" % name))]
        for name in ("phone", "laptop")
    }
    page_text = meta["page_text"][: args.text_chars]

    def one(index):
        persona, device, device_label, traits, context = visitors[index]
        model = models[index % len(models)]
        ten = ask(model, TEN_SECOND_PROMPT.format(who=persona["who"], traits=traits, device=device_label, context=context), [fold[device]])
        sixty = ask(model, SIXTY_SECOND_PROMPT.format(who=persona["who"], traits=traits, device=device_label, context=context, text=page_text),
                    slices["phone" if device == "phone" else "laptop"])
        return {"persona": persona["id"], "target": persona["id"] in TARGET, "device": device, "model": model,
                "traits": traits, "ten": ten, "sixty": sixty, "grade": grade(ten) if "error" not in ten else None}

    print("Running %d simulated visitors on %s..." % (args.samples, ", ".join(models)), file=sys.stderr)
    with futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        rows = list(pool.map(one, range(args.samples)))
    rows = [r for r in rows if r["grade"] is not None and "error" not in r["sixty"]]
    summary = summarise(rows, args.real_signup_rate)
    (shots / "panel.json").write_text(json.dumps({"summary": summary, "rows": rows}, indent=2, ensure_ascii=False))
    (shots / "panel.md").write_text(render(summary, rows, meta), encoding="utf-8")
    print(json.dumps(summary, indent=2))


def bootstrap(values, rng, n=2000):
    if not values:
        return (None, None)
    means = sorted(statistics.mean(rng.choices(values, k=len(values))) for _ in range(n))
    return (round(means[int(0.025 * n)], 3), round(means[int(0.975 * n)], 3))


def summarise(rows, real_signup_rate):
    rng = random.Random(7)
    target = [r for r in rows if r["target"]]

    def rate(items, key):
        return [1.0 if r["grade"][key] else 0.0 for r in items]

    understood = rate(target, "understood")
    stay = [0.0 if r["ten"].get("next_action") == "leave" else 1.0 for r in target]
    signup = [(0.0 if r["ten"].get("next_action") == "leave" else 1.0) * (r["sixty"].get("signup_free", 0) or 0) / 100 for r in target]
    pay = [s * ((r["sixty"].get("pay_after_trial", 0) or 0) / 100) for s, r in zip(signup, target)]

    # Monte Carlo funnel: 10,000 visitors drawn from the panel's answers.
    sims = []
    for _ in range(2000):
        sample = rng.choices(rows, k=len(rows))
        signed = 0.0
        paid = 0.0
        for r in sample:
            if not r["target"] or r["ten"].get("next_action") == "leave":
                continue
            s = (r["sixty"].get("signup_free", 0) or 0) / 100
            signed += s
            paid += s * ((r["sixty"].get("pay_after_trial", 0) or 0) / 100)
        sims.append((signed / len(sample), paid / len(sample)))
    sim_signup = statistics.mean(s for s, _ in sims)
    sim_pay = statistics.mean(p for _, p in sims)

    summary = {
        "visitors": len(rows),
        "target_visitors": len(target),
        "understood_in_10s": round(statistics.mean(understood), 3) if understood else None,
        "understood_ci95": bootstrap(understood, rng),
        "knew_what": round(statistics.mean(rate(target, "what")), 3) if target else None,
        "knew_who": round(statistics.mean(rate(target, "who")), 3) if target else None,
        "knew_cost": round(statistics.mean(rate(target, "cost")), 3) if target else None,
        "knew_trial": round(statistics.mean(rate(target, "trial")), 3) if target else None,
        "stay_rate": round(statistics.mean(stay), 3) if stay else None,
        "clarity": round(statistics.mean(r["ten"].get("clarity", 0) for r in target), 2) if target else None,
        "trust": round(statistics.mean(r["ten"].get("trust", 0) for r in target), 2) if target else None,
        "interest": round(statistics.mean(r["ten"].get("interest", 0) for r in target), 2) if target else None,
        "simulated_signup_per_visitor": round(sim_signup, 4),
        "simulated_paying_per_visitor": round(sim_pay, 4),
        "signup_ci95": (round(sorted(s for s, _ in sims)[50], 4), round(sorted(s for s, _ in sims)[1949], 4)),
        "next_actions": count(r["ten"].get("next_action") for r in target),
        "price_feels": count(r["sixty"].get("price_feels") for r in target),
    }
    if real_signup_rate:
        summary["calibration_factor"] = round(real_signup_rate / sim_signup, 4) if sim_signup else None
    by_device = {}
    for device in VIEWPORTS:
        subset = [r for r in target if r["device"] == device]
        if subset:
            by_device[device] = {"n": len(subset), "understood": round(statistics.mean(rate(subset, "understood")), 3)}
    summary["by_device"] = by_device
    by_persona = {}
    for persona in PERSONAS:
        subset = [r for r in rows if r["persona"] == persona["id"]]
        if subset:
            by_persona[persona["id"]] = {
                "n": len(subset),
                "understood": round(statistics.mean(rate(subset, "understood")), 2),
                "signup": round(statistics.mean((r["sixty"].get("signup_free", 0) or 0) for r in subset), 1),
                "pay": round(statistics.mean((r["sixty"].get("pay_after_trial", 0) or 0) for r in subset), 1),
            }
    summary["by_persona"] = by_persona
    return summary


def count(values):
    out = {}
    for value in values:
        key = str(value or "none").lower()
        out[key] = out.get(key, 0) + 1
    return dict(sorted(out.items(), key=lambda kv: -kv[1]))


def render(summary, rows, meta):
    lines = ["# Landing page panel", "", "Page: %s (taken %s). First screen on a laptop: %s words." % (meta["url"], meta["taken"], meta.get("fold_words")), ""]
    lines += ["```", json.dumps(summary, indent=2, ensure_ascii=False), "```", ""]
    lines += ["## What confused people in the first ten seconds", ""]
    for r in rows:
        if r["target"] and (r["ten"].get("confusing") or "nothing").lower() not in ("nothing", "none"):
            lines.append("- (%s, %s) %s" % (r["persona"], r["device"], r["ten"].get("confusing")))
    lines += ["", "## Biggest objections after a minute", ""]
    for r in rows:
        if r["target"]:
            lines.append("- (%s) %s" % (r["persona"], r["sixty"].get("biggest_objection")))
    lines += ["", "## What would make them buy", ""]
    for r in rows:
        if r["target"]:
            lines.append("- (%s) %s" % (r["persona"], r["sixty"].get("would_make_me_buy")))
    lines += ["", "## Misunderstood in ten seconds", ""]
    for r in rows:
        if r["target"] and not r["grade"]["understood"]:
            lines.append("- (%s, %s) thought: %s / for: %s" % (r["persona"], r["device"], r["ten"].get("what_is_it"), r["ten"].get("who_for")))
    lines += ["", "## Verdicts", ""]
    for r in rows:
        lines.append("- (%s) %s" % (r["persona"], r["sixty"].get("one_line_verdict")))
    return "\n".join(lines)


def cmd_compare(args):
    base = json.loads((Path(args.baseline) / "panel.json").read_text())["summary"]
    cand = json.loads((Path(args.candidate) / "panel.json").read_text())["summary"]
    keys = ["understood_in_10s", "knew_what", "knew_who", "knew_cost", "knew_trial", "stay_rate", "clarity", "trust",
            "interest", "simulated_signup_per_visitor", "simulated_paying_per_visitor"]
    print("%-32s %10s %10s %8s" % ("measure", "baseline", "candidate", "change"))
    for key in keys:
        b, c = base.get(key), cand.get(key)
        change = ("%+.0f%%" % (100 * (c - b) / b)) if isinstance(b, (int, float)) and b else ""
        print("%-32s %10s %10s %8s" % (key, b, c, change))
    factor = base.get("calibration_factor")
    if factor:
        for key in ("simulated_signup_per_visitor", "simulated_paying_per_visitor"):
            print("calibrated %-21s %10.4f %10.4f" % (key.replace("simulated_", ""), base[key] * factor, cand[key] * factor))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", default=None)
    sub = parser.add_subparsers(dest="command", required=True)
    shoot = sub.add_parser("shoot")
    shoot.add_argument("--url", required=True)
    shoot.add_argument("--out", required=True)
    panel = sub.add_parser("panel")
    panel.add_argument("--shots", required=True)
    panel.add_argument("--samples", type=int, default=120)
    panel.add_argument("--models", default="gpt-5.4")
    panel.add_argument("--seed", type=int, default=2026)
    panel.add_argument("--concurrency", type=int, default=8)
    panel.add_argument("--text-chars", type=int, default=12000)
    panel.add_argument("--real-signup-rate", type=float, default=None)
    compare = sub.add_parser("compare")
    compare.add_argument("--baseline", required=True)
    compare.add_argument("--candidate", required=True)
    args = parser.parse_args()
    load_env(args.env_file)
    {"shoot": cmd_shoot, "panel": cmd_panel, "compare": cmd_compare}[args.command](args)


if __name__ == "__main__":
    main()
