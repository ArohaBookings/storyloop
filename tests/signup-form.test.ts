import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SIGNUP_NOT_NOW_REASONS, checkSignupForm, deviceForWidth, signupErrorView } from "../lib/signup-form";
import { EVENTS, SIGNUP_ERROR_CODES, STOP_REASONS, sanitizeEventMetadata } from "../lib/analytics/events";

const ok = { name: "Aroha", email: "aroha@centre.co.nz", password: "kowhai-tui-42", typo: null, typoAccepted: false };

test("signup checks: each empty or wrong box names its rule and its box", () => {
  assert.equal(checkSignupForm(ok), null);
  assert.deepEqual([checkSignupForm({ ...ok, name: " " })?.code, checkSignupForm({ ...ok, name: " " })?.field], ["missing_name", "name"]);
  assert.equal(checkSignupForm({ ...ok, email: "" })?.code, "missing_email");
  assert.equal(checkSignupForm({ ...ok, email: "aroha@centre" })?.code, "invalid_email");
  assert.equal(checkSignupForm({ ...ok, email: "aroha centre.co.nz" })?.code, "invalid_email");
  assert.equal(checkSignupForm({ ...ok, password: "" })?.code, "missing_password");
  assert.equal(checkSignupForm({ ...ok, password: "12345" })?.code, "short_password");
});

test("signup checks: a likely typo is asked once, then her own address goes through", () => {
  const typo = checkSignupForm({ ...ok, email: "aroha@gmial.com", typo: "aroha@gmail.com" });
  assert.equal(typo?.code, "email_typo");
  assert.match(typo?.message ?? "", /aroha@gmail\.com/);
  assert.equal(checkSignupForm({ ...ok, email: "aroha@gmial.com", typo: "aroha@gmail.com", typoAccepted: true }), null);
});

test("every client and server code is a listed signup_error code, and every refusal has a next step", () => {
  const listed = new Set<string>(SIGNUP_ERROR_CODES);
  const server = ["rate_limited", "bot_check", "missing_name", "missing_email", "short_password", "disposable_email", "human_check_failed", "human_check_reused", "pwned_password", "bad_access_code", "email_exists", "session_failed", "server_error", "network", "timeout", "something-new"];
  for (const code of server) {
    const view = signupErrorView(code, "");
    assert.ok(listed.has(view.code), `${code} -> ${view.code}`);
    assert.ok(view.message.length > 10);
    assert.ok(!/error:|exception|undefined|null/i.test(view.message), view.message);
    // A next step: a box to fix, a button, or words saying what to do.
    assert.ok(view.field || view.action || /try again|sign in|check|already/i.test(view.message), code);
  }
  assert.equal(signupErrorView("checkout_failed", "").action, "billing");
  assert.equal(signupErrorView("session_failed", "").action, "sign_in");
  assert.equal(signupErrorView("human_check_failed", "").action, "refresh");
});

test("device from width", () => {
  assert.deepEqual([deviceForWidth(393), deviceForWidth(800), deviceForWidth(1440)], ["mobile", "tablet", "desktop"]);
});

test("Not now? reasons are listed exit reasons and name no other product", () => {
  const listed = new Set<string>(STOP_REASONS);
  for (const reason of SIGNUP_NOT_NOW_REASONS) {
    assert.ok(listed.has(reason.key), reason.key);
    assert.ok(!/chatgpt|copilot|gemini|storypark|educa|ai tool/i.test(reason.label));
  }
  assert.ok(sanitizeEventMetadata("exit_question_answered", { page: "/signup", reason: "no_new_login" }));
});

test("signup events carry listed values only: typed text and emails are dropped", () => {
  const left = sanitizeEventMetadata("signup_left", { last: "typing", seconds: 6, email: "a@b.co" } as never);
  assert.deepEqual(left, { last: "typing", seconds: 6 });
  const view = sanitizeEventMetadata("signup_view", { entry: "/learning-story-examples", device: "mobile", in_app: true, plan: "free", has_draft: false });
  assert.equal(view?.entry, "/learning-story-examples");
  const err = sanitizeEventMetadata("signup_error", { code: "Jane Smith" as never, side: "client" });
  assert.equal(err?.code, undefined);
  assert.equal(EVENTS.signup_left.consent, "all");
});

test("the signup page fires every signup event from the list and sends no typed value", () => {
  const src = readFileSync("app/(auth)/signup/SignupForm.tsx", "utf8");
  for (const name of ["signup_view", "signup_field_focus", "signup_error", "signup_submitted", "signup_left", "signup_bot_check_failed", "signup_draft_carried", "oauth_cancelled", "exit_question_answered"]) {
    assert.ok(src.includes(`"${name}"`), name);
  }
  assert.ok(src.includes("sendBeacon") || src.includes('"pagehide"'));
  assert.ok(!/trackEvent\([^)]*\b(name|email|password)\b\s*[,}]/.test(src.replace(/\{ name: "signup-name"[^}]*\}/, "")));
  assert.ok(src.includes("noValidate"));
});

test("email-me-a-link: OFF by default, and the session is read from the link's return address", async () => {
  const link = await import("../lib/auth/signup-link");
  assert.equal(link.SIGNUP_EMAIL_LINK_ON, false);
  assert.equal(link.signupLinkFinishPath("/generate?welcome=1"), "/auth/finish?next=%2Fgenerate%3Fwelcome%3D1&intent=signup&method=link");
  assert.deepEqual(link.sessionFromHash("#access_token=a.b.c&expires_in=3600&refresh_token=r1&token_type=bearer&type=magiclink"), { access_token: "a.b.c", refresh_token: "r1" });
  assert.equal(link.sessionFromHash("#error=access_denied&error_code=otp_expired"), null);
  assert.equal(link.linkErrorFromHash("#error=access_denied&error_code=otp_expired"), "otp_expired");
  const route = readFileSync("app/api/auth/signup-link/route.ts", "utf8");
  // The same protections as a password signup, in order, before anything is sent.
  const order = ["SIGNUP_EMAIL_LINK_ON", 'scope: "signup"', "body.website", "isDisposableEmail", "verifyPass", "human-pass-used", 'scope: "signup-link"', "signInWithOtp"].map((s) => route.indexOf(s));
  assert.ok(order.every((i) => i > 0), JSON.stringify(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});
