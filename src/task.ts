import { LaunchProps, getPreferenceValues, showHUD } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join } from "path";
import { Preferences, formatDate, processTemplate } from "./shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Arguments {
  text: string;
  duration?: string;
}

// ---------------------------------------------------------------------------
// Todo line building
// ---------------------------------------------------------------------------

function buildTodoLine(text: string, duration?: string): string {
  const done = text.startsWith("!");
  const cleanText = done ? text.slice(1).trim() : text.trim();
  const checkbox = done ? "- [x]" : "- [ ]";
  const durationPart = duration?.trim() ? ` *(${duration.trim()})*` : "";

  return `${checkbox}${durationPart} ${cleanText}`;
}

// ---------------------------------------------------------------------------
// Separator helpers
// ---------------------------------------------------------------------------

const SEPARATOR = "---";

/**
 * Detect YAML frontmatter and return the line index after the closing `---`.
 * Returns 0 if no frontmatter is present.
 */
function getFrontmatterEnd(lines: string[]): number {
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
function findSeparatorIndex(lines: string[], startFrom = 0): number {
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].trim() === SEPARATOR) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export default async function task(props: LaunchProps<{ arguments: Arguments }>) {
  const prefs = getPreferenceValues<Preferences>();
  const { text, duration } = props.arguments;

  const now = new Date();

  // --- Resolve filename & path ---
  const filename = formatDate(prefs.filenameTemplate, now) + ".md";
  const notesDir = prefs.notesDirectory.replace(/^~/, process.env.HOME ?? "~");
  const filePath = join(notesDir, filename);

  // --- Ensure directory exists ---
  if (!existsSync(notesDir)) {
    mkdirSync(notesDir, { recursive: true });
  }

  // --- Build todo entry ---
  const todoLine = buildTodoLine(text, duration);

  // --- Create or update ---
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

    // Ensure the content ends with a newline before appending
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }
    if (content.length > 0) {
      content += "\n";
    }

    content += todoLine + "\n\n" + SEPARATOR + "\n";
    writeFileSync(filePath, content, "utf-8");
  } else {
    // Existing daily note — insert todo before the separator
    const existing = readFileSync(filePath, "utf-8");
    const lines = existing.split("\n");
    const contentStart = getFrontmatterEnd(lines);
    const sepIdx = findSeparatorIndex(lines, contentStart);

    if (sepIdx !== -1) {
      // Insert the todo line before the separator
      // Ensure there's a blank line between the last todo and the separator
      const beforeSep = lines.slice(0, sepIdx);
      const afterSep = lines.slice(sepIdx);

      // Remove trailing blank lines before separator to normalize
      while (beforeSep.length > 0 && beforeSep[beforeSep.length - 1].trim() === "") {
        beforeSep.pop();
      }

      beforeSep.push(todoLine);
      beforeSep.push(""); // blank line before separator

      const newContent = [...beforeSep, ...afterSep].join("\n");
      writeFileSync(filePath, newContent, "utf-8");
    } else {
      // No separator found — existing content is treated as notes below the separator
      // Rewrite: todo on top, then separator, then existing content
      let newContent = todoLine + "\n\n" + SEPARATOR + "\n";
      if (existing.trim().length > 0) {
        // Ensure existing content starts cleanly after the separator
        const trimmedExisting = existing.startsWith("\n") ? existing : "\n" + existing;
        newContent = todoLine + "\n\n" + SEPARATOR + trimmedExisting;
      }
      writeFileSync(filePath, newContent, "utf-8");
    }
  }

  // --- Feedback ---
  const donePrefix = text.startsWith("!") ? " (done)" : "";
  if (created) {
    await showHUD(`🔵 New daily note created with task${donePrefix}`);
  } else {
    await showHUD(`🟢 Task added${donePrefix}`);
  }
}
