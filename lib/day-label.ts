/**
 * A date for a person to read, printed the same on the server and in the browser's first
 * render: in UTC until the page has mounted (local = false), then in the reader's own zone.
 * See lib/use-mounted.ts for why. Pure.
 */
export function dayLabel(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions,
  local: boolean,
  locale = "en-NZ",
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale, local ? options : { ...options, timeZone: "UTC" });
}
