import { LaunchProps, getPreferenceValues, showHUD } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync } from "fs";
import { join } from "path";
import { Preferences, formatDate, processTemplate } from "./shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Arguments {
  text: string;
  tags?: string;
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

    // Add separator so todos (from the Task command) can go above it
    content += "---\n";
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
