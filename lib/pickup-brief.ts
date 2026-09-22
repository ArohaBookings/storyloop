/**
 * The pickup brief.
 *
 * The most repeated human interaction in this sector is an educator handing a
 * child back and saying "he had a good day". The parent has been away eight
 * hours and receives one sentence carrying no information. Parents judge a
 * service on that exchange, not on documentation they never open.
 *
 * WHAT THIS IS NOT: a script. The failure at three o'clock is not that an
 * educator cannot phrase things, it is that twenty children did a hundred
 * things and nobody can hold which was whose. So this is a memory aid. It puts
 * the specific true thing in front of the person who was there, and they say it
 * in their own words, the way they always have.
 *
 * THE RULE THAT MAKES IT WORTH TRUSTING: it never invents and never implies.
 * A child with nothing recorded today gets told so plainly, with the most
 * recent true thing offered instead and clearly marked as older. An educator
 * who repeats a line from here must never discover, mid-sentence, that it was
 * a guess. A parent can always tell, and one bluff costs more than a hundred
 * good handovers earn.
 */

export type BriefMomentSource = "capture" | "story" | "child-voice";

export type PickupMoment = {
  childId: string | null;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** What was actually written down, in the educator's or child's own words. */
  text: string;
  source: BriefMomentSource;
};

export type PickupChild = { id: string; name: string };

export type PickupLine = {
  childId: string;
  name: string;
  /** The specific true thing, exactly as it was recorded. */
  says: string | null;
  source: BriefMomentSource | null;
  /** YYYY-MM-DD of the moment behind the line. */
  date: string | null;
  freshness: "today" | "earlier" | "nothing";
};

export type PickupBrief = {
  date: string;
  lines: PickupLine[];
  /** Children with nothing recorded at all. Named, because that is the point. */
  nothingToSay: string[];
  headline: string;
};

/** Older than this and "earlier this week" stops being true. */
export const EARLIER_WINDOW_DAYS = 7;

const clean = (value: string | null | undefined) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export function buildPickupBrief(input: {
  children: PickupChild[];
  moments: PickupMoment[];
  today: string;
}): PickupBrief {
  const { today } = input;

  const byChild = new Map<string, PickupMoment[]>();
  for (const moment of input.moments) {
    if (!moment.childId || !clean(moment.text)) continue;
    if (moment.date > today) continue;
    if (daysBetween(moment.date, today) > EARLIER_WINDOW_DAYS) continue;
    byChild.set(moment.childId, [...(byChild.get(moment.childId) ?? []), { ...moment, text: clean(moment.text) }]);
  }

  const lines: PickupLine[] = input.children.map((child) => {
    const moments = (byChild.get(child.id) ?? []).sort((a, b) => b.date.localeCompare(a.date));
    // A child's own words beat an adult's summary of the same day, because
    // "she told me the water needed to go higher" is a better thing to hand a
    // parent than anything written about her.
    const todays = moments.filter((moment) => moment.date === today);
    const chosen =
      todays.find((moment) => moment.source === "child-voice") ??
      todays[0] ??
      moments.find((moment) => moment.source === "child-voice") ??
      moments[0] ??
      null;

    if (!chosen) {
      return { childId: child.id, name: child.name, says: null, source: null, date: null, freshness: "nothing" };
    }
    return {
      childId: child.id,
      name: child.name,
      says: chosen.text,
      source: chosen.source,
      date: chosen.date,
      freshness: chosen.date === today ? "today" : "earlier",
    };
  });

  // Children with nothing first: the handover that needs the most help is the
  // one where the educator has nothing to say, and hiding that helps nobody.
  const order = { nothing: 0, earlier: 1, today: 2 } as const;
  lines.sort((a, b) => order[a.freshness] - order[b.freshness] || a.name.localeCompare(b.name));

  const nothingToSay = lines.filter((line) => line.freshness === "nothing").map((line) => line.name);
  const todayCount = lines.filter((line) => line.freshness === "today").length;

  let headline: string;
  if (!input.children.length) headline = "No child profiles yet.";
  else if (!todayCount && nothingToSay.length === input.children.length) {
    headline = "Nothing has been captured for this room lately. Anything you noticed today is worth ten minutes now.";
  } else if (nothingToSay.length) {
    headline = `${todayCount} of ${input.children.length} have something from today. Nothing yet for ${nothingToSay.join(", ")}.`;
  } else {
    headline = `${todayCount} of ${input.children.length} have something from today.`;
  }

  return { date: today, lines, nothingToSay, headline };
}

