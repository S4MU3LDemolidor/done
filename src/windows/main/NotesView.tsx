import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { toLocalIsoDateTime } from "../../lib/parser";
import { debounce } from "../../lib/debounce";
import { normalizeText } from "../../lib/text";
import { parseMentions, type TiptapNode } from "../../lib/mentions";
import { groupColor } from "../../lib/colors";
import type { GroupColors } from "../../lib/store";
import type { Note, Task } from "../../lib/types";
import { NoteEditor } from "./editor/NoteEditor";
import {
  MentionMenu,
  type MentionItem,
  type MentionMenuRef,
} from "./editor/MentionMenu";
import { TaskGlyph } from "../../components/glyphs";
import { PlusIcon } from "../../components/Icons";

interface NotesViewProps {
  note: Note;
  onSave: (note: Note) => void;
  tasks: Task[];
  groups: string[];
  groupColors: GroupColors;
}


export function NotesView({
  note,
  onSave,
  tasks,
  groups,
  groupColors,
}: NotesViewProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  // FIX A: stable refs for onSave and note so the debounced saver never closes
  // over stale prop values
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  const latestNoteRef = useRef(note);
  useEffect(() => {
    latestNoteRef.current = note;
  });

  // Refs that always hold the latest values so the debounced saver reads them
  // without stale closures — avoids a title edit clobbering a pending body edit
  const latestTitleRef = useRef(note.title);
  const latestBodyRef = useRef(note.body);
  const latestDocRef = useRef<object>({}); // Tiptap JSON doc

  // FIX C: track whether the body has been dirtied this session so a title-only
  // save never wipes links that have not been re-parsed from the doc yet
  const docDirtyRef = useRef(false);

  // Live links derived from the editor doc, so the chip rows update immediately
  // (the persisted note.linkedTasks/linkedGroups lag behind the debounced save).
  const [linkedTasks, setLinkedTasks] = useState<string[]>(note.linkedTasks);
  const [linkedGroups, setLinkedGroups] = useState<string[]>(note.linkedGroups);

  // Single debounced saver — reads from refs, not from captured values
  const debouncedSave = useRef(
    debounce(() => {
      // FIX C: only recompute links when the doc was actually edited this session
      const mentions = docDirtyRef.current
        ? parseMentions(latestDocRef.current as TiptapNode)
        : {
            taskIds: latestNoteRef.current.linkedTasks,
            groupNames: latestNoteRef.current.linkedGroups,
          };

      // FIX A: spread latestNoteRef so all non-edited fields stay current, and
      // call the latest onSave (not the one captured at mount)
      const updated: Note = {
        ...latestNoteRef.current,
        title: latestTitleRef.current,
        body: latestBodyRef.current,
        linkedTasks: mentions.taskIds,
        linkedGroups: mentions.groupNames,
        updatedAt: toLocalIsoDateTime(new Date()),
      };
      onSaveRef.current(updated);
    }, 500),
  );

  // Flush any pending save when this note component unmounts (note switched / closed)
  useEffect(() => {
    const d = debouncedSave.current;
    return () => {
      d.flush();
    };
  }, []);

  // Flush any pending save when the webview is hidden/destroyed (window closed
  // without React unmount). `pagehide` fires on Tauri webview close; `beforeunload`
  // is a belt-and-suspenders fallback for browser-style navigation.
  useEffect(() => {
    const d = debouncedSave.current;
    const flush = () => d.flush();
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, []);

  // When the note prop changes externally (e.g. renamed from sidebar), sync the
  // title input and latest refs.
  // FIX B: do NOT sync body from the prop — the mounted NoteEditor owns the body
  // for the life of this mount (keyed by note.id). Syncing body from a prop
  // update (triggered by our own save → fs watcher → reloadNotes) would clobber
  // in-flight typing.
  // Title is synced only when the title input is not focused.
  useEffect(() => {
    latestTitleRef.current = note.title;
    // Intentionally omit: latestBodyRef.current = note.body
    if (titleRef.current && document.activeElement !== titleRef.current) {
      titleRef.current.value = note.title;
    }
  }, [note]);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    latestTitleRef.current = e.target.value;
    debouncedSave.current();
  }

  function handleBodyChange(md: string, doc: object) {
    latestBodyRef.current = md;
    latestDocRef.current = doc;
    docDirtyRef.current = true; // FIX C: mark the doc as dirty
    const mentions = parseMentions(doc as TiptapNode);
    setLinkedTasks(mentions.taskIds);
    setLinkedGroups(mentions.groupNames);
    debouncedSave.current();
  }

  // Removes every mention node matching kind+ref from the editor body. The
  // resulting doc update flows back through handleBodyChange, refreshing the
  // chip rows and queuing a save.
  function removeMention(kind: "task" | "group", ref: string) {
    const editor = editorRef.current;
    if (!editor) return;
    const { state } = editor;
    const tr = state.tr;
    const ranges: { from: number; to: number }[] = [];
    state.doc.descendants((node, pos) => {
      if (
        node.type.name === "mention" &&
        node.attrs.kind === kind &&
        node.attrs.ref === ref
      ) {
        ranges.push({ from: pos, to: pos + node.nodeSize });
      }
    });
    // Delete from the end backwards so earlier positions stay valid.
    for (const r of ranges.reverse()) {
      tr.delete(r.from, r.to);
    }
    if (ranges.length > 0) {
      editor.view.dispatch(tr);
    }
  }

  // Inserts a mention node for the chosen item at the end of the document.
  function insertMention(item: MentionItem) {
    const editor = editorRef.current;
    if (!editor) return;
    editor
      .chain()
      .focus("end")
      .insertContent([
        {
          type: "mention",
          attrs: { kind: item.kind, ref: item.ref, label: item.label },
        },
        { type: "text", text: " " },
      ])
      .run();
  }

  // Resolve a task title (current) for a linked uuid.
  const taskTitle = (id: string): string | null =>
    tasks.find((t) => t.id === id)?.title ?? null;

  const hasLinks = linkedTasks.length > 0 || linkedGroups.length > 0;

  // Stable callback so NoteEditor's effect (which lists onEditorReady as a dep)
  // does not re-run on every NotesView re-render, avoiding a transient null flash.
  const handleEditorReady = useCallback((e: Editor | null) => {
    editorRef.current = e;
  }, []);

  return (
    <div className="flex h-full flex-col gap-3 pt-2">
      <input
        ref={titleRef}
        defaultValue={note.title}
        placeholder="Sem título"
        spellCheck={false}
        onChange={handleTitleChange}
        className="w-full bg-transparent text-[22px] font-semibold tracking-tight text-ink outline-none placeholder:text-faint"
      />

      <div
        className={`flex flex-col gap-1.5 ${
          hasLinks ? "border-b border-line pb-3" : ""
        }`}
      >
        <LinkRow
          label="Tarefas vinculadas"
          kind="task"
          onAdd={insertMention}
          tasks={tasks}
          groups={groups}
          groupColors={groupColors}
        >
          {linkedTasks.map((id) => {
            const title = taskTitle(id);
            return (
              <LinkChip
                key={id}
                color="var(--color-accent)"
                glyph
                muted={title === null}
                label={title ?? "tarefa removida"}
                onRemove={() => removeMention("task", id)}
              />
            );
          })}
        </LinkRow>

        <LinkRow
          label="Grupos vinculados"
          kind="group"
          onAdd={insertMention}
          tasks={tasks}
          groups={groups}
          groupColors={groupColors}
        >
          {linkedGroups.map((name) => (
            <LinkChip
              key={name}
              color={groupColor(name, groupColors)}
              label={name}
              onRemove={() => removeMention("group", name)}
            />
          ))}
        </LinkRow>
      </div>

      <NoteEditor
        key={note.id}
        markdown={note.body}
        onChange={handleBodyChange}
        tasks={tasks}
        groups={groups}
        groupColors={groupColors}
        onEditorReady={handleEditorReady}
      />
    </div>
  );
}

