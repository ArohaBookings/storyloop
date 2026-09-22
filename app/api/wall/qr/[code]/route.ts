import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { isWallCode, wallCardUrl } from "@/lib/wall-card";

/**
 * The QR square for a wall code, as SVG so it prints sharply at any size.
 *
 * It encodes a URL THIS ROUTE builds from a validated code. It never encodes
 * text supplied by the caller: a QR endpoint that encoded arbitrary input would
 * be a phishing-link generator hosted on our own domain, which is a gift to
 * anyone who found it.
 *
 * Error correction is set high because this square gets printed, blu-tacked
 * beside a painting, and brushed past by forty children a day.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isWallCode(code)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const svg = await QRCode.toString(wallCardUrl(code.toUpperCase(), process.env.NEXT_PUBLIC_APP_URL || undefined), {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    color: { dark: "#2B2119", light: "#FFFFFF" },
  });

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}