/**
 * Words that carry no facts, so a polished line may use them freely.
 *
 * Two kinds are here. Ordinary grammar, and a short list of NEUTRAL VERBS
 * (worked, played, spent, moved, used, showed) which describe an action
 * without asserting anything that was not observed. Without them the guard
 * rejects "Ruby worked on the angle at the trough", which is a faithful
 * rendering of "Ruby - trough, angle", and a guard that rejects everything is
 * a feature nobody can use.
 *
 * What is deliberately NOT here is the dangerous vocabulary: emotions
 * (happily, proud, loved), judgements (wonderful, great, lovely) and new
 * participants (friends, everyone). Those are the words a model reaches for
 * when it is filling a gap, and they are exactly what a parent would be hearing
 * for the first time. Any NOUN that was not written down still fails, so "with
 * her friends" cannot get through on the back of a permitted verb.
 */
const FREE_WORDS = new Set([
  "a", "about", "after", "again", "all", "an", "and", "any", "are", "around", "as", "at", "away",
  "back", "be", "because", "been", "before", "being", "both", "but", "by",
  "came", "can", "come", "could", "did", "do", "does", "doing", "done", "down", "during",
  "each", "even", "every", "few", "first", "for", "from", "further",
  "get", "getting", "go", "going", "got", "had", "has", "have", "having", "he", "her", "here",
  "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its",
  "itself", "just", "keep", "kept", "lot", "made", "make", "making", "many", "more", "most",
  "much", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "one", "only",
  "or", "other", "our", "ours", "out", "over", "own", "put", "quite", "really", "right",
  "said", "same", "say", "saying", "says", "she", "should", "so", "some", "still", "such",
  // Neutral verbs: an action, with no feeling, no verdict and nobody new.
  "asked", "asking", "brought", "built", "building", "change", "changed", "changing",
  "finished", "look", "looked", "looking", "move", "moved", "moving", "play", "played",
  "playing", "show", "showed", "showing", "spend", "spent", "start", "started", "tell",
  "told", "use", "watch", "watched", "work", "worked", "working",
  "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these",
  "they", "this", "those", "through", "time", "to", "today", "together", "too", "took", "try",
  "trying", "under", "until", "up", "us", "used", "using", "very", "was", "we", "went", "were",
  "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would",
  "you", "your", "yours",
]);

const contentWords = (text: string) =>
  (clean(text).toLowerCase().match(/[\p{L}\p{N}'-]+/gu) ?? []).filter((word) => !FREE_WORDS.has(word) && word.length > 2);

/**
 * Whether a smoothed version of a line is still only saying what was written.
 *
 * A model asked to make a shorthand note sayable is being asked to do the one
 * thing models do badly under pressure: leave out the part it does not know.
 * "Ruby - trough, angle, persistence" comes back as "Ruby worked happily at the
 * water trough with her friends", and neither the happiness nor the friends
 * were ever recorded. An educator repeats it, a parent hears an invention, and
 * everything this product claims about evidence is gone.
 *
 * So the guard is not a prompt, it is arithmetic: every content word in the
 * polished line must appear in the source or in the child's name. If anything
 * new arrived, the polish is discarded and the recorded note is shown as it
 * was written. Rejecting a good line costs nothing; accepting a wrong one
 * costs the thing that makes this worth using.
 */
export function polishIsFaithful(source: string, polished: string, childName = ""): boolean {
  const allowed = new Set([...contentWords(source), ...contentWords(childName)]);
  const introduced = contentWords(polished).filter((word) => {
    if (allowed.has(word)) return true;
    // Allow ordinary inflections of a word that IS in the source, so "build"
    // may become "building" without the whole line being thrown away.
    const stem = word.replace(/(ing|ed|s|es|ies)$/, "");
    return [...allowed].some((known) => known.startsWith(stem) || stem.startsWith(known.replace(/(ing|ed|s|es|ies)$/, "")));
  });
  return introduced.length === contentWords(polished).length;
}
