import {
  childQuotePreserved,
  getMetaCommentaryIssues,
  getToneTells,
  getUnsupportedStoryDetails,
  type FrameworkGuardStoryResult,
} from "@/lib/ai/quality-guards";
import { runPrivacyGuardian } from "@/lib/privacy-guardian";
import { extractOtherChildNames, inferPrimaryChildName } from "@/lib/story-context";
import { CHECK_NOTE_MAX, CHECK_NOTE_MIN, CHECK_STORY_MAX, CHECK_STORY_MIN } from "@/lib/check-my-story-limits";

/**
 * Check my story (19 Nov 2026): what a leader looks for in a learning story,
 * worked out in plain words from the story and the note it came from.
 *
 * Deterministic. No model is called, nothing is stored, and the same story and
 * note always give the same answer. Every judgement about the writing comes
 * from the guards the story writer already uses (lib/ai/quality-guards.ts and
 * lib/privacy-guardian.ts, imported, never changed). The one thing those guards
 * do not cover, whether each curriculum link has something in the note behind
 * it, is a plain word list below, and it says "worth a look", never "wrong".
 *
 * Four questions, in the order a leader asks them:
 *  1. Are the child's own words kept?         childQuotePreserved
 *  2. Is every curriculum link backed by the note?   CUES below
 *  3. First names only, nothing private?       privacy guardian + a full-name look
 *  4. Does anything read as made up?           getUnsupportedStoryDetails,
 *                                              getMetaCommentaryIssues, getToneTells
 *
 * Used in three places with the same result: a leader's team review queue,
 * an educator's own story before she sends it to her leader, and the public
 * page /check-my-story. Safe to import in the browser.
 */

export type CheckItemId = "child_words" | "links" | "names" | "invented";
/** ok: nothing to query. look: worth a second look. none: nothing to check (no quote marks in the note). */
export type CheckItemStatus = "ok" | "look" | "none";

export type StoryCheckItem = {
  id: CheckItemId;
  status: CheckItemStatus;
  /** The leader's question, short. */
  title: string;
  /** What was found, in plain words. */
  detail: string;
};

export type StoryCheckResult = {
  items: StoryCheckItem[];
  /** How many items are worth a look. */
  looks: number;
  /** One line: "Nothing to query." / "1 thing worth a look." */
  summary: string;
};

export type StoryCheckInput = {
  /** The finished story, as the family or the leader reads it. */
  story: string;
  /** The educator's note it was written from. */
  note: string | null | undefined;
  /** Saved stories: the outcome labels kept with the story ("Mana reo | Communication"). */
  outcomes?: readonly string[] | null;
  /** Saved stories: the curriculum link sentences kept with the story. */
  curriculumLinks?: readonly string[] | null;
  /** The child's first name, when the story was saved with one. */
  childName?: string | null;
};

export { CHECK_NOTE_MAX, CHECK_NOTE_MIN, CHECK_STORY_MAX, CHECK_STORY_MIN } from "@/lib/check-my-story-limits";

// ------------------------------------------------------- curriculum links

type Domain = "wellbeing" | "belonging" | "contribution" | "communication" | "exploration";

/**
 * Words in a note that point to each part of the curriculum. A stem ending in
 * "*" matches any word that starts with it; a phrase with a space matches as
 * written. Broad on purpose: a link is only queried when NOTHING in the note
 * points its way, which is exactly the link a leader would ask about.
 * StoryLoop's own list, drawn from the plain "what it looks like" examples on
 * the EYLF and Te Whāriki pages (lib/eylf-outcomes.ts, lib/te-whariki-strands.ts).
 */
