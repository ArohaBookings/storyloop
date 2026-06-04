import Link from "next/link";
import { AlertTriangle, ArrowRight, Bug, CreditCard, Lightbulb, Mail, MessageCircle, Sparkles } from "lucide-react";

export const metadata = { title: "Support · StoryLoop" };

const SUPPORT_EMAIL = "ariacareapp@gmail.com";

function mailto(subject: string, body: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const SUPPORT_OPTIONS = [
  {
    title: "Something is not working",
    description: "Voice notes, login, story generation, history, or anything that feels broken.",
    icon: Bug,
    href: mailto(
      "StoryLoop bug report",
      "Hi StoryLoop support,\n\nWhat happened:\n\nWhat I expected:\n\nDevice/browser:\n\nScreenshots or steps to reproduce:\n"
    ),
    cta: "Report a bug",
  },
  {
    title: "Billing or subscription help",
    description: "Payment failed, invoice question, plan change, cancellation, or Stripe portal trouble.",
    icon: CreditCard,
    href: mailto(
      "StoryLoop billing support",
      "Hi StoryLoop support,\n\nMy billing question is:\n\nAccount email:\n\nPlan or invoice details if known:\n"
    ),
    cta: "Ask about billing",
  },
  {
    title: "Feature request",
    description: "Tell us what would make StoryLoop more useful for your service or teaching team.",
    icon: Lightbulb,
    href: mailto(
      "StoryLoop feature request",
      "Hi StoryLoop support,\n\nThe feature I would like is:\n\nWhy it would help educators:\n\nHow often I would use it:\n"
    ),
    cta: "Suggest a feature",
  },
  {
    title: "General enquiry",
    description: "Setup help, curriculum questions, centre rollout, or anything else.",
    icon: MessageCircle,
    href: mailto(
      "StoryLoop support enquiry",
      "Hi StoryLoop support,\n\nI need help with:\n\nAccount email if relevant:\n"
    ),
    cta: "Email support",
  },
];

export default function SupportPage() {
  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-clay-200 bg-gradient-to-br from-cream-100 via-white to-sage-50 p-6 md:p-8 shadow-warm animate-fade-up">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-clay-300/20 blur-3xl" />
        <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-sage-200/30 blur-3xl" />
        <div className="relative z-10 max-w-3xl">
          <p className="section-title mb-3">StoryLoop support</p>
          <h1 className="font-display text-4xl font-bold text-ink-900">Get help without getting stuck.</h1>
          <p className="mt-3 text-sm text-ink-600 md:text-base">
            For support, bug fixes, billing enquiries, and feature requests, email us directly. Include your account email and a screenshot if it helps.
          </p>
          <a href={mailto("StoryLoop support", "Hi StoryLoop support,\n\nI need help with:\n")} className="btn-primary mt-6">
            <Mail className="w-4 h-4" />
            Email {SUPPORT_EMAIL}
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SUPPORT_OPTIONS.map(({ title, description, icon: Icon, href, cta }, index) => (
          <a
            key={title}
            href={href}
            className={`card group p-5 transition-all hover:-translate-y-1 hover:border-clay-300 hover:shadow-clay animate-fade-up-${Math.min(index + 1, 4)}`}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-clay-700 text-paper shadow-warm transition-transform group-hover:rotate-[-3deg] group-hover:scale-105">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-ink-900">{title}</h2>
            <p className="mt-2 text-sm text-ink-600">{description}</p>
            <p className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-clay-700">
              {cta} <ArrowRight className="h-3.5 w-3.5" />
            </p>
          </a>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-ink-900">What to include so we can fix it fast</h2>
              <div className="mt-4 grid gap-3 text-sm text-ink-600 sm:grid-cols-2">
                <p className="rounded-2xl bg-cream-50 p-3">Your account email and the page you were on.</p>
                <p className="rounded-2xl bg-cream-50 p-3">Device and browser, especially for microphone issues.</p>
                <p className="rounded-2xl bg-cream-50 p-3">A screenshot or exact error message if you have one.</p>
                <p className="rounded-2xl bg-cream-50 p-3">For billing, the invoice number or Stripe email if different.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card-warm p-5 md:p-6">
          <Sparkles className="mb-4 h-6 w-6 text-clay-700" />
          <h2 className="font-display text-2xl font-bold text-ink-900">Quick links</h2>
          <div className="mt-4 grid gap-2">
            <Link href="/generate" className="btn-secondary justify-between">
              Create a story <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/history" className="btn-secondary justify-between">
              View story history <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/billing" className="btn-secondary justify-between">
              Billing and plan <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="btn-secondary justify-between">
              Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
