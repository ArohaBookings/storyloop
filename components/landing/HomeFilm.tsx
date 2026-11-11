"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { CUSTOMER_CLIP, HOME_FILM, filmVariantForZone, type FilmVariant } from "@/lib/home-film";

/**
 * The homepage film (lib/home-film.ts has what it is and is not).
 *
 * It costs a visitor nothing until they reach it: the poster is a small
 * picture, and the film itself is only fetched when the frame is on screen.
 * It plays without sound and stops when scrolled away. Somebody who asked
 * their device for less motion or less data gets the poster and a play button.
 */
export default function HomeFilm() {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [variant, setVariant] = useState<FilmVariant>("au");
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const wantsPlay = useRef(true);
  const counted = useRef({ play: false, complete: false });

  useEffect(() => {
    let zone = "";
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""; } catch { /* Australia */ }
    const chosen = filmVariantForZone(zone);
    setVariant(chosen);

    const el = frame.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saving = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    wantsPlay.current = !calm && !saving;
    const small = window.innerWidth < 700;
    const watcher = new IntersectionObserver(
      ([entry]) => {
        const v = video.current;
        if (entry.isIntersecting) {
          // Fetch only when it is wanted: on screen, and allowed to play by itself.
          if (wantsPlay.current) {
            setSrc((current) => current ?? HOME_FILM.file(chosen, small));
            void v?.play().catch(() => {});
          }
        } else {
          v?.pause();
        }
      },
      { threshold: 0.45 },
    );
    watcher.observe(el);
    return () => watcher.disconnect();
  }, []);

  // A source that arrives after the frame came on screen starts by itself.
  useEffect(() => {
    if (src && wantsPlay.current) void video.current?.play().catch(() => {});
  }, [src]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (!src) {
      wantsPlay.current = true;
      setSrc(HOME_FILM.file(variant, window.innerWidth < 700));
      return;
    }
    if (v.paused) {
      wantsPlay.current = true;
      void v.play().catch(() => {});
    } else {
      wantsPlay.current = false;
      v.pause();
    }
  };

  if (CUSTOMER_CLIP) {
    return (
      <figure className="relative">
        <div className="relative overflow-hidden rounded-3xl border border-clay-100 bg-cream-100">
          <video controls playsInline preload="none" poster={CUSTOMER_CLIP.poster} className="block h-auto w-full" data-testid="home-clip">
            <source src={CUSTOMER_CLIP.src} type="video/mp4" />
            <track kind="captions" src={CUSTOMER_CLIP.captions} srcLang="en" label="English" default />
          </video>
        </div>
        <figcaption className="mt-3 text-sm leading-relaxed text-ink-500">{CUSTOMER_CLIP.credit}</figcaption>
      </figure>
    );
  }

  return (
    <figure className="relative mx-auto w-full max-w-[27rem]">
      <div
        ref={frame}
        className="relative overflow-hidden rounded-3xl border border-clay-100 bg-cream-100 shadow-warm"
        style={{ aspectRatio: `${HOME_FILM.width} / ${HOME_FILM.height}` }}
        data-testid="home-film"
      >
        {/* The still under the film: a lazy picture, where a poster attribute would be fetched with the page. */}
        <Image
          src={HOME_FILM.poster(variant)}
          alt=""
          fill
          sizes="(min-width: 480px) 432px, 100vw"
          className="object-cover"
        />
        <video
          ref={video}
          src={src ?? undefined}
          muted
          loop
          playsInline
          preload="none"
          aria-label={HOME_FILM.description}
          className="absolute inset-0 h-full w-full object-cover"
          onPlay={() => {
            setPlaying(true);
            if (!counted.current.play) {
              counted.current.play = true;
              track("film_play", { variant });
            }
          }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) => {
            // It loops, so "ended" never fires: the last second is the finish line.
            if (!counted.current.complete && event.currentTarget.currentTime >= HOME_FILM.seconds - 1) {
              counted.current.complete = true;
              track("film_complete", { variant });
            }
          }}
        />
      </div>
      {/* Under the film, not on it: every corner of the picture has words in it. */}
      <div className="mt-3 flex items-start gap-3">
        <figcaption className="min-w-0 flex-1 text-sm leading-relaxed text-ink-500">
          Twenty seconds, no sound: a real note, and the draft StoryLoop wrote from it. The draft is a starting point. You read it, change
          what is not right, and share it where you always do.
        </figcaption>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause the film" : "Play the film"}
          data-testid="home-film-toggle"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-clay-200 bg-white text-ink-700 transition-colors hover:border-clay-400 hover:text-ink-900"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
        </button>
      </div>
    </figure>
  );
}