/* ── Chip-row UI ──────────────────────────────────────────────────────── */

function LinkRow({
  label,
  kind,
  onAdd,
  tasks,
  groups,
  groupColors,
  children,
}: {
  label: string;
  kind: "task" | "group";
  onAdd: (item: MentionItem) => void;
  tasks: Task[];
  groups: string[];
  groupColors: GroupColors;
  children: React.ReactNode;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <div className="flex items-start gap-2 text-[12px]">
      <span className="mt-1 w-[120px] shrink-0 text-faint">{label}</span>
      <div className="relative flex flex-1 flex-wrap items-center gap-1.5">
        {children}
        <button
          onClick={() => setPicking((p) => !p)}
          aria-label={kind === "task" ? "Vincular tarefa" : "Vincular grupo"}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-line text-dim transition-colors duration-150 hover:border-accent/40 hover:bg-accent-dim hover:text-accent"
        >
          <PlusIcon size={13} />
        </button>
        {picking && (
          <AddPicker
            kind={kind}
            tasks={tasks}
            groups={groups}
            groupColors={groupColors}
            onPick={(item) => {
              onAdd(item);
              setPicking(false);
            }}
            onClose={() => setPicking(false)}
          />
        )}
      </div>
    </div>
  );
}

function LinkChip({
  label,
  color,
  glyph,
  muted,
  onRemove,
}: {
  label: string;
  color: string;
  glyph?: boolean;
  muted?: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      className="animate-chip-in flex h-[24px] items-center gap-1.5 rounded-md pl-2 pr-1 text-[12px] font-medium"
      style={{
        color: muted ? "var(--color-faint)" : color,
        background: muted
          ? "rgba(255,255,255,0.05)"
          : `color-mix(in srgb, ${color} 16%, transparent)`,
      }}
    >
      {glyph ? (
        <TaskGlyph size={13} />
      ) : (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="max-w-[180px] truncate">{label}</span>
      <button
        onClick={onRemove}
        aria-label="Remover vínculo"
        className="flex h-[16px] w-[16px] items-center justify-center rounded opacity-70 transition-opacity duration-150 hover:bg-black/20 hover:opacity-100"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  );
}

/** Small frosted popover that reuses MentionMenu to pick a task or group. */
function AddPicker({
  kind,
  tasks,
  groups,
  groupColors,
  onPick,
  onClose,
}: {
  kind: "task" | "group";
  tasks: Task[];
  groups: string[];
  groupColors: GroupColors;
  onPick: (item: MentionItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<MentionMenuRef>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const items = useMemo<MentionItem[]>(() => {
    const q = normalizeText(query.trim());
    if (kind === "task") {
      return tasks
        .filter((t) => !q || normalizeText(t.title).includes(q))
        .slice(0, 8)
        .map((t) => ({ kind: "task" as const, ref: t.id, label: t.title }));
    }
    return groups
      .filter((g) => !q || normalizeText(g).includes(q))
      .slice(0, 8)
      .map((g) => ({
        kind: "group" as const,
        ref: g,
        label: g,
        color: groupColor(g, groupColors),
      }));
  }, [kind, query, tasks, groups, groupColors]);

  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div className="absolute left-0 top-[28px] z-50 flex w-[256px] flex-col gap-1.5">
        <input
          ref={inputRef}
          value={query}
          spellCheck={false}
          placeholder={kind === "task" ? "Buscar tarefa…" : "Buscar grupo…"}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onClose();
              return;
            }
            if (
              e.key === "ArrowDown" ||
              e.key === "ArrowUp" ||
              e.key === "Enter"
            ) {
              const handled = menuRef.current?.onKeyDown(e.nativeEvent);
              if (handled) e.preventDefault();
            }
          }}
          className="w-full rounded-xl border border-white/10 bg-[rgba(30,30,34,0.92)] px-3 py-2 text-[13px] text-ink shadow-[0_12px_32px_rgba(0,0,0,0.45)] outline-none backdrop-blur-xl focus:border-accent/60"
        />
        <MentionMenu ref={menuRef} items={items} command={onPick} />
      </div>
    </>
  );
}
