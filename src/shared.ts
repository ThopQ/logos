// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Preferences {
  notesDirectory: string;
  filenameTemplate: string;
  templateFile?: string;
}

// ---------------------------------------------------------------------------
// Date formatting (locale-aware, no external deps)
// ---------------------------------------------------------------------------

export function formatDate(template: string, date: Date): string {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;

  const pad = (n: number, len = 2) => String(n).padStart(len, "0");

  const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
  const monthLong = new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short" }).format(date);

  // Order matters: longer tokens must be replaced before shorter ones
  const replacements: [RegExp, string][] = [
    [/YYYY/g, String(date.getFullYear())],
    [/YY/g, String(date.getFullYear()).slice(-2)],
    [/MMMM/g, monthLong],
    [/MMM/g, monthShort],
    [/MM/g, pad(date.getMonth() + 1)],
    [/M(?!M)/g, String(date.getMonth() + 1)],
    [/DD/g, pad(date.getDate())],
    [/D(?!D)/g, String(date.getDate())],
    [/dddd/g, weekdayLong],
    [/ddd/g, weekdayShort],
    [/HH/g, pad(date.getHours())],
    [/mm/g, pad(date.getMinutes())],
    [/ss/g, pad(date.getSeconds())],
  ];

  let result = template;
  for (const [pattern, value] of replacements) {
    result = result.replace(pattern, value);
  }
  return result;
}
