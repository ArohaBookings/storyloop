"use client";

import { useState, type MouseEvent } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

/**
 * "Download everything" on History (12 Nov 2026): every saved story in one
 * file, as text to read or a CSV for a spreadsheet (app/api/stories/export).
 * Plain links, so it works before the page's scripts have loaded. Once they
 * have, a tap fetches the file first: a refusal (too many in an hour, signed
 * out) is then shown here in words, where a plain link would have saved the
 * error as a file on the phone. With no stories it says so instead of
 * offering an empty file.
 */
function fileNameFrom(disposition: string | null, fallback: string) {
  const match = /filename="([^"]+)"/.exec(disposition ?? "");
  return match ? match[1] : fallback;
}
export default function DownloadEverything({ count }: { count: number }) {
  const [busy, setBusy] = useState<"" | "txt" | "csv">("");
  const [problem, setProblem] = useState("");

  const download = async (event: MouseEvent<HTMLAnchorElement>, format: "txt" | "csv") => {
    if (typeof window === "undefined" || typeof URL.createObjectURL !== "function") return; // the plain link does it
    event.preventDefault();
    if (busy) return;
    setBusy(format); setProblem("");
    try {
      const response = await fetch(`/api/stories/export?format=${format}`, { credentials: "same-origin" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setProblem(
          response.status === 401
            ? "You have been signed out. Sign in again, then download."
            : typeof data.error === "string" ? data.error : "That did not download. Try again in a minute.",
        );
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameFrom(response.headers.get("Content-Disposition"), `storyloop-stories.${format}`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setProblem("That did not download. Check your connection and try again.");
    } finally {
      setBusy("");
    }
  };

  if (count === 0) {
    return (
      <p className="mb-6 flex items-center gap-2 text-sm text-ink-500" data-testid="download-everything-empty">
        <Download className="h-4 w-4 flex-none" />
        Nothing to download yet. Once you have saved a story, you can download every one here.
      </p>
    );
  }
  const link =
    "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-clay-200 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition-colors hover:border-clay-400 hover:text-ink-900 sm:flex-none";
  return (
    <section aria-labelledby="download-everything-title" className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3" data-testid="download-everything">
      <p id="download-everything-title" className="flex items-center gap-2 text-sm font-semibold text-ink-700">
        <Download className="h-4 w-4 flex-none text-clay-700" />
        Download everything ({count === 1 ? "1 story" : `${count} stories`})
      </p>
      <div className="flex gap-2">
        <a href="/api/stories/export?format=txt" download onClick={(event) => download(event, "txt")} aria-busy={busy === "txt"} className={link} data-track="history_download_txt" data-testid="download-txt">
          {busy === "txt" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Text file
        </a>
        <a href="/api/stories/export?format=csv" download onClick={(event) => download(event, "csv")} aria-busy={busy === "csv"} className={link} data-track="history_download_csv" data-testid="download-csv">
          {busy === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Spreadsheet<span className="hidden sm:inline"> (CSV)</span>
        </a>
      </div>
      {problem && (
        <p role="alert" className="rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-sm text-clay-800 sm:basis-full" data-testid="download-problem">
          {problem}
        </p>
      )}
    </section>
  );
}
