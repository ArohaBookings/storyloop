import { layoutBars, type DayBucket } from "@/lib/admin-charts";

/**
 * A bar chart, drawn as inline SVG.
 *
 * No charting library on purpose. A dependency here would cost more kilobytes
 * than the entire admin area for a picture of sixty numbers, and every chart
 * library eventually wants its own stylesheet, its own theme and its own
 * opinion about dates.
 *
 * The bars animate up on load rather than appearing finished, which is the one
 * place motion earns its keep: the eye follows the growth and lands on the
 * shape of the trend instead of reading sixty individual heights. Respects
 * prefers-reduced-motion through the global rule in globals.css.
 */
export default function BarChart({
  buckets,
  label,
  accent = "#bd9573",
  height = 160,
}: {
  buckets: DayBucket[];
  label: string;
  accent?: string;
  height?: number;
}) {
  const width = 600;
  const { bars, max } = layoutBars(buckets, { width, height });
  if (!bars.length) return <p className="text-sm text-ink-500">Nothing to show yet.</p>;

  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const first = buckets[0]?.day;
  const last = buckets[buckets.length - 1]?.day;
  const short = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={`${label}. ${total} in total, highest day ${max}.`}
      >
        {/* A faint line at the top of the scale, so a reader can see what the
            tallest bar is measured against. */}
        <line x1="0" y1="0.5" x2={width} y2="0.5" stroke="currentColor" strokeWidth="1" className="text-ink-800" opacity="0.35" />
        {bars.map((bar) => (
          <rect
            key={bar.label}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx="1"
            fill={bar.value === 0 ? "#3f3a38" : accent}
            className="admin-bar"
            style={{ transformOrigin: `${bar.x}px ${height}px` }}
          >
            <title>{`${short(bar.label)}: ${bar.value}`}</title>
          </rect>
        ))}
      </svg>
      <figcaption className="mt-1.5 flex items-center justify-between text-[11px] text-ink-500">
        <span>{first ? short(first) : ""}</span>
        <span className="tabular-nums">{total} total · peak {max}</span>
        <span>{last ? short(last) : ""}</span>
      </figcaption>
    </figure>
  );
}
