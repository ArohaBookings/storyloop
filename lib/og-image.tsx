import { ImageResponse } from "next/og";

/**
 * The picture that appears when a StoryLoop link is shared.
 *
 * Every page on this site set `twitter:card` to "summary_large_image" and then
 * shipped no image at all, because Next.js replaces the whole openGraph object
 * when a page defines its own and eleven pages defined one without `images`.
 * So every link posted into a Facebook group, a staffroom chat or a text
 * message rendered as a blank grey box. For a product whose entire distribution
 * is educators sharing links with each other, that is not a cosmetic bug.
 *
 * Generated rather than drawn, so it cannot go stale and so a twelfth page
 * cannot be added without one. Each card carries that page's own title, which
 * is the difference between a share that says "StoryLoop" and a share that says
 * what the reader is about to get.
 *
 * Deliberately no remote fonts and no remote images: an OG card is rendered by
 * somebody else's crawler on a schedule you do not control, and a card that
 * depends on a font CDN is a card that is sometimes blank.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const PAPER = "#fbf8f2";
const INK = "#2b2826";
const INK_SOFT = "#5a5350";
const CLAY = "#6f4930";
const CLAY_SOFT = "#bd9573";
const CREAM = "#fdf9ed";

/** Long titles have to shrink or they overflow the card. */
function titleSize(title: string) {
  if (title.length > 90) return 46;
  if (title.length > 60) return 56;
  if (title.length > 38) return 68;
  return 80;
}

export function ogImage({
  title,
  kicker,
  footer = "storyloop.space",
}: {
  title: string;
  kicker?: string | null;
  footer?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "68px 72px",
          position: "relative",
        }}
      >
        {/* A warm wash in the corner, so the card reads as a designed object
            rather than text on a rectangle. */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -180,
            width: 520,
            height: 520,
            borderRadius: 999,
            background: CREAM,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* The StoryLoop mark (public/logo.svg). */}
          <svg width="46" height="46" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="15" fill={CLAY} />
            <path d="M 44.1 19.9 A 16 16 0 1 0 48 32" stroke={PAPER} strokeWidth="5" strokeLinecap="round" fill="none" />
            <circle cx="46.5" cy="21.5" r="4.4" fill="#e8c155" />
            <circle cx="32" cy="32" r="3.2" fill={PAPER} />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: INK, letterSpacing: -0.5 }}>StoryLoop</div>
            <div style={{ fontSize: 14, color: INK_SOFT, letterSpacing: 3, textTransform: "uppercase" }}>by Aria Care</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          {kicker ? (
            <div
              style={{
                fontSize: 22,
                color: CLAY,
                letterSpacing: 3,
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 18,
              }}
            >
              {kicker}
            </div>
          ) : null}
          <div style={{ fontSize: titleSize(title), lineHeight: 1.12, color: INK, fontWeight: 700, letterSpacing: -1.5 }}>
            {title}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 5, borderRadius: 999, background: CLAY_SOFT }} />
          <div style={{ fontSize: 22, color: INK_SOFT }}>{footer}</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
