# Notes Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Markdown note-taking to Done — created via a `//` trigger in the quick-add bar, edited in a Tiptap-based editor with slash commands and `@` task/group linking, listed in a new "Notas" sidebar section, all inside the existing main window.

**Architecture:** Notes are individual JSON files at `~/FocusBar/notes/<uuid>.json`, mirroring the existing task store. Pure logic (note `//` parser, debounced autosave, `@` mention extraction) lives in `src/lib/` with Vitest tests. The editor is Tiptap (ProseMirror) inside a new `NotesView` in the existing main window; a custom Mention node renders link chips, and `@tiptap/suggestion` drives both the `/` block palette and the `@` link search. `linkedTasks`/`linkedGroups` are **derived from the editor body's mention nodes** on each save — single source of truth. The existing file watcher is extended to also watch `notes/`.

**Tech Stack:** Tauri 2, React 19, TypeScript, Tailwind v4, Vitest. New deps: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-mention`, `@tiptap/suggestion`, `tiptap-markdown`.

---

## Key design decisions (confirm at review)

1. **`//` parsing:** Everything after `//` (trimmed) is the note title. No comma parsing in note mode. Empty title after `//` → no-op (do nothing on Enter).
2. **Open-vs-create:** Title match is case-insensitive + accent-insensitive + trimmed. A match opens the existing note; otherwise create a new one.
3. **Body format:** Stored as a **Markdown string** (per spec) via `tiptap-markdown`. The custom Mention node serializes to tokens `@task:<uuid>` and `@group:<name>` so links survive a Markdown round-trip; the `@` parser reads the Tiptap JSON doc (not the markdown) to extract links.
4. **Links single source of truth:** `linkedTasks`/`linkedGroups` are recomputed from the body's mention nodes on every debounced save. The chip rows in the notes view add (insert a mention into the body) and remove (delete that mention node) — both flow through the body.
5. **No new Tauri window or capability:** everything is in the `main` window; `fs:scope` already covers `$HOME/FocusBar/**` and `fs:allow-watch` is granted.
6. **Suggestion popups** are rendered as our own absolutely-positioned React dropdowns (frosted glass, `#FF6363` selected) driven by the suggestion `clientRect` — no `tippy.js` dependency, to match app design.

---

## File structure

**Create:**
- `src/lib/notes.ts` — note types + `parseNoteInput`, `findNoteByTitle`, pure helpers
- `src/lib/notes.test.ts` — tests for the `//` parser + title matching
- `src/lib/debounce.ts` — generic `debounce` util
- `src/lib/debounce.test.ts` — tests for debounce
- `src/lib/mentions.ts` — `parseMentions(doc)` extracting `{ taskIds, groupNames }` from Tiptap JSON
- `src/lib/mentions.test.ts` — tests for mention extraction
- `src/lib/notesStore.ts` — fs I/O for notes (load/save/delete/watch)
- `src/windows/main/NotesView.tsx` — the editor view (title heading, link chip rows, Tiptap body)
- `src/windows/main/NotesSidebarSection.tsx` — the "Notas" list + right-click menu (rename/delete)
- `src/windows/main/editor/NoteEditor.tsx` — Tiptap `useEditor` wrapper + autosave wiring
- `src/windows/main/editor/SlashCommands.ts` — `/` block-command extension (suggestion-based)
- `src/windows/main/editor/SlashMenu.tsx` — the `/` palette dropdown UI
- `src/windows/main/editor/LinkMention.ts` — `@` Mention node config (chip) + markdown token serialization
- `src/windows/main/editor/MentionMenu.tsx` — the `@` search dropdown UI
- `src/components/glyphs.tsx` — add `NoteGlyph` (and reuse for sidebar/quick-add)

**Modify:**
- `src/lib/types.ts` — add `Note` interface
- `src/windows/QuickAdd.tsx` — detect `//`, note-mode preview chip, create/open note + navigate
- `src/windows/main/MainApp.tsx` — `View` union `+ { kind: "note"; id: string }`, notes state, watcher, render `NotesView`, navigation event from quick-add
- `src/windows/main/Sidebar.tsx` — add "Notas" section between Concluídas and Perfil
- `src/components/Icons.tsx` — add `NoteIcon` (sidebar) if a line icon is preferred over the filled glyph
- `package.json` — Tiptap deps (via npm install)

