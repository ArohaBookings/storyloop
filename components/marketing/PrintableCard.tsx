"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Download } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { PRINTABLES, PRINTABLE_FRAMEWORK, type PrintableKey } from "@/lib/printables";

export { PRINTABLES, type PrintableKey };

const CURRICULUM = { NZ: "Te Whāriki", AU: "EYLF V2.0", UK: "EYFS", IE: "Aistear" } as const;
const OPENED_KEY = "storyloop_printable_opened";

/**
 * A free printable on a guide, and what happens after the download (19 Oct 2026).
 *
 * Why it changed: Facebook and Google visitors tapped "Download the PDF" and
 * were gone (16 Facebook landings in 5 days, most within 1 to 42 s). A bare
 * `download` link is ignored by the Facebook in-app browser and by iPhones,
 * which open the PDF in place of the page, so the guide and its demo
 * disappeared. Now the PDF opens in a new tab, every download is counted (a
 * funnel event, so it is recorded without the analytics cookie), and a next
 * step appears beside the card. It is remembered for the tab, so someone who
 * comes back from the PDF still sees it.
 */
export default function PrintableCard({ which, compact = false }: { which: PrintableKey; compact?: boolean }) {
  const p = PRINTABLES[which];
  // "fresh": just clicked. "earlier": remembered from before in this tab.
  const [opened, setOpened] = useState<false | "fresh" | "earlier">(false);
  const [tryHref, setTryHref] = useState(`/try?sheet=${which}`);
  // The blank templates are A4 portrait; the cheat sheets are 4:5.
  const a4 = "a4" in p && p.a4;
  const height = compact ? 90 : 120;
  const width = Math.round(height * (a4 ? 0.707 : 0.8));
  const curriculum = CURRICULUM[PRINTABLE_FRAMEWORK[which]];

  useEffect(() => {
    // A page with its own demo keeps the reader here; otherwise /try has one.
    if (document.getElementById("try")) setTryHref("#try");
    try {
      if (window.sessionStorage.getItem(`${OPENED_KEY}_${which}`)) setOpened("earlier");
    } catch {
      /* storage blocked: the panel still shows after a click */
    }
  }, [which]);

  const onDownload = () => {
    track("printable_download", { which });
    setOpened("fresh");
    try {
      window.sessionStorage.setItem(`${OPENED_KEY}_${which}`, "1");
    } catch {
      /* storage blocked */
    }
  };

  return (
    <div className="min-w-0">
      <div className={`flex min-w-0 items-center gap-4 rounded-3xl border border-clay-200 bg-white p-4 ${compact ? "" : "md:p-5"}`}>
        <a
          href={p.href}
          download
          target="_blank"
          rel="noopener"
          onClick={onDownload}
          className="block shrink-0"
          data-track={`printable_${which}`}
          aria-label={`Download: ${p.title} (PDF, opens in a new tab)`}
        >
          <Image src={p.preview} alt={p.alt} width={width} height={height} className="rounded-lg border border-clay-100 shadow-sm" />
        </a>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-clay-700">Free printable</p>
          <p className="mt-1 font-display text-lg font-bold leading-snug text-ink-900">{p.title}</p>
          <a
            href={p.href}
            download
            target="_blank"
            rel="noopener"
            onClick={onDownload}
            data-track={`printable_${which}`}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900"
          >
            <Download className="h-4 w-4" /> Download the PDF
          </a>
          {"docx" in p && p.docx && (
          <a
            href={p.docx}
            download
            onClick={() => {
              track("printable_download", { which, format: "docx" });
              setOpened("fresh");
            }}
            data-track={`printable_docx_${which}`}
            className="ml-3 inline-flex items-center gap-1 text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900"
          >
            Word
          </a>
        )}
        <span className="ml-2 inline-block whitespace-nowrap text-xs text-ink-500">No sign-up</span>
        </div>
      </div>
      {opened && (
        <div
          role="status"
          className="mt-3 rounded-3xl border border-sage-200 bg-sage-50 p-4 text-[15px] leading-relaxed text-ink-800 md:p-5"
        >
          <p>
            <strong>{opened === "fresh" ? "Your printable is opening." : "Got the printable?"}</strong> Want the other half? Type one thing a child did today and StoryLoop turns it into
            a learning story with these {curriculum} links. About a minute, no signup.
          </p>
          <a
            href={tryHref}
            className="btn-primary mt-3 inline-flex justify-center"
            data-track={`printable_next_${which}`}
          >
            Try it with a note <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
