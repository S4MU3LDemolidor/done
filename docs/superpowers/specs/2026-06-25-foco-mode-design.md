# Foco — focus mode for Done

**Date:** 2026-06-25
**Status:** Approved, building

## Summary

A keyboard-first **focus mode**: lock onto one task in a small always-on-top
floating widget that stays visible while you work in other apps. Reachable from
anywhere via a global hotkey, with a set-your-own countdown timer, and wired
into Done's gamification (focus minutes, bonus XP, two new achievements).

This deepens the weakest part of Done today: it's great at *capturing* tasks but
gives no help *staying on one* once they're in Hoje.

## User flow

1. Press **⌥F** from anywhere (even inside another app).
2. A **mini focus picker** appears — a slim, always-on-top frosted bar, sibling
   of the ⌥Space quick-add. It lists open (not-done) tasks, **Hoje first**, then
   the rest. Type to fuzzy-filter, ↑/↓ to move, **Enter** to lock on.
3. The picker **morphs in place** into the **focus widget** (same window,
   resized): the one task + a countdown.
4. You tab back to your real work; the widget stays pinned on top.
5. Timer reaches zero → **gentle ding**; the widget offers **+5 min**,
   **concluir ✓**, or **sair (Esc)**.
6. Concluir → existing XP + fireworks **plus a focus bonus**; widget closes.

## The widget

- Task title + its **group color dot**.
- Countdown `mm:ss`, duration presets **15 / 25 / 45** + a custom field.
- Controls: **start/pause**, **+5 min**, **✓ concluir**, **Esc sair**.
- Always-on-top, draggable, remembers position. Dark frosted glass, #FF6363
  accent, hand-drawn glyphs (no emojis). PT-BR copy.
- Does **not** auto-hide on blur (unlike quick-add) — that's the whole point.

## Reward loop

- **Focus log** at `~/FocusBar/focus.json` (append-only array), matching the
  existing `groups.json` / `achievements.json` convention. Keeps the `Task`
  model clean; all stats/achievements derive from it.
  - Entry: `{ taskId, startedAt, focusedSeconds, completed }`.
  - `focusedSeconds` = actual seconds the timer ran (count-up), logged on
    concluir **or** sair (so partial sessions still count toward time/streak).
- **Bonus XP** (`FOCUS_BONUS = 5`) added when a task is completed *from focus
  mode*, on top of base + on-time.
- **"Tempo focado"** stat card in Perfil (total).
- **Two new achievements** (PT-BR tone):
  - `deep_work` — **"Trabalho profundo"** — uma sessão de foco de 25+ min.
  - `flow` — **"Em fluxo"** — foco em 3 dias seguidos.

## Architecture

### Windowing
One new always-on-top Tauri window labeled **`focus`** in `tauri.conf.json`
(modeled on `quickadd`: decorations off, transparent, alwaysOnTop, skipTaskbar,
hudWindow effect). Reuses the single-React-bundle-branched-on-label pattern in
`src/main.tsx`. The window starts as the picker and **resizes** into the widget
after a task is picked — one window, not two.

### Frontend
- `src/windows/Focus.tsx` — the focus window: `picker` ↔ `running` state machine,
  timer, controls.
- `src/main.tsx` — add the `focus` branch.
- Listens for a `focus:open` event (emitted on ⌥F) to reset to the picker,
  reload tasks, and refocus the input.
- On concluir/sair, writes the task + appends the focus session, then emits
  `focus:done` to `main` so Perfil/achievements update live (mirrors the
  existing `open-note` event pattern; no new file watcher needed).

### Pure logic (TDD, Vitest)
- `src/lib/focus.ts` (new) — session math:
  - `focusSecondsForDay`, `focusSecondsToday`, `totalFocusSeconds`
  - `focusDayStreak` (mirrors `streak` in game.ts)
  - `hasDeepWorkSession`
  - `formatTimer` (mm:ss) and `formatFocusTotal` (PT-BR "2h 15min")
- `src/lib/game.ts` — `FOCUS_BONUS`; `xpForCompletion(due, completedAt,
  fromFocus=false)`; `evaluateAchievements(tasks, sessions=[], now)` gains
  `deep_work` + `flow`.
- `src/lib/types.ts` — `FocusSession` interface; extend `AchievementId`.
- `src/lib/store.ts` — `loadFocusSessions`, `appendFocusSession`.

### Achievements plumbing
`types.ts` union → `achievements.ts` metadata → `glyphs.tsx` BADGE_COLOR +
badgeSymbol (two new hand-drawn badges) → `game.ts` evaluation →
`ProfileView.tsx` (already maps over `ACHIEVEMENT_IDS`).

### Rust / Tauri
- `lib.rs` — register **`Alt+F`** alongside `Alt+Space` / `Cmd+Alt+Space`;
  `toggle_focus(app)` shows + centers the `focus` window and emits `focus:open`.
  Distinguish the three shortcuts by key/modifier in the handler.
- `capabilities/default.json` — add `"focus"` to the `windows` list.

## Rejected alternatives

- **Two windows** (picker + widget): more moving parts than one morphing window.
- **Focus seconds on each Task**: makes daily/streak stats require scanning
  every task file; the append-only log is cleaner and matches convention.
- **Pomodoro-enforced cycles**: rejected in brainstorming for set-your-own
  countdown (discipline without the rigid 25/5 dogma).

## Out of scope (YAGNI)

Auto-chaining to the "next" task, break timers, per-day focus goals, time-block
scheduling, focus-from-list and add-and-focus entry points (global hotkey +
picker is the only entry point for v1).
