/**
 * The 25 November 2026 build's switches: one constant per new behaviour.
 *
 * Every new behaviour in this build reads its switch here. With all five
 * false the site behaves exactly as the live commit 776e537
 * (tests/build-switches.test.ts holds that rule). Turning one off is a
 * one-line change and a deploy; nothing else needs to move.
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
 * The leader sees where each line of a story came from in the note.
 * Off until the matcher is built and its held-out fixtures reach precision
 * 0.90 or better with false flags 0.10 or fewer (deferred 24 Nov, A4).
 */
export const LEADER_SOURCES_ON = false;

/** All five, for tests and the admin view. */
export const BUILD_SWITCHES = {
  STATEMENTS_PAY_TODAY,
  LEADER_EMAIL_ON,
  CLASS_SET_ON,
  CENTRE_START_NO_CHECKOUT,
  LEADER_SOURCES_ON,
} as const;
