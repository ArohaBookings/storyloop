"use client";

import { useEffect, useState } from "react";
import ProofChip from "@/components/buyer/ProofChip";
import type { NoteProof } from "@/lib/buyer-proof";

/**
 * The finished example in the visitor's own curriculum: Te Whāriki for a New
 * Zealand time zone, the EYLF for everyone else (the same rule as the
 * homepage's proof card, lib/hero-proofs.ts). The page is built ahead of
 * time, so it renders the Australian card and swaps after it loads.
 */
export default function VisitorProof({ au, nz }: { au: NoteProof; nz: NoteProof }) {
  const [proof, setProof] = useState(au);
  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      if (zone === "Pacific/Auckland" || zone === "Pacific/Chatham") setProof(nz);
    } catch {
      /* keep the Australian card */
    }
  }, [nz]);
  return <ProofChip proof={proof} />;
}
