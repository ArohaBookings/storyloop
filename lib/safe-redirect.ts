const DEFAULT_REDIRECT = "/dashboard";

export function safeRedirectPath(value: string | null | undefined, fallback = DEFAULT_REDIRECT) {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("\0")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://storyloop.space");
    return parsed.origin === "https://storyloop.space"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
