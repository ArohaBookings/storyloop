"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { track } from "@/lib/analytics/client";

/** A template shown in full, with one button that copies it as plain text. */
export default function CopyTemplate({ id, label, text }: { id: string; label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      track("cta_click", { name: `template_copy_${id}` });
    } catch {
      /* clipboard blocked: the text is on screen to select by hand */
    }
  };
  return (
    <div className="overflow-hidden rounded-3xl border border-clay-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-clay-100 bg-cream-50 px-5 py-3">
        <p className="text-sm font-bold text-ink-900">{label}</p>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-clay-700 px-4 text-sm font-semibold text-paper transition-colors hover:bg-clay-800"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy template"}
        </button>
      </div>
      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap px-5 py-4 font-mono text-[13px] leading-relaxed text-ink-800">{text}</pre>
    </div>
  );
}
