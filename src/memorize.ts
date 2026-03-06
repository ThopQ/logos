import { LaunchProps, getPreferenceValues, showHUD } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync } from "fs";
import { join } from "path";
import { Preferences, formatDate } from "./shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Arguments {
  text: string;
  tags?: string;
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
