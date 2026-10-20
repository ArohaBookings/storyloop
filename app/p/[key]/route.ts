import { NextRequest, NextResponse } from "next/server";
import { PRINTABLE_KEYS } from "@/lib/printables";

/**
 * Short links printed as QR codes on the free printables (19 Oct 2026).
 *
 * A QR code holding the full /try?sheet=…&utm_… address is dense enough to be
 * hard to scan off a printed sheet, so the code holds storyloop.space/p/<sheet>
 * and this sends the scan on to the no-signup demo with the sheet and the
 * campaign tags, so a scan is counted as one.
 */
export function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  return params.then(({ key }) => {
    const target = new URL("/try", request.nextUrl.origin);
    if (PRINTABLE_KEYS.has(key)) {
      target.searchParams.set("sheet", key);
      target.searchParams.set("utm_source", "printable");
      target.searchParams.set("utm_medium", "qr");
      target.searchParams.set("utm_campaign", key);
    }
    return NextResponse.redirect(target, 307);
  });
}
