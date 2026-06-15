export type ChildProfile = {
  id: string;
  name: string;
  age_group: string | null;
  interests: string[];
  developmental_focus: string | null;
  notes: string | null;
  whanau_aspirations: string | null;
  home_languages: string[];
  created_at: string;
  updated_at: string;
};

export function sanitiseShortText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function sanitiseStringList(value: unknown, limit = 12) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return Array.from(
    new Set(
      values
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, limit)
    )
  );
}
