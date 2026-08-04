const BLOCKED_NAME_WORDS = new Set([
  // Framework / app / structural words
  "Aotearoa",
  "Australia",
  "Educator",
  "EYLF",
  "Family",
  "Learning",
  "Mana",
  "Story",
  "StoryLoop",
  "Whanau",
  "Whāriki",
  // Pronouns (the common false positives)
  "He",
  "She",
  "It",
  "They",
  "We",
  "You",
  "I",
  "His",
  "Her",
  "Hers",
  "Him",
  "Them",
  "Their",
  "Theirs",
  "Our",
  "Ours",
  "My",
  "Mine",
  "Your",
  "Yours",
  "Its",
  "Me",
  "Us",
  // Articles / conjunctions / prepositions
  "A",
  "An",
  "As",
  "At",
  "By",
  "For",
  "From",
  "In",
  "Into",
  "Of",
  "On",
  "Or",
  "Nor",
  "So",
  "To",
  "With",
  "And",
  "But",
  "The",
  // Demonstratives / location
  "This",
  "That",
  "These",
  "Those",
  "There",
  "Here",
  "Inside",
  "Outside",
  // Time / sequence words that often start a sentence
  "Today",
  "Yesterday",
  "Tomorrow",
  "Now",
  "Then",
  "Next",
  "First",
  "Last",
  "Once",
  "While",
  "When",
  "During",
  "Later",
  "After",
  "Before",
  "Soon",
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
  "Meanwhile",
  "Eventually",
  "Finally",
  "Suddenly",
  "Afterwards",
  "Afterward",
  // Quantifiers / common sentence starters
  "Both",
  "Each",
  "Every",
  "Some",
  "All",
  "Also",
  "Even",
  "Just",
  "Still",
  "Together",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Another",
  "Other",
  // Days
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  // Generic child descriptors (not names)
  "Baby",
  "Babies",
  "Bub",
  "Child",
  "Children",
  "Toddler",
  "Toddlers",
  "Infant",
  "Infants",
  "Kid",
  "Kids",
  "Boy",
  "Boys",
  "Girl",
  "Girls",
]);