---

## Phase 1 — Note data model, store, and `//` parser (pure logic + fs)

### Task 1: Note type

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add the `Note` interface** to `src/lib/types.ts` (append after `Task`):

```ts
export interface Note {
  id: string;
  title: string;
  body: string; // markdown
  linkedTasks: string[]; // task uuids
  linkedGroups: string[]; // group names
  created: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

- [ ] **Step 2: Typecheck** — Run: `npm run build` — Expected: passes (no usage yet).
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Add Note type"`

---

### Task 2: `//` note-input parser (TDD)

**Files:**
- Create: `src/lib/notes.ts`, `src/lib/notes.test.ts`

- [ ] **Step 1: Write failing tests** in `src/lib/notes.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { parseNoteInput, findNoteByTitle } from "./notes";
import type { Note } from "./types";

describe("parseNoteInput", () => {
  test("detecta // e extrai o título", () => {
    expect(parseNoteInput("//ideias de vídeo")).toEqual({
      isNote: true,
      title: "ideias de vídeo",
    });
  });
  test("ignora espaços após //", () => {
    expect(parseNoteInput("//  reunião ")).toEqual({
      isNote: true,
      title: "reunião",
    });
  });
  test("texto sem // não é nota", () => {
    expect(parseNoteInput("comprar pão, sexta")).toEqual({ isNote: false });
  });
  test("// sem título é nota sem título (não cria)", () => {
    expect(parseNoteInput("//   ")).toEqual({ isNote: true, title: "" });
  });
});

describe("findNoteByTitle", () => {
  const notes = [
    { id: "a", title: "Ideias de Vídeo" },
    { id: "b", title: "Reunião" },
  ] as Note[];
  test("casa sem diferenciar maiúsculas/acentos", () => {
    expect(findNoteByTitle(notes, "ideias de video")?.id).toBe("a");
  });
  test("sem correspondência retorna undefined", () => {
    expect(findNoteByTitle(notes, "nova")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, verify fail** — Run: `npm test -- notes` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/lib/notes.ts`:

```ts
import type { Note } from "./types";

const norm = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function parseNoteInput(
  input: string,
): { isNote: true; title: string } | { isNote: false } {
  if (!input.startsWith("//")) return { isNote: false };
  return { isNote: true, title: input.slice(2).trim() };
}

export function findNoteByTitle(notes: Note[], title: string): Note | undefined {
  const t = norm(title);
  return notes.find((n) => norm(n.title) === t);
}
```

- [ ] **Step 4: Run, verify pass** — Run: `npm test -- notes` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add note input parser and title matcher (TDD)"`

---

### Task 3: Notes fs store

**Files:**
- Create: `src/lib/notesStore.ts`

(No tests — fs I/O mirrors `store.ts` which is verified by runtime; logic is trivial.)

- [ ] **Step 1: Implement** `src/lib/notesStore.ts`:

```ts
import { homeDir, join } from "@tauri-apps/api/path";
import {
  exists, mkdir, readDir, readTextFile, remove, watch, writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { Note } from "./types";

async function notesDir(): Promise<string> {
  return join(await homeDir(), "FocusBar", "notes");
}
async function ensureNotesDir(): Promise<void> {
  const dir = await notesDir();
  if (!(await exists(dir))) await mkdir(dir, { recursive: true });
}

export async function loadNotes(): Promise<Note[]> {
  await ensureNotesDir();
  const dir = await notesDir();
  const out: Note[] = [];
  for (const entry of await readDir(dir)) {
    if (!entry.isFile || !entry.name.endsWith(".json")) continue;
    try {
      const n = JSON.parse(await readTextFile(await join(dir, entry.name))) as Note;
      if (n.id && typeof n.title === "string") out.push(n);
    } catch (err) {
      console.warn(`Nota ilegível, ignorada: ${entry.name}`, err);
    }
  }
  return out;
}

export async function saveNote(note: Note): Promise<void> {
  await ensureNotesDir();
  const path = await join(await notesDir(), `${note.id}.json`);
  await writeTextFile(path, JSON.stringify(note, null, 2));
}

export async function deleteNote(id: string): Promise<void> {
  const path = await join(await notesDir(), `${id}.json`);
  if (await exists(path)) await remove(path);
}

export async function watchNotes(onChange: () => void): Promise<() => void> {
  await ensureNotesDir();
  return watch(await notesDir(), onChange, { delayMs: 250 });
}
```

