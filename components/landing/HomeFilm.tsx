"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { track } from "@/lib/analytics/client";
import {
  CUSTOMER_CLIP,
  HERO_FILMS,
  HOME_FILM,
  filmFile,
  filmPoster,
  filmVariantForZone,
  isFilmFile,
  nextFilmIndex,
  type FilmCode,
  type FilmVariant,
} from "@/lib/home-film";

/**
 * The homepage film (lib/home-film.ts has what it is and is not).
 *
 * The poster is a small picture, and the film itself is only fetched when at
 * least 45% of the frame is on screen (in the hero, after it has stayed there
 * for HERO_FILM_DELAY_MS). It plays without sound and stops when
 * scrolled away. Somebody who asked their device for less motion or less data
 * gets the poster and a play button, and nothing more is fetched until they
 * press it.
 *
 * `inHero` (12 Nov 2026, HERO_SHOWS_FILM): on the first screen the poster is
 * the largest thing there, so it loads with priority; the frame is capped at
 * 62% of a phone's screen height so the headline and "Start free" stay on the
 * first screen, and the caption is one line.
 *
 * The still (13 Nov 2026): rendered on the server, straight away, for everybody,
 * and it is the New Zealand one, because most homepage visitors are in New
 * Zealand. Waiting for the browser to say which country left an empty cream
 * frame on the first screen. The visitor's own country's still replaces it only
 * when the film is not going to play by itself (reduced motion or Save-Data),
 * because then the still is what they read. The film file is still chosen by
 * country.
 *
 * Three films (18 Nov 2026), in the hero only: one on screen at a time, the
 * first film first and unchanged, three small labels under the frame. When a
 * film ends the next one plays; a tap on a label switches. Nothing of the
 * second and third films (file or still) is fetched until the first has played
 * or a label is tapped. With less motion or Save-Data a label shows that
 * film's still and nothing plays by itself. Outside the hero (HERO_SHOWS_FILM
 * false) it is the first film alone, looping, as before.
 */
/**
 * In the hero, how long the frame has to be on screen before the film is
 * fetched (13 Nov 2026). Every phone visitor sees the hero, and the small film
 * is about 1.7 MB: a visitor who leaves in a second should not pay for it. The
 * still, rendered on the server with priority, shows meanwhile. Pressing play
 * fetches it at once.
 */
const HERO_FILM_DELAY_MS = 1500;

/**
 * Film events, from the release's list (lib/analytics/events.ts): the film's
 * code and the country variant only. The typed helper is loaded when the first
 * event fires, not with the page, so the first screen carries none of it.
 */
function filmEvent(
  name: "film_play" | "film_complete" | "film_switch",
  meta: { variant: FilmVariant; film?: FilmCode; from?: FilmCode; to?: FilmCode },
) {
  import("@/lib/analytics/track-event")
    .then(({ trackEvent }) => {
      if (name === "film_switch") trackEvent(name, { variant: meta.variant, from: meta.from, to: meta.to });
      else trackEvent(name, { variant: meta.variant, film: meta.film });
    })
    .catch(() => {
      // The helper could not load (a stale tab after a release): the old path, the same values.
      track(name, { ...meta });
    });
}