function cleanNameCandidate(value: string) {
  // Keep internal spaces so two-word names survive ("Te Ao", "Anna Maria").
  const cleaned = value.trim().replace(/[^A-Za-z'\- ]/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length < 2 || BLOCKED_NAME_WORDS.has(cleaned)) return "";
  return cleaned;
}

// True when this occurrence sits at the start of a sentence (or the text),
// where capitalised words are usually not names ("It fell", "She asked").
function isSentenceStart(text: string, index: number) {
  const before = text.slice(0, index).replace(/\s+$/, "");
  return before === "" || /[.!?]["')\]]?$/.test(before);
}


/**
 * Words that can open an observation but are never the child's name. Educators
 * type notes in a hurry and in lower case ("bob played with his socks"), so
 * without a lower-case pass every one of those stories said "the child"
 * instead of the child's name, which is the single most noticeable thing a
 * family reads.
 */
// A name is not merely an unfamiliar word: it is an unfamiliar word sitting in
// subject position. Requiring a verb (or an age) to follow is what separates
// "jonah joined in" from "the child stacked cups", where "stacked" is also
// absent from any word list but is plainly not a name.
const FOLLOWING_VERBS = new Set([
  "was","were","is","are","had","has","have","did","does","went","goes","got","gets",
  "said","says","saw","sees","made","makes","took","takes","put","puts","kept","keeps",
  "played","plays","playing","stayed","stays","joined","joins","sat","sits","stood","stands",
  "walked","walks","ran","runs","looked","looks","watched","watches","noticed","notices",
  "started","starts","stopped","stops","tried","tries","turned","turns","asked","asks",
  "helped","helps","wanted","wants","needed","needs","liked","likes","used","uses","held",
  "holds","gave","gives","found","finds","showed","shows","told","tells","knew","knows",
  "thought","thinks","built","builds","filled","fills","poured","pours","moved","moves",
  "picked","picks","carried","carries","opened","opens","closed","closes","cried","cries",
  "laughed","laughs","smiled","smiles","pointed","points","reached","reaches","bit","bites",
  "pushed","pushes","pulled","pulls","hit","hits","kicked","kicks","stacked","stacks",
  "knocked","knocks","climbed","climbs","jumped","jumps","danced","dances","sang","sings",
  "painted","paints","drew","draws","cut","cuts","sorted","sorts","counted","counts",
  "chose","chooses","came","comes","left","leaves","arrived","arrives","enjoyed","enjoys",
  "loved","loves","managed","manages","decided","decides","returned","returns","waited","waits",
]);

// Adverbs an educator drops between the name and the verb.
const INTERVENING_ADVERBS = new Set([
  "actually","just","really","then","also","again","still","always","usually","often",
  "quickly","slowly","carefully","happily","confidently","independently","today","later",
  "immediately","suddenly","finally","first","next","soon","already",
]);

const COMMON_WORDS = new Set([
  // articles, pronouns, determiners, conjunctions, prepositions
  "the","a","an","this","that","these","those","his","her","their","its","our","my","your",
  "he","she","it","they","we","i","you","him","them","us","who","which","what","when","where",
  "and","but","or","so","then","if","because","as","with","without","for","from","to","of","at",
  "in","on","into","onto","over","under","up","down","out","off","by","about","after","before",
  "while","during","again","also","just","now","later","today","yesterday","tomorrow","very",
  "not","no","yes","all","some","any","each","both","other","another","more","most","less",
  // generic child / people words
  "child","children","kid","kids","baby","babies","toddler","toddlers","boy","girl","boys","girls",
  "group","everyone","someone","friend","friends","peer","peers","teacher","teachers","educator",
  "educators","staff","mum","mom","dad","parent","parents","family","families","nana","koro",
  "tamariki","tamaiti","mokopuna","whanau","kaiako","kaimahi",
  // time / place / routine vocabulary
  "morning","afternoon","evening","day","time","week","lunch","snack","kai","mat","sleep","nap",
  "outside","inside","outdoors","indoors","playground","sandpit","room","centre","center","yard",
  "garden","table","floor","corner","area","space","home","door","window","gate","fence",
  "hui","waiata","karakia","mara",
  // very common verbs (past and present)
  "was","were","is","are","am","be","been","being","had","has","have","did","does","do","doing",
  "went","go","goes","going","came","come","got","get","gets","getting","said","say","says",
  "saw","see","sees","seeing","made","make","makes","took","take","takes","put","puts","kept",
  "keep","keeps","played","play","plays","playing","stayed","stay","stays","joined","join","joins",
  "sat","sit","sits","stood","stand","stands","walked","walk","walks","ran","run","runs","looked",
  "look","looks","watched","watch","watches","noticed","notice","notices","observed","started",
  "start","starts","stopped","stop","stops","tried","try","tries","turned","turn","turns","asked",
  "ask","asks","helped","help","helps","wanted","want","wants","needed","need","needs","liked",
  "like","likes","used","use","uses","held","hold","holds","gave","give","gives","found","find",
  "showed","show","shows","told","tell","tells","knew","know","knows","thought","think","thinks",
  "built","build","builds","filled","fill","fills","poured","pour","pours","moved","move","moves",
  "picked","pick","picks","carried","carry","opened","open","closed","close","cried","cry","cries",
  "laughed","laugh","smiled","smile","pointed","point","points","reached","reach","actually",
  // common note nouns
  "story","stories","note","notes","observation","obs","learning","date","song","songs","book",
  "books","blocks","block","cup","cups","water","sand","paint","ball","toy","toys","puzzle",
  "puzzles","truck","trucks","car","cars","bucket","spade","swing","slide","picture","pictures",
  "actions","action","words","word","hands","hand","body","feet","legs","face","eyes",
]);


function titleCaseName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * Last resort for an all-lower-case note: educators overwhelmingly open with
 * the child's name, so take the first token when it is not an ordinary word.
 * A token that also repeats later is even stronger evidence.
 */
function inferLowercaseName(text: string) {
  const tokens = text.toLowerCase().match(/\b[a-z0-9][a-z0-9'-]{1,}\b/g);
  if (!tokens || tokens.length < 2) return "";

  for (let i = 0; i < Math.min(tokens.length, 12); i += 1) {
    const token = tokens[i];
    if (token.length < 2) continue;
    if (/\d/.test(token)) continue;
    if (COMMON_WORDS.has(token)) continue;
    if (BLOCKED_NAME_WORDS.has(titleCaseName(token))) continue;

    // Must read as the subject of the sentence: a verb follows, optionally
    // after one adverb, or an age does ("keiller 15 mnths").
    const next = tokens[i + 1];
    if (!next) continue;
    const afterNext = tokens[i + 2];
    const verbFollows =
      FOLLOWING_VERBS.has(next) ||
      (INTERVENING_ADVERBS.has(next) && afterNext !== undefined && FOLLOWING_VERBS.has(afterNext));
    const ageFollows = /^\d/.test(next);
    if (!verbFollows && !ageFollows) continue;

    return titleCaseName(token);
  }
  return "";
}

export function inferPrimaryChildName(observations: string) {
  const text = observations.trim();
  if (!text) return "";

  // Strongest signal: a name paired with an age, e.g. "Ruby (3)",
  // "Noah (3yo)", or the common educator shorthand "Ariana, aged 3".
  const ageMatch = text.match(
    /\b([A-Z][a-z][A-Za-z'-]*(?:\s+[A-Z][a-z][A-Za-z'-]*)?)\s*(?:\(\s*\d{1,2}\s*(?:yo|years?|months?|mths?|mnths?)?\s*\)|,?\s+aged\s+\d{1,2}\b|,?\s+age\s+\d{1,2}\b|,?\s+is\s+\d{1,2}\s+years?\s+old\b)/
  );
  const ageName = ageMatch ? cleanNameCandidate(ageMatch[1] ?? "") : "";
  if (ageName) return ageName;

  // Strong signal: an observation verb followed by a name, e.g. "noticed
  // Ari". Do not include ordinary child-to-child verbs such as "asked",
  // "helped", or "supported": "Ariana asked Luca" describes Luca as the
  // recipient and previously caused the entire story to focus on him.
  const observedMatch = text.match(/\b(?:noticed|observed|saw|watched)\s+([A-Z][a-z][A-Za-z'-]*)\b/);
  const observedName = observedMatch ? cleanNameCandidate(observedMatch[1] ?? "") : "";
  if (observedName) return observedName;

  // Fallback: most frequent capitalised candidate, weighting mid-sentence
  // appearances higher than sentence-initial ones (which are usually not
  // names). Give the first valid name a modest focus-child bonus because
  // educators normally introduce the observed child before peers.
  const scores = new Map<string, number>();
  const firstIndex = new Map<string, number>();
  const wordRegex = /\b[A-Z][a-z][A-Za-z'-]*\b/g;
  let firstCandidate = "";
  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text)) !== null) {
    const candidate = cleanNameCandidate(match[0]);
    if (!candidate) continue;
    const isFirstCandidate = !firstCandidate;
    if (isFirstCandidate) firstCandidate = candidate;
    const focusBonus = isFirstCandidate ? 3 : 0;
    const weight = (isSentenceStart(text, match.index) ? 1 : 2) + focusBonus;
    scores.set(candidate, (scores.get(candidate) ?? 0) + weight);
    if (!firstIndex.has(candidate)) firstIndex.set(candidate, match.index);
  }

  // No capitalised candidate at all: the note is probably all lower case.
  if (scores.size === 0) return inferLowercaseName(text);

  return (
    Array.from(scores.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (firstIndex.get(a[0]) ?? 0) - (firstIndex.get(b[0]) ?? 0);
    })[0]?.[0] ?? ""
  );
}

// Names of other children mentioned in an observation, excluding the focus child.
// Uses the same blocked-word and sentence-start guards as name inference so that
// capitalised sentence-starters ("After", "Suddenly") are never mistaken for names.
export function extractOtherChildNames(observations: string, childName?: string, limit = 2): string[] {
  const text = observations.trim();
  if (!text) return [];
  const child = childName?.trim().toLowerCase();
  const seen = new Set<string>();
  const result: string[] = [];
  const wordRegex = /\b[A-Z][a-z][A-Za-z'-]*\b/g;
  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text)) !== null) {
    const candidate = cleanNameCandidate(match[0]);
    if (!candidate) continue;
    // Sentence-initial words are usually not names; skip them to avoid false positives.
    if (isSentenceStart(text, match.index)) continue;
    const key = candidate.toLowerCase();
    if (key === child || seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
    if (result.length >= limit) break;
  }
  return result;
}
