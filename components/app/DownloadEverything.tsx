import { Download, FileSpreadsheet, FileText } from "lucide-react";

/**
 * "Download everything" on History (12 Nov 2026): every saved story in one
 * file, as text to read or a CSV for a spreadsheet (app/api/stories/export).
 * Plain links, so it works before the page's scripts have loaded. With no
 * stories it says so instead of offering an empty file.
 */
export default function DownloadEverything({ count }: { count: number }) {
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
    <section aria-labelledby="download-everything-title" className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3" data-testid="download-everything">
      <p id="download-everything-title" className="flex items-center gap-2 text-sm font-semibold text-ink-700">
        <Download className="h-4 w-4 flex-none text-clay-700" />
        Download everything ({count === 1 ? "1 story" : `${count} stories`})
      </p>
      <div className="flex gap-2">
        <a href="/api/stories/export?format=txt" download className={link} data-track="history_download_txt" data-testid="download-txt">
          <FileText className="h-4 w-4" /> Text file
        </a>
        <a href="/api/stories/export?format=csv" download className={link} data-track="history_download_csv" data-testid="download-csv">
          <FileSpreadsheet className="h-4 w-4" /> Spreadsheet<span className="hidden sm:inline"> (CSV)</span>
        </a>
      </div>
    </section>
  );
}