- [ ] **Step 2: Typecheck** — Run: `npm run build` — Expected: passes.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Add notes fs store (load/save/delete/watch)"`

---

### Task 4: Debounce util (TDD)

**Files:**
- Create: `src/lib/debounce.ts`, `src/lib/debounce.test.ts`

- [ ] **Step 1: Write failing tests** in `src/lib/debounce.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest";
import { debounce } from "./debounce";

describe("debounce", () => {
  test("chama uma vez após o atraso", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 500);
    d("a"); d("b"); d("c");
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("c");
    vi.useRealTimers();
  });
  test("flush dispara imediatamente o pendente", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 500);
    d("x");
    d.flush();
    expect(fn).toHaveBeenCalledWith("x");
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run, verify fail** — Run: `npm test -- debounce` — Expected: FAIL.
- [ ] **Step 3: Implement** `src/lib/debounce.ts`:

```ts
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  flush: () => void;
  cancel: () => void;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: A | null = null;
  const d = (...args: A) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) fn(...lastArgs);
    }, ms);
  };
  d.flush = () => {
    if (timer) { clearTimeout(timer); timer = null; if (lastArgs) fn(...lastArgs); }
  };
  d.cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return d;
}
```

- [ ] **Step 4: Run, verify pass** — Run: `npm test -- debounce` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add debounce util (TDD)"`

---

### Task 5: `@` mention extractor (TDD)

**Files:**
- Create: `src/lib/mentions.ts`, `src/lib/mentions.test.ts`

The mention node (Task 11) stores attrs `{ kind: "task" | "group", ref: string, label: string }`. `parseMentions` walks a Tiptap JSON doc and collects unique task ids and group names.

- [ ] **Step 1: Write failing tests** in `src/lib/mentions.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { parseMentions } from "./mentions";

const doc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [
      { type: "text", text: "ver " },
      { type: "mention", attrs: { kind: "task", ref: "t1", label: "fazer site" } },
      { type: "text", text: " e " },
      { type: "mention", attrs: { kind: "group", ref: "Freela", label: "Freela" } },
      { type: "mention", attrs: { kind: "task", ref: "t1", label: "fazer site" } },
    ] },
  ],
};

describe("parseMentions", () => {
  test("extrai ids de tarefas e nomes de grupos, sem duplicar", () => {
    expect(parseMentions(doc)).toEqual({ taskIds: ["t1"], groupNames: ["Freela"] });
  });
  test("doc vazio retorna listas vazias", () => {
    expect(parseMentions({ type: "doc", content: [] })).toEqual({
      taskIds: [], groupNames: [],
    });
  });
});
```

- [ ] **Step 2: Run, verify fail** — Run: `npm test -- mentions` — Expected: FAIL.
- [ ] **Step 3: Implement** `src/lib/mentions.ts`:

```ts
interface JSONNode {
  type?: string;
  attrs?: { kind?: string; ref?: string; label?: string };
  content?: JSONNode[];
}

export function parseMentions(doc: JSONNode): {
  taskIds: string[];
  groupNames: string[];
} {
  const taskIds = new Set<string>();
  const groupNames = new Set<string>();
  const walk = (node: JSONNode) => {
    if (node.type === "mention" && node.attrs?.ref) {
      if (node.attrs.kind === "task") taskIds.add(node.attrs.ref);
      else if (node.attrs.kind === "group") groupNames.add(node.attrs.ref);
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return { taskIds: [...taskIds], groupNames: [...groupNames] };
}
```

