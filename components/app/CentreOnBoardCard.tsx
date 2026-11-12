"use client";

import Link from "next/link";
import { Building2, Send } from "lucide-react";
import CentreReferralCard from "@/components/app/CentreReferralCard";

/**
 * "Get your centre on board", always findable (13 Nov 2026), on the Dashboard
 * and at the top of My centre, for a signed-in educator in no centre and not on
 * a centre plan. Somebody in a centre, or on a centre plan, never sees it.
 *
 * The primary action is the one that starts centres: send a real story to your
 * leader, so they see StoryLoop working on their own children and the team's
 * free month beside it (components/marketing/LeaderCheckPage.tsx). It opens the
 * newest saved story's "Send this story to your leader" panel on /history. The
 * referral code and the ready-made message come second (CentreReferralCard).
 */
export default function CentreOnBoardCard({ newestStoryId }: { newestStoryId: string | null }) {
  return (
    <section className="card mb-6 min-w-0 p-5 md:p-6" data-testid="centre-onboard-card" aria-labelledby="centre-onboard-title">
      <div className="flex min-w-0 items-start gap-3">
        <div className="hidden h-10 w-10 flex-none items-center justify-center rounded-2xl bg-clay-700 text-paper sm:flex">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="section-title mb-1">Get your centre on board</p>
          <h2 id="centre-onboard-title" className="font-display text-xl font-bold text-ink-900">
            Show your leader a real story about your own children
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            Your leader gets a private link to one story, with your note beside it, and can start the whole team&apos;s free
            month from that page, with you already in it. They need no account to read it. Your other drafts stay yours.
          </p>
          {newestStoryId ? (
            <Link
              href={`/history#leader-${newestStoryId}`}
              className="btn-primary mt-4 w-full justify-center sm:w-auto"
              data-track="centre_onboard_send_story"
              data-testid="centre-onboard-send"
            >
              <Send className="h-4 w-4" /> Send a story to your leader
            </Link>
          ) : (
            <p className="mt-4 rounded-2xl border border-clay-100 bg-cream-50 p-3 text-sm leading-relaxed text-ink-700" data-testid="centre-onboard-no-story">
              You need one saved story first.{" "}
              <Link href="/generate" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">
                Write one
              </Link>
              , then send it to your leader from here.
            </p>
          )}
          <div className="mt-5 border-t border-clay-100 pt-4">
            <CentreReferralCard embedded />
          </div>
        </div>
      </div>
    </section>
  );
}
