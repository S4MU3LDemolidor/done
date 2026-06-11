# FocusBar — Design Doc

Date: 2026-06-11
Status: Derived directly from the product spec provided by the user. The spec is treated as the approved design; this doc records the decisions it left open and how the prototype resolves them.

## What we're building

FocusBar: a 100% local macOS to-do app with (1) a Raycast-style floating quick-add bar on **Option+Space** that parses natural-language input and writes task JSON files, and (2) a main window task manager that watches `~/FocusBar/tasks/` and shows Today/Agenda/Completed/Profile views with XP, streaks, achievements, and confetti fireworks on completion.

Prototype priority (per spec): quick-add bar → Today view → checkbox + fireworks. Remaining screens after.

## Stack decision

**Tauri 2 + React + TypeScript + Tailwind CSS + canvas-confetti** (spec's recommended Option A).

- Rust toolchain was not installed on this machine; installed via rustup (user-space, minimal profile).
- Fallback considered: SwiftUI/AppKit (Option B). Rejected because the spec recommends A for iteration speed, and the visual spec (canvas-confetti, web-style chips) maps directly to a webview UI.

## Architecture

Two Tauri webview windows in one process:

1. **`main`** — the task manager. Standard decorated window, dark theme, 980×640 default.
2. **`quickadd`** — frameless, transparent, always-on-top, centered, ~600px wide, hidden at launch. Toggled by the global shortcut. Shown/hidden, never destroyed (instant appearance). On show: focus input, clear previous text. Escape or blur hides it.

### Rust side (thin shell)

- `tauri-plugin-global-shortcut`: registers `Alt+Space` → toggles the quickadd window visibility.
- `tauri-plugin-fs`: scoped to `$HOME/FocusBar/**` for read/write/watch from the frontend.
- A `notify`-based watcher (via the fs plugin's `watch`) on `~/FocusBar/tasks/` emits change events; the main window re-reads the directory on any event (simple, correct for prototype scale — re-reading ~hundreds of small JSON files is cheap).
- Window setup: quickadd uses `decorations: false`, `transparent: true`, `alwaysOnTop: true`, `skipTaskbar: true`, `visibleOnAllWorkspaces`, macOS vibrancy via `windowEffects` (hudWindow material) for the frosted-glass look.

### Frontend (all app logic)

- **Parser** (`src/lib/parser.ts`): pure function `parse(input) → {title, due, group}`. Split on commas; first segment = title; remaining segments classified — a segment that parses as a date (dd/mm, dd/mm/yyyy, hoje, amanhã, PT-BR weekday names) becomes `due`, the last non-date segment becomes `group`. Weekday names resolve to the *next* occurrence (today counts if it matches). dd/mm without year resolves to the next occurrence (this year, or next year if already past). All fields optional.
- **Store** (`src/lib/tasks.ts`): read/write task JSON files via fs plugin; one file per task at `~/FocusBar/tasks/<uuid>.json` matching the spec's schema exactly.
- **Gamification** (`src/lib/game.ts`): pure functions for XP (+10 complete, +5 on-time bonus), level thresholds (0, 100, 250, 500, 1000, 2000, doubling after), streak computation derived from `completedAt` timestamps of done tasks (no separate state file needed — recomputed from task data; survives restarts and stays consistent). Achievements state in `~/FocusBar/achievements.json` (unlock timestamps only; conditions evaluated from task data).
- **Views**: Today (default), per-group, Agenda (current week grouped by day), Completed, Profile. Sidebar with auto-populated groups and 🔥 streak.
- **Fireworks**: `canvas-confetti` (npm package, bundled — no CDN; app must work offline) fired at the checkbox's screen position; bigger burst when completed on/before due date.

## Data flow

quickadd window → parse → write `<uuid>.json` → fs watcher event → main window re-reads directory → UI updates. Completing a task rewrites its file (`done: true`, `completedAt`, `xp`); same watcher path updates everything (streak, XP, achievements are derived).

## Error handling

- Unparseable date segment → treated as part of group/ignored as date; never blocks saving.
- Corrupt/unreadable task file → skipped with console warning; app keeps working.
- Missing `~/FocusBar/tasks/` → created on first write and on app start.
- Copy in PT-BR, errors say what happened + what to do.

## Testing

- Vitest unit tests for the parser (date formats, weekdays, optional fields) and gamification math (XP, levels, streaks, achievement conditions) — this is where the logic lives.
- UI/integration verified by running `tauri dev` and exercising the app.

## Out of scope for prototype

Mac App Store packaging, signing/notarization, task editing UI (delete + complete only), recurring tasks, i18n beyond PT-BR.
