import { LaunchProps, getPreferenceValues, showHUD } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Preferences {
  notesDirectory: string;
  filenameTemplate: string;
  templateFile?: string;
}

interface Arguments {
  text: string;
  tags?: string;
}

// ---------------------------------------------------------------------------
// Date formatting (locale-aware, no external deps)
// ---------------------------------------------------------------------------

function formatDate(template: string, date: Date): string {
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

function processTemplate(template: string, filename: string, date: Date): string {
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

// ---------------------------------------------------------------------------
// Tag formatting
// ---------------------------------------------------------------------------

function formatTags(raw: string): string {
  return raw
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export default async function memorize(props: LaunchProps<{ arguments: Arguments }>) {
  const prefs = getPreferenceValues<Preferences>();
  const { text, tags } = props.arguments;

  const now = new Date();

  // --- Resolve filename & path ---
  const filename = formatDate(prefs.filenameTemplate, now) + ".md";
  const notesDir = prefs.notesDirectory.replace(/^~/, process.env.HOME ?? "~");
  const filePath = join(notesDir, filename);

  // --- Ensure directory exists ---
  if (!existsSync(notesDir)) {
    mkdirSync(notesDir, { recursive: true });
  }

  // --- Build note entry ---
  const time = formatDate("HH:mm", now);
  const tagSuffix = tags?.trim() ? " " + formatTags(tags) : "";
  const entry = `**${time}** ${text.trim()}${tagSuffix}`;

  // --- Create or append ---
  let created = false;

  if (!existsSync(filePath)) {
    // New daily note
    created = true;
    let content = "";

    // Apply template if configured
    if (prefs.templateFile) {
      const tplPath = prefs.templateFile.replace(/^~/, process.env.HOME ?? "~");
      if (existsSync(tplPath) && statSync(tplPath).isFile()) {
        const raw = readFileSync(tplPath, "utf-8");
        content = processTemplate(raw, filename, now);
      }
    }

    // Ensure the content ends with a newline before appending the entry
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }
    // Add a blank line separator if template had content
    if (content.length > 0) {
      content += "\n";
    }

    content += entry + "\n";
    writeFileSync(filePath, content, "utf-8");
  } else {
    // Existing daily note — append with blank line separator
    const existing = readFileSync(filePath, "utf-8");
    const separator = existing.length === 0 || existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
    appendFileSync(filePath, separator + entry + "\n", "utf-8");
  }

  // --- Feedback ---
  if (created) {
    await showHUD("🔵 New daily note created successfully");
  } else {
    await showHUD("🟢 Note added to daily note successfully");
  }
}
