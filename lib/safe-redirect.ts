const DEFAULT_REDIRECT = "/dashboard";

export function safeRedirectPath(value: string | null | undefined, fallback = DEFAULT_REDIRECT) {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("\0")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://storyloop.space");
    if (parsed.origin !== "https://storyloop.space") return fallback;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    // Review 1, R1-02: dot segments can collapse to a protocol-relative path
    // ("/.//evil.example" -> "//evil.example"), which a browser reads as
    // another site. Anything that starts like that, or holds a backslash,
    // goes to the fallback.
    if (path.startsWith("//") || path.startsWith("/\\") || path.includes("\\") || /^\/%2f/i.test(path) || /^\/%5c/i.test(path)) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
