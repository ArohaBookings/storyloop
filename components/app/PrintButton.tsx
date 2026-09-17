"use client";
import { Printer } from "lucide-react";

/** A print button for server-rendered pages, which cannot attach onClick. */
export default function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary text-sm">
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
