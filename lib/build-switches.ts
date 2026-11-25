/**
 * The 25 November 2026 build's switches: one constant per new behaviour.
 *
 * EVERY switch of this build is in this file (MERGE2 2g): the five behaviour
 * switches below and HELD_PAGE_ON, one per held page (what each page does is
 * in lib/held-pages.ts). THE PROMISE: with every switch here set to false the
 * site behaves as the live commit 776e537. To check it, change every "true" in
 * this file to "false" and nothing else (tests/build-switches.test.ts proves
 * that this one edit reaches every switch, and that each reader has a test
 * for its switch off).
 *
 * Older switches that are already off on the live site keep their live value
 * and are not part of this build: HELD_BUYER_PAGES_ON (lib/buyer-pages.ts),
 * TELL_CENTRE_ON (lib/family-tell-centre.ts), SIGNUP_EMAIL_LINK_ON
 * (lib/auth/signup-link.ts).
 *
 * NOT behind a switch (R1-8, 25 Nov review): turning them all off does not
 * undo these, so they cannot be ruled out that way:
 * - signup with no name box (B4) and the email-link signup's skipped name;
 * - the demo's once-a-day limit per browser and the note carried into signup (B5);
 * - the statement guides' drafter on the first desktop screen (B1);
 * - the search re-aim (titles, first lines, note box, owned sentences) and the
 *   founder section and About copy (C);
 * - the /privacy and /data-sheet wording;
 * - the 20261125_leader_path.sql and 20261126_leader_stop_list.sql migrations,
 *   which must be applied before this code is deployed (GET /api/centres reads
 *   leader_sets; the leader stop list and centre_members.joined_via);
 * - the opaque stop link, joining by the tick only for the verified address the
 *   email went to, the bell note after a tick join, the counts-only sources
 *   record (it fires only where LEADER_SOURCES_ON shows the numbers), and the
 *   /faq, /safety and "bank wants a confirmation" wording (MERGE2, 25 Nov).
 * Turning one switch off is a one-line change and a deploy.
 */

/**
 * Statements get a hard wall at the normal price: past the free allowance the
 * free week does not unlock more statements, and the wall takes the first
 * month today. Stories keep the 7-day free week exactly as now.
 * Why: people who come for a statement need it this week; Leo ruled 24 Nov.
 */
export const STATEMENTS_PAY_TODAY = true;

/**
 * StoryLoop emails the leader once in the educator's name, with one reminder
 * after 48 hours if the story has not been opened, then nothing.
 * Why: approved by Leo 24 Nov; the leader is the person who decides for a centre.
 */
export const LEADER_EMAIL_ON = true;

/**
 * The statement page collects a whole room's statements so they can be sent
 * to the leader as one set and saved as one file.
 * Why: statements are written for a whole class at once (24 Nov plan, A1/A5).
 */
export const CLASS_SET_ON = true;

/**
 * A leader starts her centre free until 31 January 2027 with no payment page.
 * Why: the no-card checkout page was a step between a willing leader and her
 * team (24 Nov plan, B6).
 */
export const CENTRE_START_NO_CHECKOUT = true;

/**
 * The leader sees where each line of a story came from in the note, when the
 * educator ticks it after seeing the numbers in her preview.
 * Why: only StoryLoop holds the note beside the draft (A4). On 25 Nov because
 * the held-out fixtures passed the gate (precision 0.962, false flags 0.031;
 * gate 0.90 and 0.10; tests/source-lines-accuracy.test.ts).
 */
export const LEADER_SOURCES_ON = true;

/**
 * One switch per held page (25 Nov 2026). The conductor's ruling for the
 * release (25 Nov, after Leo approved the release and its wording at 17:50):
 * ON the three pages that answer searches our buyers make, the educational
 * leader page and the re-aimed /eylf-planning-cycle and
 * /assessment-and-rating-evidence; OFF /qip-childcare (the search map says not
 * to build it) and /exceeding-nqs-documentation (two of our pages must not
 * split one search), and the workload and family pages held since 19 Nov.
 */
export const HELD_PAGE_ON = {
  "educational-leader-checklist": true,
  "documentation-workload-early-childhood": false,
  "exceeding-nqs-documentation": false,
  "ask-your-centre": false,
  "eylf-planning-cycle": true,
  "assessment-and-rating-evidence": true,
  "qip-childcare": false,
} as const satisfies Record<string, boolean>;

/** The five behaviour switches, for tests and the admin view. */
export const BUILD_SWITCHES = {
  STATEMENTS_PAY_TODAY,
  LEADER_EMAIL_ON,
  CLASS_SET_ON,
  CENTRE_START_NO_CHECKOUT,
  LEADER_SOURCES_ON,
} as const;

/** Every switch of this build by name, the held pages as HELD_PAGE_ON.<slug>: the list the switches-off check turns off. */
export const EVERY_SWITCH: Record<string, boolean> = {
  ...BUILD_SWITCHES,
  ...Object.fromEntries(Object.entries(HELD_PAGE_ON).map(([slug, on]) => [`HELD_PAGE_ON.${slug}`, on])),
};