const CUES: Record<Domain, readonly string[]> = {
  wellbeing: [
    "feel*", "felt", "happy", "sad", "upset*", "cry*", "cried", "calm*", "comfort*", "cuddl*", "rest*", "sleep*", "slept",
    "tired", "hungry", "eat*", "ate", "kai", "food", "lunch", "snack*", "drink*", "wash*", "toilet*", "nappy", "nappies",
    "climb*", "balanc*", "run", "runs", "running", "ran", "jump*", "swing*", "slide*", "slid", "safe*", "hurt*", "careful*",
    "breath*", "settl*", "smil*", "laugh*", "proud", "brave*", "worr*", "scared", "nervous*", "frustrat*", "angry", "danc*",
    "crawl*", "stretch*", "carr*", "lift*", "scissors", "spoon*", "fork*", "shoe*", "jacket*", "hat", "hats", "sunscreen",
    "dress*", "undress*", "bike*", "scooter*", "ball*", "kick*", "throw*", "threw", "catch*", "caught", "hop*", "tumbl*",
    "fell", "fall*", "bump*", "pull*", "push*", "strong*", "body", "hands", "hand", "held", "hold*", "frame",
  ],
  belonging: [
    "family", "families", "mum*", "mom*", "dad*", "mother*", "father*", "nana*", "koro", "kui*", "grand*", "granny",
    "aunt*", "uncle*", "cousin*", "sibling*", "brother*", "sister*", "baby", "babies", "home", "house", "whānau", "whanau",
    "cultur*", "language*", "routine*", "arriv*", "goodbye", "bye", "drop off", "pick up", "settl*", "place", "belong*",
    "mat time", "mat", "morning tea", "kai time", "karakia", "waiata", "marae", "pepeha", "country", "welcom*", "first day",
    "transition*", "choose", "chose", "choice*", "decid*", "independ*", "by herself", "by himself", "by themselves",
    "on her own", "on his own", "me do it", "confiden*", "proud", "own", "name", "names", "teacher*", "kaiako", "educator*",
    "tradition*", "celebrat*", "festival*", "birthday*",
  ],
  contribution: [
    "friend*", "together", "shar*", "turn*", "help*", "other", "others", "group*", "includ*", "invit*", "join*", "fair*",
    "wait*", "gave", "give*", "giving", "offer*", "kind*", "care*", "caring", "team*", "younger", "older", "peer*", "buddy",
    "tuakana", "teina", "everyone", "each other", "both", "garden*", "plant*", "compost*", "recycl*", "litter", "rubbish",
    "environment*", "animal*", "pet*", "insect*", "bug*", "worm*", "snail*", "community", "visit*", "library", "shop*",
    "pack away", "packed away", "tidy*", "tidied", "clean*", "set up", "jobs", "job", "rules", "rule", "role*", "pretend*",
    "with her", "with him", "with them", "in charge", "let him", "let her", "let them", "anyone", "everybody",
  ],
  communication: [
    "said", "say*", "told", "tell*", "ask*", "question*", "answer*", "word*", "talk*", "chat*", "sang", "sing*", "song*",
    "waiata", "story", "stories", "book*", "read*", "drew", "draw*", "paint*", "mark*", "wrote", "writ*", "letter*", "sign*",
    "gestur*", "point*", "nod*", "babbl*", "call*", "shout*", "whisper*", "explain*", "describ*", "repl*", "respond*",
    "listen*", "rhym*", "pretend*", "role*", "photo*", "camera", "ipad", "tablet", "voice", "sound*", "noise*", "kōrero",
    "korero", "reo", "language*", "name*", "count*", "music*", "danc*", "look", "showed", "show*",
  ],
  exploration: [
    "try", "tried", "tries", "trying", "test*", "explor*", "investigat*", "experiment*", "wonder*", "why", "how", "what if",
    "build*", "built", "construct*", "tower*", "block*", "ramp*", "pour*", "fill*", "empt*", "tip*", "mix*", "dig*", "dug",
    "sand", "water", "mud*", "puzzle*", "problem*", "solv*", "figur*", "again", "repeat*", "persist*", "kept", "keep*",
    "compar*", "measur*", "count*", "sort*", "pattern*", "float*", "sink*", "sank", "magnif*", "notic*", "discover*",
    "found", "find*", "collect*", "examin*", "predict*", "theor*", "idea*", "plan*", "design*", "made", "make*", "creat*",
    "invent*", "paint*", "draw*", "drew", "colour*", "color*", "shape*", "bigger", "smaller", "faster", "slower", "fast",
    "slow*", "high*", "tall*", "heav*", "light*", "leaf", "leaves", "stick*", "stone*", "rock*", "shell*", "seed*",
    "guttering", "bucket*", "jug*", "cup*", "funnel*", "tube*", "car", "cars", "wheel*", "magnet*", "torch*", "shadow*",
    "mirror*", "clay", "playdough", "dough", "lego", "duplo", "third time", "times", "watch*",
  ],
};

type LinkDef = { domains: Domain[]; label: string; pattern: RegExp; needsContext?: boolean };

/**
 * How a curriculum link is recognised in a story's text or saved outcomes,
 * and which part of the note should back it. Te Whāriki strands, EYLF V2.0
 * outcomes, EYFS areas and Aistear themes, the four frameworks StoryLoop writes to.
 */