- [ ] **Step 4: Run, verify pass** — Run: `npm test -- mentions` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add @ mention extractor (TDD)"`

---

## Phase 2 — Sidebar, navigation, watcher (working notes, plain-text body first)

### Task 6: Install Tiptap deps

- [ ] **Step 1:** Run:
```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-mention @tiptap/suggestion tiptap-markdown
```
- [ ] **Step 2:** Run `npm run build` — Expected: passes (no usage yet).
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Add Tiptap editor dependencies"`

---

### Task 7: `View` union + notes state + watcher in MainApp

**Files:**
- Modify: `src/windows/main/MainApp.tsx`

- [ ] **Step 1:** Add to the `View` union: `| { kind: "notes" } | { kind: "note"; id: string }`. (`notes` = empty/placeholder state when no note selected; `note` = a specific note open.)
- [ ] **Step 2:** Add state: `const [notes, setNotes] = useState<Note[]>([]);` and a `reloadNotes` callback using `loadNotes()`.
- [ ] **Step 3:** In the existing load/watch `useEffect`, also call `reloadNotes()` and `watchNotes(reloadNotes)` (store its unwatch alongside the task unwatch). Import `loadNotes`, `watchNotes` from `../../lib/notesStore` and `Note` type.
- [ ] **Step 4:** Add `saveNoteAndState(note)` and `removeNote(id)` helpers that update `notes` state + call `saveNote`/`deleteNote`, with an undo toast on delete (mirror `removeTask`: `pushToast(<TrashGlyph .../>, "Nota excluída", note.title, { label: "Desfazer", run: () => saveNote(note) })`).
- [ ] **Step 5:** Add `headerFor` cases: `"notes"` → `{ title: "Notas", subtitle: null }`; `"note"` → `{ title: "Nota", subtitle: null }` (the NotesView renders its own title).
- [ ] **Step 6:** Typecheck — Run: `npm run build` — Expected: passes once render switch (Task 9) exists; until then, temporarily render `null` for the new kinds. Commit after Task 9.

---

### Task 8: "Notas" sidebar section

**Files:**
- Create: `src/windows/main/NotesSidebarSection.tsx`
- Modify: `src/windows/main/Sidebar.tsx`, `src/components/Icons.tsx`

- [ ] **Step 1:** Add `NoteIcon` to `src/components/Icons.tsx`:

```tsx
export function NoteIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4M8 12h8M8 16h6" />
    </svg>
  );
}
```

- [ ] **Step 2:** Create `NotesSidebarSection.tsx`: takes `notes: Note[]`, `activeId: string | null`, `onOpen(id)`, `onRename(id)`, `onDelete(id)`. Renders a "Notas" header (like "Grupos") and, sorted by `updatedAt` desc, each note as a button showing the title (truncated) and a one-line preview (first ~40 chars of `body` with markdown tokens stripped). Right-click opens a small popover (reuse the GroupEditor popover pattern) with "Renomear" and "Excluir". Use `NoteIcon` for the section.

```tsx
import { NoteIcon } from "../../components/Icons";
import type { Note } from "../../lib/types";

const stripMd = (s: string) =>
  s.replace(/[#>*_`~\-]|@task:[\w-]+|@group:[^\s]+/g, "").replace(/\s+/g, " ").trim();

