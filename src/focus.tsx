import { List, ActionPanel, Action, getPreferenceValues, Icon, Color, useNavigation } from "@raycast/api";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { useState, useCallback } from "react";
import { Preferences, formatDate, getFrontmatterEnd, findSeparatorIndex } from "./shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskEntry {
  id: string;
  lineIndex: number;
  done: boolean;
  duration: string | null;
  text: string;
  raw: string;
}

// ---------------------------------------------------------------------------
// Task parsing
// ---------------------------------------------------------------------------

const TASK_PATTERN = /^- \[([ x])\]\s*(?:\*\(([^)]*)\)\*\s*)?(.+)$/;

/**
 * Parse today's daily note and extract all task entries from above the separator.
 */
function parseTasks(content: string): TaskEntry[] {
  const lines = content.split("\n");
  const contentStart = getFrontmatterEnd(lines);
  const sepIdx = findSeparatorIndex(lines, contentStart);

  // Only look at lines above the separator (the task zone)
  const taskZoneEnd = sepIdx !== -1 ? sepIdx : lines.length;
  const tasks: TaskEntry[] = [];

  for (let i = contentStart; i < taskZoneEnd; i++) {
    const match = lines[i].match(TASK_PATTERN);
    if (!match) continue;

    tasks.push({
      id: `task-${i}`,
      lineIndex: i,
      done: match[1] === "x",
      duration: match[2] ?? null,
      text: match[3].trim(),
      raw: lines[i],
    });
  }

  return tasks;
}

// ---------------------------------------------------------------------------
// File mutation helpers
// ---------------------------------------------------------------------------

function resolveFilePath(prefs: Preferences, now: Date): string {
  const filename = formatDate(prefs.filenameTemplate, now) + ".md";
  const notesDir = prefs.notesDirectory.replace(/^~/, process.env.HOME ?? "~");
  return join(notesDir, filename);
}

/**
 * Toggle a task's completion state in the daily note file.
 */
function toggleTask(filePath: string, lineIndex: number): void {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  if (lineIndex < 0 || lineIndex >= lines.length) return;

  const line = lines[lineIndex];
  if (line.includes("- [ ]")) {
    lines[lineIndex] = line.replace("- [ ]", "- [x]");
  } else if (line.includes("- [x]")) {
    lines[lineIndex] = line.replace("- [x]", "- [ ]");
  }

  writeFileSync(filePath, lines.join("\n"), "utf-8");
}

/**
 * Set or update the duration on a task line.
 * Duration is stored inline as `*(duration)*` right after the checkbox.
 */
function setDuration(filePath: string, lineIndex: number, duration: string): void {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  if (lineIndex < 0 || lineIndex >= lines.length) return;

  const line = lines[lineIndex];
  const match = line.match(TASK_PATTERN);
  if (!match) return;

  const checkbox = match[1] === "x" ? "- [x]" : "- [ ]";
  const text = match[3].trim();
  const durationPart = duration.trim() ? ` *(${duration.trim()})*` : "";

  lines[lineIndex] = `${checkbox}${durationPart} ${text}`;
  writeFileSync(filePath, lines.join("\n"), "utf-8");
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export default function focus() {
  const prefs = getPreferenceValues<Preferences>();
  const now = new Date();
  const filePath = resolveFilePath(prefs, now);

  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);

  // --- Read and parse ---
  let tasks: TaskEntry[] = [];
  let fileExists = false;

  if (existsSync(filePath)) {
    fileExists = true;
    const content = readFileSync(filePath, "utf-8");
    tasks = parseTasks(content);
  }

  const pending = tasks.filter((t) => !t.done);
  const completed = tasks.filter((t) => t.done);

  // --- Render ---
  return (
    <List navigationTitle="Focus" searchBarPlaceholder="Search today's tasks...">
      {tasks.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title={fileExists ? "No Tasks Yet" : "No Daily Note"}
          description={
            fileExists
              ? "Today's note has no tasks. Use Task to add one."
              : "No daily note found for today. Use Task or Memorize to create one."
          }
        />
      ) : (
        <>
          <List.Section title="To Do" subtitle={`${pending.length}`}>
            {pending.map((task) => (
              <TaskItem key={`${task.id}-${revision}`} task={task} filePath={filePath} onRefresh={refresh} />
            ))}
          </List.Section>
          <List.Section title="Done" subtitle={`${completed.length}`}>
            {completed.map((task) => (
              <TaskItem key={`${task.id}-${revision}`} task={task} filePath={filePath} onRefresh={refresh} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

// ---------------------------------------------------------------------------
// Task list item component
// ---------------------------------------------------------------------------

function TaskItem(props: { task: TaskEntry; filePath: string; onRefresh: () => void }) {
  const { task, filePath, onRefresh } = props;
  const { push } = useNavigation();

  const icon = task.done
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : { source: Icon.Circle, tintColor: Color.SecondaryText };

  const accessories: List.Item.Accessory[] = [];
  if (task.duration) {
    accessories.push({ tag: task.duration, icon: Icon.Clock });
  }

  return (
    <List.Item
      id={task.id}
      title={task.text}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title={task.done ? "Mark as Incomplete" : "Mark as Complete"}
            icon={task.done ? Icon.Circle : Icon.CheckCircle}
            onAction={() => {
              toggleTask(filePath, task.lineIndex);
              onRefresh();
            }}
          />
          <Action
            title="Set Duration"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => {
              push(
                <DurationInput
                  currentDuration={task.duration}
                  onSubmit={(duration) => {
                    setDuration(filePath, task.lineIndex, duration);
                    onRefresh();
                  }}
                />,
              );
            }}
          />
          <Action.CopyToClipboard
            title="Copy Task Text"
            content={task.text}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Duration input form (pushed as a sub-view)
// ---------------------------------------------------------------------------

function DurationInput(props: { currentDuration: string | null; onSubmit: (duration: string) => void }) {
  const { pop } = useNavigation();
  const [search, setSearch] = useState("");

  const presets = ["15min", "30min", "45min", "1h", "1h30m", "2h", "3h", "4h"];

  return (
    <List
      navigationTitle="Set Duration"
      searchBarPlaceholder="Enter duration (e.g. 30min, 1h)..."
      onSearchTextChange={setSearch}
      filtering={false}
    >
      {search.trim() ? (
        <List.Item
          title={search.trim()}
          icon={Icon.Clock}
          subtitle="Custom duration"
          actions={
            <ActionPanel>
              <Action
                title="Set Duration"
                onAction={() => {
                  props.onSubmit(search.trim());
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section title={props.currentDuration ? `Current: ${props.currentDuration}` : "Presets"}>
        {presets.map((preset) => (
          <List.Item
            key={preset}
            title={preset}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action
                  title="Set Duration"
                  onAction={() => {
                    props.onSubmit(preset);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {props.currentDuration ? (
        <List.Section title="Other">
          <List.Item
            title="Remove Duration"
            icon={Icon.Trash}
            actions={
              <ActionPanel>
                <Action
                  title="Remove Duration"
                  onAction={() => {
                    props.onSubmit("");
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