const LINKS: LinkDef[] = [
  // Te Whāriki: the Māori names are specific enough to count anywhere. The
  // bare English names (also Aistear's "Well-being") count only on a line that
  // is about curriculum links and names nothing more specific (below).
  { domains: ["wellbeing"], label: "Mana atua | Wellbeing", pattern: /\bMana atua\b/i },
  { domains: ["belonging"], label: "Mana whenua | Belonging", pattern: /\bMana whenua\b/i },
  { domains: ["contribution"], label: "Mana tangata | Contribution", pattern: /\bMana tangata\b/i },
  { domains: ["communication"], label: "Mana reo | Communication", pattern: /\bMana reo\b/i },
  { domains: ["exploration"], label: "Mana aotūroa | Exploration", pattern: /\bMana aot[uū]roa\b/i },
  { domains: ["wellbeing"], label: "Wellbeing", pattern: /\bWell-?being\b/i, needsContext: true },
  { domains: ["belonging"], label: "Belonging", pattern: /\bBelonging\b/i, needsContext: true },
  { domains: ["contribution"], label: "Contribution", pattern: /\bContribution\b/i, needsContext: true },
  { domains: ["communication"], label: "Communication", pattern: /\bCommunication\b/i, needsContext: true },
  { domains: ["exploration"], label: "Exploration", pattern: /\bExploration\b/i, needsContext: true },
  // EYLF V2.0: "Outcome 1" with or without "EYLF", or the outcome's own words.
  { domains: ["belonging"], label: "EYLF Outcome 1", pattern: /\bOutcome\s*1\b|strong sense of identity/i },
  { domains: ["contribution"], label: "EYLF Outcome 2", pattern: /\bOutcome\s*2\b|connected with and contribute to their world/i },
  { domains: ["wellbeing"], label: "EYLF Outcome 3", pattern: /\bOutcome\s*3\b|strong sense of wellbeing/i },
  { domains: ["exploration"], label: "EYLF Outcome 4", pattern: /\bOutcome\s*4\b|confident and involved learners/i },
  { domains: ["communication"], label: "EYLF Outcome 5", pattern: /\bOutcome\s*5\b|effective communicators/i },
  // EYFS (England) areas of learning.
  { domains: ["communication"], label: "Communication and Language", pattern: /\bCommunication and Language\b/i },
  { domains: ["wellbeing"], label: "Physical Development", pattern: /\bPhysical Development\b/i },
  { domains: ["wellbeing", "contribution", "belonging"], label: "Personal, Social and Emotional Development", pattern: /\bPersonal,? Social and Emotional\b/i },
  { domains: ["communication"], label: "Literacy", pattern: /\bLiteracy\b/i, needsContext: true },
  { domains: ["exploration"], label: "Mathematics", pattern: /\bMathematics\b/i, needsContext: true },
  { domains: ["exploration", "contribution"], label: "Understanding the World", pattern: /\bUnderstanding the World\b/i },
  { domains: ["exploration", "communication"], label: "Expressive Arts and Design", pattern: /\bExpressive Arts and Design\b/i },
  // Aistear (Ireland) themes.
  { domains: ["belonging"], label: "Identity and Belonging", pattern: /\bIdentity and Belonging\b/i },
  { domains: ["exploration"], label: "Exploring and Thinking", pattern: /\bExploring and Thinking\b/i },
  { domains: ["communication"], label: "Communicating", pattern: /\bCommunicating\b/i, needsContext: true },
];

/** A line that is about curriculum links, where a bare strand name ("Exploration") counts. */
const LINK_CONTEXT = /\|\s*\S|\blinks?\b|\bstrand\b|\bTe Wh[aā]riki\b|\bcurriculum\b|\bEYFS\b|\bAistear\b|\barea of learning\b|\btheme\b|^\s*[-•*]\s*\S/i;

function normaliseWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[“”"‘’'`]/g, " ")
    .replace(/[^a-z0-9āēīōū\s-]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The cues in a note for one part of the curriculum. Pure. */
function noteHasCue(noteWords: string[], noteText: string, domain: Domain) {
  for (const cue of CUES[domain]) {
    if (cue.includes(" ")) {
      if (` ${noteText} `.includes(` ${cue} `)) return true;
    } else if (cue.endsWith("*")) {
      const stem = cue.slice(0, -1);
      if (noteWords.some((word) => word.startsWith(stem))) return true;
    } else if (noteWords.includes(cue)) {
      return true;
    }
  }
  return false;
}

/** The curriculum links a story makes, by canonical label, from its saved outcomes, its link sentences and its text. Pure. */
export function findCurriculumLinks(input: Pick<StoryCheckInput, "story" | "outcomes" | "curriculumLinks">): Array<{ label: string; domains: Domain[] }> {
  const lines = [
    ...(input.outcomes ?? []),
    ...(input.curriculumLinks ?? []),
    ...input.story.split(/\n+/),
  ].map((line) => line.trim()).filter(Boolean);
  const found = new Map<string, Domain[]>();
  const outcomes = new Set((input.outcomes ?? []).map((line) => line.trim()));
  for (const line of lines) {
    // A line that names a strand, an outcome or an area outright is read for
    // those alone: "This links with EYLF Outcome 3 because ... wellbeing" is
    // Outcome 3, not a second, bare "Wellbeing" link.
    const specific = LINKS.filter((def) => !def.needsContext && def.pattern.test(line));
    const general = specific.length
      ? []
      : LINKS.filter((def) => def.needsContext && def.pattern.test(line) && (outcomes.has(line) || LINK_CONTEXT.test(line)));
    for (const def of [...specific, ...general]) {
      if (!found.has(def.label)) found.set(def.label, def.domains);
    }
  }
  return [...found.entries()].map(([label, domains]) => ({ label, domains }));
}

// ------------------------------------------------------------- names

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;

/**
 * A phone number: eight or more digits in at most four groups ("021 555 0123",
 * "+64 21 555 0123", "0412-555-012"). Counting in a story ("1, 2, 3 ... 8"),
 * a year or a time is not one. Pure.
 */
export function hasPhoneNumber(text: string): boolean {
  for (const match of text.matchAll(/\+?\d[\d ().-]{6,}\d/g)) {
    const run = match[0];
    const digits = run.replace(/\D/g, "").length;
    const groups = run.trim().split(/[\s().-]+/).filter(Boolean);
    if (digits >= 8 && digits <= 15 && groups.length <= 4 && groups.every((group) => group.replace(/\D/g, "").length >= 2)) return true;
  }
  return false;
}
/** Words that may follow a first name with a capital and are not a surname. */
const NOT_A_SURNAME = new Set([
  "and", "or", "the", "a", "an", "is", "was", "said", "says", "asked", "told", "then", "also", "too", "as", "at", "in", "on",
  "with", "to", "for", "from", "of", "by", "i", "we", "you", "mana", "eylf", "outcome", "learning", "story", "today",
  "this", "that", "when", "while", "after", "before", "because", "so", "but", "if", "it", "he", "she", "they", "her", "his",
  "their", "our", "my", "your", "kia", "ora", "ka", "pai", "mum", "dad", "nana", "koro", "kaiako", "whānau", "whanau",
  // How children name their teachers: "Whaea Sue" is a teacher's first name, not a surname.
  "whaea", "matua", "aunty", "auntie", "uncle", "kui", "mrs", "mr", "miss", "ms", "teacher",
]);

function isHeadingLine(line: string) {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 10) return false;
  if (/[.!?]["”']?\s*$/.test(line.trim())) return false;
  const capitalised = words.filter((word) => /^[A-ZĀĒĪŌŪ]/.test(word)).length;
  return capitalised / words.length >= 0.6;
}

/** Full names in the story: a child's first name followed straight away by another name. Pure. */
export function findFullNames(story: string, note: string, childName?: string | null): string[] {
  const names = new Set<string>();
  const add = (value: string | null | undefined) => {
    const first = (value ?? "").trim().split(/\s+/)[0] ?? "";
    if (/^[A-ZĀĒĪŌŪ][a-zāēīōū'-]{1,}$/.test(first) && first !== "Te" && !NOT_A_SURNAME.has(first.toLowerCase())) names.add(first);
  };
  add(childName);
  add(inferPrimaryChildName(note));
  for (const name of extractOtherChildNames(note, undefined, 12)) add(name);
  for (const name of extractOtherChildNames(story, undefined, 12)) add(name);
  const found = new Set<string>();
  for (const line of story.split(/\n+/)) {
    if (isHeadingLine(line)) continue;
    for (const name of names) {
      const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+([A-ZĀĒĪŌŪ][a-zāēīōū'’-]+)(\\s+\\S+)?`, "g");
      for (const match of line.matchAll(pattern)) {
        const next = (match[1] ?? "").replace(/['’]s$/, "");
        // "Mia Te Whāriki" is a story that names the curriculum, not a surname.
        if (!next || NOT_A_SURNAME.has(next.toLowerCase()) || /^Te\s+(Wh[aā]riki|Reo)\b/i.test(`${next}${match[2] ?? ""}`)) continue;
        // A following word with a capital too ("Te Rangi") is part of the surname.
        const more = /^\s+([A-ZĀĒĪŌŪ][a-zāēīōū'’-]+)/.exec(match[2] ?? "")?.[1]?.replace(/['’]s$/, "");
        found.add(next === "Te" && more ? `${name} ${next} ${more}` : `${name} ${next}`);
      }
    }
  }
  // "Te Rangi" inside "Mia Te Rangi" is the same name, said once.
  const all = [...found];
  return all.filter((entry) => !all.some((other) => other !== entry && other.endsWith(` ${entry}`))).slice(0, 3);
}

// ---------------------------------------------------------------- quotes

/** Words in double quote marks in the note, two words or more: what the child said. Pure. */
function noteQuotes(note: string) {
  return [...note.matchAll(/["“”]([^"“”]{2,160})["“”]/g)]
    .map((match) => (match[1] ?? "").trim())
    .filter((quote) => quote.split(/\s+/).filter(Boolean).length >= 2);
}

function guardResult(story: string): FrameworkGuardStoryResult {
  return {
    story,
    outcomes: [],
    curriculumLinks: [],
    learningSummary: "",
    childVoice: "",
    learningDispositions: [],
    socialEmotionalLinks: [],
    culturalConnections: [],
    whanauConnection: "",
    assumptions: [],
    evidenceAnchors: [],
    educatorChecks: [],
    pedagogyLinks: [],
    frameworkEvidence: [],
    familyQuestion: "",
    followUpPrompt: "",
    nextSteps: [],
    wordCount: 0,
  };
}

/** Tone tells a leader would query as made up. "Academic verb" and "filler" are left to the writer's own grading. */
const QUERY_TONE = /^(gushing language|inflated adjective|stock phrase|brochure language|vague significance|policy-speak):/;

const quoteList = (items: string[]) => items.map((item) => `"${item}"`).join(", ");
const listWords = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

// ----------------------------------------------------------------- check

/** The check. Pure and deterministic: the same story and note always give the same result. */
export function checkMyStory(input: StoryCheckInput): StoryCheckResult {
  const story = (input.story ?? "").replace(/\r\n?/g, "\n");
  const note = (input.note ?? "").replace(/\r\n?/g, "\n");
  const items: StoryCheckItem[] = [];
  // A saved story with no note (an older one, or one pasted in): nothing to compare against.
  const noNote = note.trim().length === 0;
  const NO_NOTE = "No note was saved with this story, so there is nothing to compare it with.";

  // 1. The child's own words.
  const kept = noNote ? null : childQuotePreserved(story, note);
  if (kept === null) {
    items.push({ id: "child_words", status: "none", title: "The child's own words", detail: noNote ? NO_NOTE : "The note has no words in quote marks, so there is nothing to keep." });
  } else if (kept) {
    items.push({ id: "child_words", status: "ok", title: "The child's own words", detail: "Kept as the note has them." });
  } else {
    const lost = noteQuotes(note).filter((quote) => childQuotePreserved(story, `"${quote}"`) === false).slice(0, 2);
    items.push({
      id: "child_words",
      status: "look",
      title: "The child's own words",
      detail: lost.length
        ? `The note has ${quoteList(lost)}, and the story does not keep ${lost.length === 1 ? "it" : "them"} word for word. A leader looks for the child's exact words.`
        : "The note has the child's words in quote marks, and the story does not keep them word for word. A leader looks for the child's exact words.",
    });
  }

  // 2. Curriculum links backed by the note.
  const links = findCurriculumLinks({ story, outcomes: input.outcomes, curriculumLinks: input.curriculumLinks });
  const noteText = normaliseWords(note);
  const noteWords = noteText.split(" ").filter(Boolean);
  const noteHasQuote = noteQuotes(note).length > 0;
  if (links.length === 0) {
    items.push({ id: "links", status: "look", title: "Curriculum links", detail: "No curriculum link found. A leader looks for at least one, tied to what the child did." });
  } else if (noNote) {
    items.push({ id: "links", status: "none", title: "Curriculum links", detail: NO_NOTE });
  } else {
    // Words in quote marks are communication; a second child named in the note is play with others.
    const primary = input.childName?.trim().split(/\s+/)[0] || inferPrimaryChildName(note);
    const noteNamesAnother = extractOtherChildNames(note, primary, 1).length > 0;
    const unbacked = links.filter(
      (link) =>
        !link.domains.some(
          (domain) =>
            noteHasCue(noteWords, noteText, domain) ||
            (domain === "communication" && noteHasQuote) ||
            (domain === "contribution" && noteNamesAnother),
        ),
    );
    items.push(
      unbacked.length === 0
        ? { id: "links", status: "ok", title: "Curriculum links", detail: `${links.length === 1 ? "The link has" : `All ${links.length} links have`} something in the note behind ${links.length === 1 ? "it" : "them"}.` }
        : {
            id: "links",
            status: "look",
            title: "Curriculum links",
            detail: `Nothing in the note points to ${listWords(unbacked.map((link) => link.label))}. Check the link, or add what you saw to the note.`,
          },
    );
  }

  // 3. First names only, nothing private.
  const problems: string[] = [];
  const fullNames = findFullNames(story, note, input.childName);
  if (fullNames.length) problems.push(`Looks like a full name: ${listWords(fullNames)}.`);
  if (EMAIL.test(story) || hasPhoneNumber(story)) problems.push("An email address or phone number is in the story.");
  const privacy = runPrivacyGuardian({ story });
  const high = privacy.issues.filter((issue) => issue.severity === "high").map((issue) => issue.label.toLowerCase());
  if (high.length) problems.push(`Something a leader would take out before families see it: ${listWords(high)}.`);
  items.push(
    problems.length
      ? { id: "names", status: "look", title: "First names only, nothing private", detail: problems.join(" ") }
      : { id: "names", status: "ok", title: "First names only, nothing private", detail: "No full names, contact details or private family or health details." },
  );

  // 4. Anything that reads as made up.
  const invented: string[] = [];
  const unsupported = note.trim()
    ? getUnsupportedStoryDetails(guardResult(story), note)
        .map((issue) => /"(.+)"$/.exec(issue)?.[1] ?? "")
        .filter(Boolean)
        .slice(0, 2)
    : [];
  if (unsupported.length) invented.push(`In quote marks but not in the note: ${quoteList(unsupported)}. A leader will ask where ${unsupported.length === 1 ? "it" : "they"} came from.`);
  const meta = getMetaCommentaryIssues(story)
    .map((issue) => /:\s*"([^"]+)"\./.exec(issue)?.[1] ?? "")
    .filter(Boolean)
    .slice(0, 1);
  if (meta.length) invented.push(`It talks about the note instead of the child (${quoteList(meta)}).`);
  const tone = getToneTells(story).filter((tell) => QUERY_TONE.test(tell)).map((tell) => /"(.+)"$/.exec(tell)?.[1] ?? "").filter(Boolean).slice(0, 3);
  if (tone.length) invented.push(`Words a leader may query as stock phrases: ${quoteList(tone)}.`);
  items.push(
    invented.length
      ? { id: "invented", status: "look", title: "Nothing made up", detail: invented.join(" ") }
      : {
          id: "invented",
          status: "ok",
          title: "Nothing made up",
          detail: noNote ? "No stock phrases. With no note saved, quoted words cannot be compared." : "No quoted words beyond the note, and no stock phrases.",
        },
  );

  const looks = items.filter((item) => item.status === "look").length;
  return { items, looks, summary: looks === 0 ? "Nothing to query." : `${looks} ${looks === 1 ? "thing" : "things"} worth a look.` };
}

/** Why a pasted story and note cannot be checked, or null when they can. Pure. */
export function checkInputProblem(story: unknown, note: unknown): string | null {
  if (typeof story !== "string" || story.trim().length < CHECK_STORY_MIN) return "Paste the whole learning story first.";
  if (typeof note !== "string" || note.trim().length < CHECK_NOTE_MIN) return "Paste the note it was written from too. The check compares the two.";
  if (story.length > CHECK_STORY_MAX) return "That story is very long. Paste one learning story at a time.";
  if (note.length > CHECK_NOTE_MAX) return "That note is very long. Paste the note for this one story.";
  return null;
}
