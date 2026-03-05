# AGENTS.md

This file provides guidance for AI coding agents operating in this repository.

## Project Overview

This is a **Raycast extension** called "Logos" — a single-command extension written in
TypeScript that creates/appends notes (compatible with Obsidian vaults). The entire
application logic lives in `src/memorize.ts`. It uses `@raycast/api` for the Raycast
integration and Node.js built-in modules for file I/O.

## Build / Lint / Test Commands

All build tooling is provided by the `ray` CLI (Raycast's bundled toolchain).

| Task             | Command            | Notes                              |
| ---------------- | ------------------ | ---------------------------------- |
| Development mode | `npm run dev`      | Hot-reload via `ray develop`       |
| Production build | `npm run build`    | `ray build`                        |
| Lint             | `npm run lint`     | `ray lint` — ESLint v9 flat config |
| Lint (auto-fix)  | `npm run fix-lint` | `ray lint --fix`                   |
| Install deps     | `npm install`      | Uses npm (lockfile v3)             |
| Publish          | `npm run publish`  | Publishes to Raycast Store         |

### Tests

There is **no test framework** configured. No test files, no test runner, and no test
script exist. If you add tests, use a framework compatible with the Raycast ecosystem
(e.g., vitest) and add a `test` script to `package.json`. Run a single test with:
`npx vitest run src/path/to/file.test.ts`

## Project Structure

```
logos/
├── src/
│   └── memorize.ts        # Single command — all application logic
├── assets/
│   └── extension-icon.png
├── package.json           # Manifest (includes Raycast command definitions)
├── tsconfig.json          # Strict TypeScript config
├── eslint.config.js       # ESLint v9 flat config (extends @raycast/eslint-config)
├── .prettierrc            # Prettier config
├── raycast-env.d.ts       # Auto-generated types from manifest — DO NOT EDIT
└── CHANGELOG.md
```

## Code Style Guidelines

### Formatting (Prettier)

- **Print width:** 120 characters
- **Quotes:** Double quotes (`"`) — not single quotes
- **Semicolons:** Yes (Prettier default)
- **Tab width:** 2 spaces (Prettier default)
- **Trailing commas:** All (Prettier default)

Run `npm run fix-lint` to auto-fix formatting and lint issues.

### Imports

- Use **named imports** from packages, not namespace imports:

  ```typescript
  // Good
  import { showHUD, getPreferenceValues } from "@raycast/api";
  import { existsSync, writeFileSync } from "fs";

  // Bad
  import * as fs from "fs";
  ```

- Import Node.js built-ins by **bare name** (`"fs"`, `"path"`), not with the
  `node:` prefix.
- Order: external packages first, then Node.js built-ins.

### Naming Conventions

| Construct              | Convention | Example                                       |
| ---------------------- | ---------- | --------------------------------------------- |
| Interfaces             | PascalCase | `Preferences`, `Arguments`                    |
| Functions              | camelCase  | `formatDate`, `processTemplate`               |
| Variables / constants  | camelCase  | `notesDir`, `filePath`                        |
| Default export command | camelCase  | `export default async function memorize(...)` |

### Type Usage

- Prefer `interface` over `type` for object shapes.
- Use explicit type parameters with Raycast APIs:
  ```typescript
  const prefs = getPreferenceValues<Preferences>();
  ```
- TypeScript **strict mode** is enabled — do not use `any` unless absolutely
  necessary. Handle `null`/`undefined` explicitly.
- Use typed tuples where appropriate: `const replacements: [RegExp, string][] = [...]`

### Code Organization Within a File

Structure files in this order, separated by banner comments:

```typescript
// ---------------------------------------------------------------------------
// Types / Interfaces
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main Command (default export at bottom)
// ---------------------------------------------------------------------------
```

### Error Handling

- Relies on Raycast's built-in error handling for uncaught exceptions. Do not
  wrap everything in try/catch unless you need a custom message via `showHUD`.
- Use **defensive checks** before file operations (`existsSync`, etc.).
- Use **nullish coalescing** for optional values:
  ```typescript
  process.env.HOME ?? "~";
  tags?.trim();
  ```

### Async Patterns

- The command entry point must be `async` (required by Raycast for `showHUD`).
- File I/O uses **synchronous** Node.js APIs (`readFileSync`, `writeFileSync`,
  `appendFileSync`) — this is acceptable for a Raycast command (short-lived,
  single-user process).

### Other Conventions

- No external date libraries — use `Intl.DateTimeFormat` and custom formatting.
- Template variables use `{{mustache}}` syntax (Obsidian-compatible).
- Use `.replace()` with regex for string processing.
- Use arrow functions for small inline operations; use named `function`
  declarations for top-level helpers.
- Tilde expansion: `.replace(/^~/, process.env.HOME ?? "~")`.

## ESLint Configuration

ESLint v9 flat config (`eslint.config.js`) extends `@raycast/eslint-config`:
`@eslint/js` recommended, `typescript-eslint` recommended, `@raycast/eslint-plugin`
(warns on non-title-case, prefers ellipsis over `...`), and `eslint-config-prettier`.
No custom rule overrides are applied.

## Important Files

- **`raycast-env.d.ts`** — Auto-generated from the `package.json` manifest.
  Never edit this file manually; it provides global types for `Preferences` and
  `Arguments` namespaces.
- **`package.json`** — Contains Raycast-specific manifest fields (`commands`,
  `preferences`, `arguments`) in addition to standard npm fields. Changes to
  command definitions here regenerate `raycast-env.d.ts`.
