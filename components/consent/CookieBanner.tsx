"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie } from "lucide-react";
import { applyConsent, track } from "@/lib/analytics/client";
import { CONSENT_OPEN, privacySignal, readConsent, writeConsent, type ConsentChoice } from "@/lib/analytics/consent";

/**
 * The cookie choice. A small card in the bottom corner on a computer and a
 * short sheet along the bottom on a phone, never a wall in front of the page:
 * the page stays fully usable while it is showing. Both answers are one tap
 * and the same size. "Essential only" is a real answer, not a hidden one, and
 * with it nothing about clicks, reading or devices is recorded
 * (lib/analytics/consent.ts).
 *
 * It waits a moment before appearing so the first thing a visitor sees is the
 * page. A browser that sends Global Privacy Control is not asked; it gets
 * "Essential only". "Cookie preferences" in the footer, and on the privacy
 * page, opens it again.
 */

// Signed-in pages have the menu down the left, so the card sits on the right there.
const APP_PREFIXES = [
  "/dashboard", "/generate", "/history", "/children", "/today", "/group", "/billing", "/centre", "/centre-tools",
  "/evidence", "/feedback", "/insights", "/pickup", "/planning", "/practice", "/reliever", "/roi", "/support",
  "/voices", "/wall",
];

// Pages where someone is signing up, signing in or acting on an email are not
// asked (19 Oct 2026). On a phone the sheet sat over the email and password
// fields and the "Create free account" button, and about 2 in 3 visitors never
// answer it, so they met a form they could not see. Without an answer nothing
// beyond page views and funnel steps is recorded, so not asking here is the
// privacy-safe default; the choice is still asked on the next marketing page.
const NOT_ASKED_PREFIXES = ["/signup", "/login", "/forgot-password", "/reset-password", "/join", "/pause", "/unsubscribe"];

// On a phone, wait until the visitor has started reading, so the first screen
// (headline and buttons) is never covered on arrival.
const PHONE_SCROLL_PX = 240;
const PHONE_FALLBACK_MS = 12000;
const DESKTOP_DELAY_MS = 1400;

function isPhone() {
  try {
    return window.matchMedia("(max-width: 639px)").matches;
  } catch {
    return false;
  }
}

export default function CookieBanner() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [current, setCurrent] = useState<ConsentChoice | null>(null);
  const [reopened, setReopened] = useState(false);

  const notAsked = NOT_ASKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const hidden = pathname.startsWith("/admin");
  const inApp = APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    const choice = readConsent();
    setCurrent(choice);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onScroll: (() => void) | undefined;
    if (!choice && !privacySignal() && !notAsked) {
      if (isPhone()) {
        const ask = () => {
          if (onScroll) window.removeEventListener("scroll", onScroll);
          if (timer) clearTimeout(timer);
          setOpen(true);
        };
        onScroll = () => {
          if (window.scrollY > PHONE_SCROLL_PX) ask();
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        timer = setTimeout(ask, PHONE_FALLBACK_MS);
        // Already scrolled (a #link, or the browser restoring the position): no scroll event will come.
        onScroll();
      } else {
        timer = setTimeout(() => setOpen(true), DESKTOP_DELAY_MS);
      }
    }
    const onOpen = () => {
      setCurrent(readConsent());
      setReopened(true);
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN, onOpen);
    return () => {
      if (timer) clearTimeout(timer);
      if (onScroll) window.removeEventListener("scroll", onScroll);
      window.removeEventListener(CONSENT_OPEN, onOpen);
    };
    // Re-evaluated per page: an unanswered visitor moving from /signup to a
    // guide is asked there.
  }, [notAsked, pathname]);

  // Mount first, then slide in, so the transition runs.
  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const choose = (choice: ConsentChoice) => {
    writeConsent(choice);
    applyConsent(choice);
    track("consent_choice", { choice, reopened, previous: current ?? "none" });
    setCurrent(choice);
    setShown(false);
    setTimeout(() => setOpen(false), 220);
  };

  // Opened on a guide, then the visitor tapped through to signup: step aside,
  // unless they asked for it from "Cookie preferences".
  if (hidden || !open || (notAsked && !reopened)) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      data-private
      className={[
        "fixed z-40 border-clay-200 bg-paper text-ink-900 shadow-[0_18px_50px_-20px_rgba(74,52,34,0.45)]",
        // A short strip on a phone (about 120 px, not 250): one sentence and the two answers.
        "inset-x-0 bottom-0 rounded-t-2xl border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "sm:inset-x-auto sm:bottom-5 sm:w-[23.5rem] sm:rounded-3xl sm:border sm:p-6",
        inApp ? "sm:right-5" : "sm:left-5",
        "transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span className="hidden h-9 w-9 flex-none items-center justify-center rounded-xl bg-cream-100 text-clay-700 sm:flex" aria-hidden="true">
          <Cookie className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h2 id="cookie-banner-title" className="sr-only font-display text-lg font-bold leading-snug text-ink-900 sm:not-sr-only">
            Can we use analytics cookies?
          </h2>
          <p id="cookie-banner-body" className="text-[13px] leading-snug text-ink-700 sm:mt-1.5 sm:text-sm sm:leading-relaxed sm:text-ink-600">
            <span className="sm:hidden">
              <strong className="font-semibold text-ink-900">Analytics cookies?</strong> They show us what helps educators and which ads work.
              Never your stories.{" "}
            </span>
            <span className="hidden sm:inline">
              They show us which parts of StoryLoop help educators, like what gets read and clicked, and whether our Google ads lead
              to sign-ups. Never sold, no personalised ads, and never anything from your stories or children.{" "}
            </span>
            <Link href="/privacy#cookies" className="font-semibold text-clay-700 underline underline-offset-2 hover:text-clay-900">
              What we collect
            </Link>
          </p>
          {reopened && current && (
            <p className="mt-2 text-xs font-semibold text-ink-500">
              Your choice now: {current === "all" ? "Allowed" : "Essential only"}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-2.5">
        <button
          type="button"
          onClick={() => choose("essential")}
          className="min-h-11 rounded-full border border-clay-300 bg-paper px-4 text-sm font-semibold text-ink-800 transition-colors hover:border-clay-500 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-600 active:scale-[0.98]"
        >
          Essential only
        </button>
        <button
          type="button"
          onClick={() => choose("all")}
          className="min-h-11 rounded-full bg-clay-700 px-4 text-sm font-semibold text-paper transition-colors hover:bg-clay-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-600 active:scale-[0.98]"
        >
          Allow
        </button>
      </div>
    </div>
  );
}

/** "Cookie preferences": reopens the banner from anywhere. */
export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN))}
    >
      Cookie preferences
    </button>
  );
}
