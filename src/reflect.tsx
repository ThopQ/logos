import { List, ActionPanel, Action, getPreferenceValues, Icon } from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Preferences, formatDate } from "./shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NoteEntry {
  id: string;
  timestamp: string;
  text: string;
  tags: string[];
  raw: string;
}

// ---------------------------------------------------------------------------
// Entry parsing
// ---------------------------------------------------------------------------

/**
 * Parse the daily note content into individual timestamped entries.
 * Each entry starts with a bold timestamp like `**HH:MM**`.
 */
function parseEntries(content: string): NoteEntry[] {
  const lines = content.split("\n");
  const entries: NoteEntry[] = [];
  const entryPattern = /^\*\*(\d{2}:\d{2})\*\*\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(entryPattern);
    if (!match) continue;

    const timestamp = match[1];
    const body = match[2];

    // Separate text from tags — tags are #words at the end
    const tagPattern = /#\S+/g;
    const tagMatches = body.match(tagPattern) ?? [];

    // Remove tags from the text to get the clean body
    const text = body.replace(tagPattern, "").trim();

    entries.push({
      id: `entry-${i}`,
      timestamp,
      text,
      tags: tagMatches,
      raw: lines[i],
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export default function reflect() {
  const prefs = getPreferenceValues<Preferences>();
  const now = new Date();

  // --- Resolve today's daily note path ---
  const filename = formatDate(prefs.filenameTemplate, now) + ".md";
  const notesDir = prefs.notesDirectory.replace(/^~/, process.env.HOME ?? "~");
  const filePath = join(notesDir, filename);

  // --- Read and parse ---
  let entries: NoteEntry[] = [];
  let fileExists = false;

  if (existsSync(filePath)) {
    fileExists = true;
    const content = readFileSync(filePath, "utf-8");
    entries = parseEntries(content);
  }

  // --- Render ---
  return (
    <List navigationTitle="Reflect" searchBarPlaceholder="Search today's notes..." isShowingDetail={entries.length > 0}>
      {entries.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title={fileExists ? "No Entries Yet" : "No Daily Note"}
          description={
            fileExists
              ? "Today's note has no timestamped entries."
              : "No daily note found for today. Use Memorize to create one."
          }
        />
      ) : (
        entries.map((entry) => (
          <List.Item
            key={entry.id}
            id={entry.id}
            title={entry.text}
            accessories={[...entry.tags.map((tag) => ({ tag })), { text: entry.timestamp, icon: Icon.Clock }]}
            detail={<List.Item.Detail markdown={entry.raw} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Note Text" content={entry.text} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
