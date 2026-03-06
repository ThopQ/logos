import { getPreferenceValues } from "@raycast/api";

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

// ---------------------------------------------------------------------------
// Template processing (Obsidian-compatible variables)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Separator helpers (shared between task & focus commands)
// ---------------------------------------------------------------------------

const SEPARATOR = "---";

/**
 * Detect YAML frontmatter and return the line index after the closing `---`.
 * Returns 0 if no frontmatter is present.
 */
export function getFrontmatterEnd(lines: string[]): number {
  if (lines.length < 2 || !lines[0].trimEnd().startsWith(SEPARATOR)) return 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === SEPARATOR) return i + 1;
  }
  return 0; // unclosed frontmatter — treat as no frontmatter
}

/**
 * Find the index of the first `---` line in the content lines,
 * starting from `startFrom` to skip past YAML frontmatter.
 * Returns -1 if no separator is found.
 */
export function findSeparatorIndex(lines: string[], startFrom = 0): number {
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].trim() === SEPARATOR) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Template processing (Obsidian-compatible variables)
// ---------------------------------------------------------------------------

export function processTemplate(template: string, filename: string, date: Date): string {
  let result = template;

  // {{title}} -> filename without extension
  result = result.replace(/\{\{title\}\}/g, filename.replace(/\.md$/, ""));

  // {{date:FORMAT}} -> formatted date with custom format
  result = result.replace(/\{\{date:([^}]+)\}\}/g, (_, fmt) => formatDate(fmt, date));

  // {{date}} -> formatted date using the filename template (preference)
  const prefs = getPreferenceValues<Preferences>();
  result = result.replace(/\{\{date\}\}/g, formatDate(prefs.filenameTemplate, date));

  // {{time:FORMAT}} -> formatted time with custom format
  result = result.replace(/\{\{time:([^}]+)\}\}/g, (_, fmt) => formatDate(fmt, date));

  // {{time}} -> HH:mm
  result = result.replace(/\{\{time\}\}/g, formatDate("HH:mm", date));

  return result;
}
