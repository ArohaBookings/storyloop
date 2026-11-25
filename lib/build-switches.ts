/**
 * The 25 November 2026 build's switches: one constant per new behaviour.
 *
 * The leader path, the statement wall and the centre start read their switch
 * here. With all five false those behave as the live commit 776e537
 * (tests/build-switches.test.ts, and the five-case writer check).
 *
 * NOT behind a switch (R1-8, 25 Nov review): turning all five off does not
 * undo these, so they cannot be ruled out that way:
 * - signup with no name box (B4) and the email-link signup's skipped name;
 * - the demo's once-a-day limit per browser and the note carried into signup (B5);
 * - the statement guides' drafter on the first desktop screen (B1);
 * - the search re-aim (titles, first lines, note box, owned sentences) and the
 *   founder section and About copy (C);
 * - the /privacy and /data-sheet wording;
 * - the 20261125_leader_path.sql migration, which must be applied before this
 *   code is deployed (GET /api/centres reads leader_sets).
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

/** All five, for tests and the admin view. */
export const BUILD_SWITCHES = {
  STATEMENTS_PAY_TODAY,
  LEADER_EMAIL_ON,
  CLASS_SET_ON,
  CENTRE_START_NO_CHECKOUT,
  LEADER_SOURCES_ON,
} as const;
