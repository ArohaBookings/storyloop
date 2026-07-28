"use client";

import { useState } from "react";

/**
 * A photo slot that degrades gracefully.
 *
 * We reference real files under /images. Until a file is dropped in, or if it
 * ever fails to load, the slot shows a warm branded placeholder rather than a
 * broken image icon. That means the layout is finished and correct now, and the
 * moment real photographs are added they simply appear, with no code change.
 *
 * Uses a plain img rather than next/image on purpose: next/image demands the
 * file exist at build time, which would break the build for a not-yet-added
 * photo. Landing photos are decorative, so the tradeoff is worth it.
 */
export default function SiteImage({
  src,
  alt,
  className = "",
  rounded = "rounded-3xl",
  emoji = "🌱",
  caption,
}: {
  src: string;
  alt: string;
  className?: string;
  rounded?: string;
  emoji?: string;
  caption?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`}>
      {/* Always-present branded ground. A real photo sits on top of it. */}
      <div
        aria-hidden={!failed}
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cream-100 via-clay-50 to-sage-50"
      >
        <span className="text-5xl opacity-40 md:text-6xl" aria-hidden="true">{emoji}</span>
      </div>

      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="relative z-10 h-full w-full object-cover"
        />
      )}

      {caption && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink-900/70 to-transparent p-4">
          <p className="text-xs font-medium text-paper/95">{caption}</p>
        </div>
      )}
    </div>
  );
}