export function NotesSidebarSection({
  notes, activeId, onOpen, onContextMenu,
}: {
  notes: Note[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
}) {
  const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="mt-3 space-y-0.5">
      <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold tracking-wide text-faint uppercase">
        Notas
      </div>
      {sorted.map((n) => (
        <button
          key={n.id}
          onClick={() => onOpen(n.id)}
          onContextMenu={(e) => { e.preventDefault(); onContextMenu(n.id, e.clientX, e.clientY); }}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors duration-150 ${
            activeId === n.id ? "bg-accent-dim font-medium text-accent" : "text-dim hover:bg-hover hover:text-ink"
          }`}
        >
          <span className="flex w-4 shrink-0 justify-center"><NoteIcon size={15} /></span>
          <span className="min-w-0 flex-1 truncate text-left">
            {n.title || "Sem título"}
          </span>
        </button>
      ))}
    </div>
  );
}
```

(Preview line is optional in the sidebar's narrow width — the spec mentions title + short preview; include the preview as a second muted line if space allows. Keep title-only if it crowds.)

- [ ] **Step 3:** In `Sidebar.tsx`, accept new props (`notes`, `view`, `onOpenNote`, `onNoteContextMenu`) and render `<NotesSidebarSection>` between the Concluídas `NavItem` and the Perfil `NavItem`.
- [ ] **Step 4:** Wire props from `MainApp` (notes state, `setView({kind:"note", id})`, context-menu state).
- [ ] **Step 5:** Typecheck — Run: `npm run build` — fix types.

---

### Task 9: Minimal NotesView (plain textarea body first) + render switch

**Files:**
- Create: `src/windows/main/NotesView.tsx`
- Modify: `src/windows/main/MainApp.tsx`

Build a working note view with a **plain `<textarea>`** body first (Tiptap comes in Phase 3). This proves create/open/save/navigation end-to-end before adding editor complexity.

- [ ] **Step 1:** Create `NotesView.tsx` with: editable title `<input>` (large heading) and a `<textarea>` for the body. On change, debounce-save (500ms) via a passed `onSave(note)` that sets `updatedAt`. Use the `debounce` util in a `useRef`/`useMemo`. Flush on unmount and on note switch.
- [ ] **Step 2:** In `MainApp` render switch, add:
  `view.kind === "note"` → find the note by id; if found render `<NotesView note={...} onSave={saveNoteAndState} />`, else fall back to `setView({kind:"notes"})`.
  `view.kind === "notes"` → an empty state ("Nenhuma nota aberta. Digite `//` na barra rápida para criar uma ✦").
- [ ] **Step 3:** Add the note context-menu (rename inline in the sidebar via a small input or a prompt-like popover; delete via `removeNote`). Reuse the existing context-menu popover styling.
- [ ] **Step 4:** Typecheck + run app — Run: `npm run build` then `npm run tauri dev`. Manually: create a note file by hand in `~/FocusBar/notes/`, confirm it appears in the sidebar and opens; edit title/body, confirm autosave writes the file; delete via right-click, confirm undo toast.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add Notas sidebar, notes view (textarea), navigation and watcher"`

---

### Task 10: `//` trigger in the quick-add bar

**Files:**
- Modify: `src/windows/QuickAdd.tsx`, `src/windows/main/MainApp.tsx`

- [ ] **Step 1:** In `QuickAdd.tsx`, compute `const note = parseNoteInput(text);`. When `note.isNote`, replace the parsed-chip preview with a single note-mode chip: `📝 → use NoteGlyph` + the title (or "nova nota"), and change the footer hint to "↵ abrir nota".
- [ ] **Step 2:** On submit, if `note.isNote && note.title`: load notes (`loadNotes()`), `findNoteByTitle`; if found use its id, else create `Note` (uuid, empty body, empty links, timestamps) and `saveNote`. Then emit a Tauri event to the main window to open it and show the window:

```ts
import { emitTo } from "@tauri-apps/api/event";
await emitTo("main", "open-note", { id });
const main = await WebviewWindow.getByLabel("main");
await main?.show(); await main?.setFocus();
win.hide(); reset();
```

- [ ] **Step 2b:** If `note.isNote && !note.title` → do nothing (ignore Enter).
- [ ] **Step 3:** In `MainApp`, add a `useEffect` listening for `"open-note"` on the main window: `setView({ kind: "note", id })` (reload notes first so a just-created note is present).
- [ ] **Step 4:** Add `NoteGlyph` to `src/components/glyphs.tsx` (filled note glyph in app style, accent color).
- [ ] **Step 5:** Typecheck + run. Manually: `⌥Space`, type `//ideias`, Enter → main window opens to a new "ideias" note. Repeat `//ideias` → opens the same note (no duplicate). Verify file count in `~/FocusBar/notes/`.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "Create/open notes via // in the quick-add bar"`

---

## Phase 3 — Tiptap editor + Markdown autosave

### Task 11: NoteEditor with StarterKit + Placeholder + Markdown

**Files:**
- Create: `src/windows/main/editor/NoteEditor.tsx`
- Modify: `src/windows/main/NotesView.tsx`

- [ ] **Step 1:** Create `NoteEditor.tsx`: a `useEditor` with `StarterKit`, `Placeholder.configure({ placeholder: "Escreva algo, ou digite / para comandos…" })`, and `Markdown` (from `tiptap-markdown`). Props: `markdown: string`, `onChange(markdown, jsonDoc)`. Initialize content from `markdown` (Markdown input). On `update`, call `onChange(editor.storage.markdown.getMarkdown(), editor.getJSON())`. Add `editorProps.attributes.class` for prose styling; style headings/lists/code/hr with Tailwind in a `notes-prose` CSS block in `styles.css` (dark, readable, accent for links/code).
- [ ] **Step 2:** Replace the `<textarea>` in `NotesView` with `<NoteEditor markdown={note.body} onChange={(md, doc) => scheduleSave(md, doc)} />`. The debounced save now: `parseMentions(doc)` → set `linkedTasks`/`linkedGroups`, set `body = md`, `updatedAt = now`, `saveNote`.
- [ ] **Step 3:** Ensure switching notes re-initializes the editor (key the `NoteEditor` by `note.id`, and flush pending save before switching).
- [ ] **Step 4:** Typecheck + run. Manually: type text, headings via markdown shortcuts, confirm placeholder shows when empty, confirm body saves as markdown in the JSON file, confirm reopening restores formatting.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add Tiptap note editor with markdown autosave"`

---

## Phase 4 — Slash command palette

### Task 12: `/` block commands

**Files:**
- Create: `src/windows/main/editor/SlashCommands.ts`, `src/windows/main/editor/SlashMenu.tsx`
- Modify: `src/windows/main/editor/NoteEditor.tsx`

- [ ] **Step 1:** Create `SlashCommands.ts` — a Tiptap `Extension` using `@tiptap/suggestion` with `char: "/"`. Items list (each `{ title, run(editor, range) }`): Texto (`setParagraph`), Título 1/2/3 (`toggleHeading {level}`), Lista com marcadores (`toggleBulletList`), Lista numerada (`toggleOrderedList`), Lista de tarefas (`toggleTaskList` — requires StarterKit taskList or add `@tiptap/extension-task-list`+`task-item`; add those to deps in Task 6 if not in StarterKit), Bloco de código (`toggleCodeBlock`), Divisor (`setHorizontalRule`). The `render()` returns lifecycle hooks that mount `SlashMenu` as a positioned React component (use a small portal helper; position from `props.clientRect()`).
- [ ] **Step 2:** Create `SlashMenu.tsx` — frosted-glass dropdown (`bg-[rgba(30,30,34,0.9)] backdrop-blur border border-white/10 rounded-xl`), arrow-key navigable, selected item highlighted with `bg-accent-dim text-accent`. Each row: small glyph + label. Filters items by the query after `/`.
- [ ] **Step 3:** Register the extension in `NoteEditor`. Add task-list deps if needed: `npm install @tiptap/extension-task-list @tiptap/extension-task-item` and register them.
- [ ] **Step 4:** Typecheck + run. Manually: type `/` → palette appears; arrow + Enter inserts each block type; `/li` filters to lists.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add slash command palette to the note editor"`

---

## Phase 5 — `@` linking (mentions + chips + chip rows)

### Task 13: `@` Mention node + search dropdown

**Files:**
- Create: `src/windows/main/editor/LinkMention.ts`, `src/windows/main/editor/MentionMenu.tsx`
- Modify: `src/windows/main/editor/NoteEditor.tsx`

- [ ] **Step 1:** Create `LinkMention.ts` from `@tiptap/extension-mention` configured with `char: "@"`, custom attrs `kind`/`ref`/`label`, `renderHTML` producing a chip (`<span class="mention-chip" data-kind data-ref>`). Add `tiptap-markdown` serialization for the node: serialize to `@task:<ref>` or `@group:<ref>`; parse those tokens back on load (a markdown input rule or a post-load transform). Suggestion `items({ query })` searches across all task titles (`tasks`) and group names (`groups`) passed via extension storage/options; returns `{ kind, ref, label }[]`.
- [ ] **Step 2:** Create `MentionMenu.tsx` — same frosted dropdown as SlashMenu; rows show a task glyph or group color dot + label; selecting calls the suggestion command to insert a mention node.
- [ ] **Step 3:** `NoteEditor` needs current `tasks` and `groups` to feed the search — pass them as props and into the extension options (reconfigure on change, or read from a ref).
- [ ] **Step 4:** Style `.mention-chip` in `styles.css`: rounded, `bg-accent-dim text-accent` for tasks; group chips tinted with the group color (use a CSS var set inline via `renderHTML` style, or a neutral accent for v1).
- [ ] **Step 5:** Typecheck + run. Manually: type `@`, search a task and a group, select → chips appear inline; save; reopen → chips persist (markdown round-trip); confirm `linkedTasks`/`linkedGroups` in the JSON.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "Add @ task/group linking with mention chips"`

---

### Task 14: Linked chip rows in the notes view

**Files:**
- Modify: `src/windows/main/NotesView.tsx`

- [ ] **Step 1:** Below the title, render two chip rows from the note's derived links: linked tasks (resolve uuid → task title via `tasks` prop; show task glyph + title) and linked groups (group color dot + name). Each chip has an "×" to remove (removes the corresponding mention node from the editor → triggers save → arrays update). Each row has a "+" add button that programmatically opens the `@` search scoped to that kind (task-only / group-only) and inserts the chosen mention into the body.
- [ ] **Step 2:** Resolve link display from `tasks`/`groups` passed from `MainApp`. If a linked task no longer exists, show "tarefa removida" muted (and offer remove).
- [ ] **Step 3:** Typecheck + run. Manually: add a link via the row "+" → chip appears in row and body; remove via "×" → gone from both; matches JSON.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "Add linked task/group chip rows to the note view"`

---

## Phase 6 — Verification

### Task 15: Full verification + release

- [ ] **Step 1:** Run `npm test` — Expected: all suites pass (parser, debounce, mentions + existing 66).
- [ ] **Step 2:** Run `npm run build` — Expected: clean.
- [ ] **Step 3:** Run `npm run tauri dev`; walk the full flow: `//nota nova` creates+opens; type with `/` blocks and `@` links; switch notes; sidebar live-updates; right-click rename/delete with undo; reopen app and confirm persistence.
- [ ] **Step 4:** `npm run tauri build`, install to `/Applications`, visually verify (frosted glass, accent, glyphs, PT-BR copy).
- [ ] **Step 5: Commit** any fixes; the feature is complete.

---

## Self-review notes

- **Spec coverage:** `//` trigger (T2, T10) ✓ · note JSON model/fields (T1, T3) ✓ · debounced 500ms autosave no save button (T4, T9, T11) ✓ · Tiptap StarterKit+Placeholder+slash palette with all 9 block types (T11, T12) ✓ · `@` linking with inline dropdown + chips + linkedTasks/linkedGroups (T5, T13, T14) ✓ · Notas sidebar between Concluídas and Perfil, sorted by updatedAt, rename/delete + undo (T8, T9) ✓ · notes view: editable title heading, two chip rows with add, editor body (T9, T11, T14) ✓ · watcher extended to notes/ (T7) ✓ · vitest for note parser + debounce + mention parser (T2, T4, T5) ✓ · PT-BR, glass, accent, glyphs, no new window (throughout) ✓.
- **Open risk flagged for review:** Markdown round-trip of custom mention chips (Task 13) is the trickiest part — if it proves brittle, the fallback is to store `body` as Tiptap JSON instead of markdown (one-line model change), which the user should weigh.
