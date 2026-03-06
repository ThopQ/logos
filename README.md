# Logos (Raycast Daily Note Extension)

Capture what matters before it slips away.

Logos is a Raycast extension for people who think in fragments — stray ideas, fleeting observations, half-formed tasks — and want a dead-simple way to pin them down. It writes timestamped notes and tasks into daily markdown files that play nicely with Obsidian (or any markdown-based system you already use).

No databases. No syncing. No accounts. Just plain text files on your machine.

## Why Logos?

Most note-taking tools want you to live inside them. Logos doesn't. It stays out of your way until you have something worth remembering, then disappears the moment you're done.

The whole idea is speed. You hit a hotkey, type your thought, and you're back to whatever you were doing. Your note lands in today's daily file with a timestamp, ready to review later. That's it.

If you use Obsidian, your notes show up in your vault automatically — no plugins, no configuration dance. If you don't use Obsidian, the files are still just markdown. Open them with whatever you like.

## Commands

### Memorize — Capture a note

Type a thought, optionally tag it, and it gets appended to today's daily note with a timestamp. The whole interaction takes about two seconds.

Tags are space-separated and automatically prefixed with `#` if you forget. So `work meeting` becomes `#work #meeting` in the file.

### Task — Add a todo

Same speed, but for things you need to do. Tasks land as markdown checkboxes above a separator line in your daily note, keeping them visually distinct from your freeform notes below.

You can optionally attach a duration estimate (like `30min` or `2h`) so you have a rough sense of how your day is shaping up.

Prefix your task with `!` to log it as already complete — handy for tracking things you've already done.

### Reflect — Review today's notes

A searchable list of everything you've captured today. Each entry shows its timestamp, text, and tags. You can copy any note to your clipboard directly from the list.

Useful for end-of-day reviews or when you're trying to remember what that idea was from this morning.

### Focus — Manage today's tasks

A task manager view for your daily note. See what's pending, what's done, and what's overdue from the past week.

You can toggle task completion, set or update duration estimates, and copy task text — all without leaving Raycast. Overdue tasks from previous days surface automatically so nothing falls through the cracks.

## Setup

1. Install the extension from the Raycast Store
2. Set your **Notes Directory** — this is where daily files will be created (point it at your Obsidian vault if you use one)
3. Optionally customize the **Filename Template** — defaults to `YYYY-MM-DD_dddd` (e.g., `2026-03-06_Friday`)
4. Optionally set a **Template File** — a markdown file used as the starting point for new daily notes

### Filename Tokens

| Token  | Output            | Example  |
| ------ | ----------------- | -------- |
| `YYYY` | Full year         | `2026`   |
| `YY`   | Two-digit year    | `26`     |
| `MMMM` | Full month name   | `March`  |
| `MMM`  | Short month       | `Mar`    |
| `MM`   | Zero-padded month | `03`     |
| `DD`   | Zero-padded day   | `06`     |
| `dddd` | Full weekday      | `Friday` |
| `ddd`  | Short weekday     | `Fri`    |

Day and month names follow your system locale.

### Template Variables

If you use a template file, these variables get replaced when a new daily note is created:

| Variable          | Resolves to                                   |
| ----------------- | --------------------------------------------- |
| `{{title}}`       | Filename without `.md`                        |
| `{{date}}`        | Date formatted using your filename template   |
| `{{date:FORMAT}}` | Date with a custom format (same tokens above) |
| `{{time}}`        | Current time as `HH:mm`                       |
| `{{time:FORMAT}}` | Time with a custom format                     |

## How the Files Look

Logos keeps a simple structure in each daily note. Tasks go above a horizontal rule (`---`), timestamped notes go below it:

```markdown
- [ ] _(1h)_ Write project proposal
- [x] _(15min)_ Reply to Sarah's email
- [ ] Review pull request

---

**09:15** Had an idea about the onboarding flow — what if we skip the tutorial entirely? #product
**10:42** Meeting with design team went well. They're on board with the new direction. #meeting #design
**14:30** Need to look into that memory leak in the dashboard component #bug
```

Everything is plain markdown. Edit it by hand whenever you want — Logos won't break anything.
