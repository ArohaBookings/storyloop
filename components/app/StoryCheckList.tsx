import { AlertCircle, CheckCircle2, MinusCircle } from "lucide-react";
import type { CheckItemStatus, StoryCheckResult } from "@/lib/check-my-story";

/**
 * Check my story, shown (lib/check-my-story.ts): the four things a leader looks
 * for, each with a plain answer. The same list in a leader's team review queue,
 * on an educator's own story before she sends it to her leader, and on the
 * public /check-my-story page. Presentational only: the check is worked out
 * before it gets here.
 */

const ICON: Record<CheckItemStatus, { Icon: typeof CheckCircle2; className: string; label: string }> = {
  ok: { Icon: CheckCircle2, className: "text-sage-700", label: "Looks right" },
  look: { Icon: AlertCircle, className: "text-clay-700", label: "Worth a look" },
  none: { Icon: MinusCircle, className: "text-ink-400", label: "Nothing to check" },
};

export function StoryCheckSummary({ check, className = "", as: Tag = "p" }: { check: StoryCheckResult; className?: string; as?: "p" | "span" }) {
  const { Icon, className: tone } = ICON[check.looks > 0 ? "look" : "ok"];
  return (
    <Tag className={`flex items-start gap-1.5 text-xs font-semibold leading-relaxed text-ink-700 ${className}`} data-testid="story-check-summary" data-looks={check.looks}>
      <Icon className={`mt-0.5 h-3.5 w-3.5 flex-none ${tone}`} aria-hidden />
      <span className="min-w-0">Check: {check.summary}</span>
    </Tag>
  );
}

export default function StoryCheckList({
  check,
  heading = "What a leader looks for",
  className = "",
}: {
  check: StoryCheckResult;
  heading?: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-2xl border border-clay-100 bg-paper p-3 sm:p-4 ${className}`} data-testid="story-check" data-looks={check.looks}>
      <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{heading}</p>
      <ul className="mt-2 space-y-2.5">
        {check.items.map((item) => {
          const { Icon, className: tone, label } = ICON[item.status];
          return (
            <li key={item.id} className="flex min-w-0 items-start gap-2" data-testid="story-check-item" data-check={item.id} data-status={item.status}>
              <Icon className={`mt-0.5 h-4 w-4 flex-none ${tone}`} aria-label={label} role="img" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                <p className="break-words text-sm leading-relaxed text-ink-600">{item.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
