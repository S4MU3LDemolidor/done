import { useEffect, useRef } from "react";
import { toLocalIsoDateTime } from "../../lib/parser";
import { debounce } from "../../lib/debounce";
import { parseMentions, type TiptapNode } from "../../lib/mentions";
import type { GroupColors } from "../../lib/store";
import type { Note, Task } from "../../lib/types";
import { NoteEditor } from "./editor/NoteEditor";

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
    debouncedSave.current();
  }

  return (
    <div className="flex h-full flex-col gap-4 pt-2">
      <input
        ref={titleRef}
        defaultValue={note.title}
        placeholder="Sem título"
        spellCheck={false}
        onChange={handleTitleChange}
        className="w-full bg-transparent text-[22px] font-semibold tracking-tight text-ink outline-none placeholder:text-faint"
      />
      <NoteEditor
        key={note.id}
        markdown={note.body}
        onChange={handleBodyChange}
        tasks={tasks}
        groups={groups}
        groupColors={groupColors}
      />
    </div>
  );
}