export default function HomeFilm({ inHero = false }: { inHero?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  // Three films only in the hero; anywhere else the first film, alone, as before.
  const films = inHero ? HERO_FILMS : HERO_FILMS.slice(0, 1);
  const several = films.length > 1;
  // The film's country, known only in the browser.
  const [variant, setVariant] = useState<FilmVariant>("au");
  // The still: New Zealand's from the first frame, for everybody (see above).
  const [stillVariant, setStillVariant] = useState<FilmVariant>("nz");
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // Once the first film has played, the next film's still is fetched quietly, so the switch has no gap.
  const [warmNext, setWarmNext] = useState(false);
  const wantsPlay = useRef(true);
  // Plays by itself: false with less motion or Save-Data (then labels show stills only).
  const autoPlay = useRef(true);
  const small = useRef(false);
  // Once the film has been asked for, coming back on screen plays it straight away.
  const fetchStarted = useRef(false);
  const counted = useRef<{ play: Set<FilmCode>; complete: Set<FilmCode> }>({ play: new Set(), complete: new Set() });

  const film = films[index] ?? films[0];

  useEffect(() => {
    let zone = "";
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""; } catch { /* Australia */ }
    const chosen = filmVariantForZone(zone);
    setVariant(chosen);

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saving = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    wantsPlay.current = !calm && !saving;
    autoPlay.current = wantsPlay.current;
    // Not playing by itself: the still is what they read, so it is their country's.
    if (!wantsPlay.current) setStillVariant(chosen);

    const el = frame.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    small.current = window.innerWidth < 700;
    let wait: number | undefined;
    const start = () => {
      setSrc((current) => current ?? HOME_FILM.file(chosen, small.current));
      void video.current?.play().catch(() => {});
    };
    const watcher = new IntersectionObserver(
      ([entry]) => {
        const v = video.current;
        if (entry.isIntersecting) {
          // Fetch only when it is wanted: on screen, and allowed to play by itself.
          // In the hero, only once the frame has stayed on screen a moment (HERO_FILM_DELAY_MS).
          if (!wantsPlay.current) return;
          if (!inHero || fetchStarted.current) { fetchStarted.current = true; start(); return; }
          if (wait === undefined) {
            wait = window.setTimeout(() => {
              wait = undefined;
              if (!wantsPlay.current) return;
              fetchStarted.current = true;
              start();
            }, HERO_FILM_DELAY_MS);
          }
        } else {
          if (wait !== undefined) { window.clearTimeout(wait); wait = undefined; }
          v?.pause();
        }
      },
      { threshold: 0.45 },
    );
    watcher.observe(el);
    return () => {
      if (wait !== undefined) window.clearTimeout(wait);
      watcher.disconnect();
    };
  }, [inHero]);

  // A source that arrives after the frame came on screen starts by itself.
  useEffect(() => {
    if (src && wantsPlay.current) void video.current?.play().catch(() => {});
  }, [src]);

  /** Puts film `to` on screen. `play`: fetch and play it now; otherwise only its still. */
  const show = (to: number, play: boolean) => {
    indexRef.current = to;
    setIndex(to);
    setProgress(0);
    setPlaying(false);
    if (play) {
      wantsPlay.current = true;
      fetchStarted.current = true;
      setSrc(filmFile(films[to], variant, small.current || window.innerWidth < 700));
    } else {
      wantsPlay.current = false;
      video.current?.pause();
      setSrc(null);
    }
  };

  const choose = (to: number) => {
    const from = indexRef.current;
    if (to === from) {
      // The film already on: play it if it is paused and may play.
      const v = video.current;
      if (autoPlay.current && v && src && v.paused) {
        wantsPlay.current = true;
        void v.play().catch(() => {});
      }
      return;
    }
    filmEvent("film_switch", { variant, from: films[from].code, to: films[to].code });
    show(to, autoPlay.current);
  };

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (!src) {
      // Pressed play: fetched at once, whatever the wait.
      wantsPlay.current = true;
      fetchStarted.current = true;
      setSrc(filmFile(film, variant, window.innerWidth < 700));
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

  // The still under the film: the first film's is the server's New Zealand one (see above);
  // a later film's is the visitor's own country's, fetched only once that film is chosen.
  const still = index === 0 ? HOME_FILM.poster(stillVariant) : filmPoster(film, variant);
  const upNext = films[nextFilmIndex(index, films.length)];

  return (
    <figure
      className={
        inHero
          ? // 4:5, so a width of 0.8 x the height cap. svh: the screen with the browser's bars showing.
            // On a laptop the cap leaves room for the labels too, so they stay on the first screen.
            "animate-fade-up-1 relative mx-auto w-[min(100%,27rem,calc(62svh_*_0.8))] min-w-0 lg:w-[min(100%,27rem,calc((100svh_-_14.5rem)_*_0.8))]"
          : "relative mx-auto w-full max-w-[27rem]"
      }
      data-placement={inHero ? "hero" : "how-it-works"}
    >
      <div
        ref={frame}
        className="relative overflow-hidden rounded-3xl border border-clay-100 bg-cream-100 shadow-warm"
        style={{ aspectRatio: `${HOME_FILM.width} / ${HOME_FILM.height}` }}
        data-testid="home-film"
        data-film={film.code}
      >
        {/* The still under the film: a lazy picture, where a poster attribute would be fetched with the page.
            In the hero it is the largest thing on the first screen, so there it loads first. */}
        <Image
          src={still}
          alt=""
          fill
          priority={inHero && index === 0}
          sizes="(min-width: 480px) 432px, 100vw"
          className="object-cover"
          data-testid="home-film-still"
          data-variant={index === 0 ? stillVariant : variant}
        />
        {/* The next film's still, fetched once the first film has played (never with the page). */}
        {several && warmNext && nextFilmIndex(index, films.length) !== 0 && (
          <Image src={filmPoster(upNext, variant)} alt="" fill sizes="(min-width: 480px) 432px, 100vw" className="pointer-events-none object-cover opacity-0" aria-hidden="true" />
        )}
        <video
          ref={video}
          src={src ?? undefined}
          muted
          loop={!several}
          playsInline
          preload="none"
          aria-label={film.description}
          className="absolute inset-0 h-full w-full object-cover"
          onPlay={() => {
            setPlaying(true);
            if (!counted.current.play.has(film.code)) {
              counted.current.play.add(film.code);
              filmEvent("film_play", { variant, film: film.code });
            }
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            // The next film plays by itself only for somebody whose device allows motion.
            if (several && autoPlay.current) show(nextFilmIndex(indexRef.current, films.length), true);
          }}
          onTimeUpdate={(event) => {
            const v = event.currentTarget;
            // Only this film's own file counts (a switch can report the last film's time once).
            if (several && !isFilmFile(film, v.currentSrc)) return;
            if (several) setProgress(Math.min(1, v.currentTime / film.seconds));
            // The first film loops outside the hero, so "ended" never fires there: the last second is the finish line.
            if (!counted.current.complete.has(film.code) && v.currentTime >= film.seconds - 1) {
              counted.current.complete.add(film.code);
              filmEvent("film_complete", { variant, film: film.code });
              if (several) setWarmNext(true);
            }
          }}
        />
      </div>
      {several && (
        <div className="mt-3 grid grid-cols-3 gap-1.5" role="group" aria-label="Choose a film" data-testid="home-film-labels">
          {films.map((f, i) => (
            <button
              key={f.code}
              type="button"
              onClick={() => choose(i)}
              aria-pressed={i === index}
              data-testid={`home-film-label-${f.code}`}
              // A 320px phone gives each label about 90px: 12px type keeps "From a photo" on one line there.
              // The bottom padding keeps the words clear of the progress line, even if a label ever wraps.
              className={`relative flex min-h-[44px] items-center justify-center overflow-hidden rounded-xl px-1 pb-2 text-center text-[12px] font-semibold leading-tight transition-colors min-[360px]:text-[13px] ${
                i === index ? "bg-cream-100 text-ink-900" : "text-ink-500 hover:bg-cream-50 hover:text-ink-800"
              }`}
            >
              {f.label}
              {/* How far the film on screen has got: a thin line along the bottom of its label. */}
              <span aria-hidden="true" className="absolute inset-x-2 bottom-1 h-[3px] overflow-hidden rounded-full bg-clay-100">
                <span
                  className="block h-full origin-left rounded-full bg-clay-700 transition-transform duration-300 ease-linear motion-reduce:transition-none"
                  style={{ transform: `scaleX(${i === index ? progress : 0})` }}
                />
              </span>
            </button>
          ))}
        </div>
      )}
      {/* Under the film, not on it: every corner of the picture has words in it. */}
      <div className={`${several ? "mt-2" : "mt-3"} flex items-start gap-3`}>
        {inHero ? (
          <figcaption className="min-w-0 flex-1 self-center text-sm leading-snug text-ink-500" data-testid="home-film-caption">
            {film.caption}
          </figcaption>
        ) : (
          <figcaption className="min-w-0 flex-1 text-sm leading-relaxed text-ink-500">
            Twenty seconds, no sound: a real note, and the draft StoryLoop wrote from it. The draft is a starting point. You read it, change
            what is not right, and share it where you always do.
          </figcaption>
        )}
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
