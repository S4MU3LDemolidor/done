import { useEffect, useRef } from "react";
import { toLocalIsoDateTime } from "../../lib/parser";
import { debounce } from "../../lib/debounce";
import { parseMentions, type TiptapNode } from "../../lib/mentions";
import type { Note } from "../../lib/types";
import { NoteEditor } from "./editor/NoteEditor";

interface NotesViewProps {
  note: Note;
  onSave: (note: Note) => void;
}

export function NotesView({ note, onSave }: NotesViewProps) {
  const titleRef = useRef<HTMLInputElement>(null);

  // Refs that always hold the latest values so the debounced saver reads them
  // without stale closures — avoids a title edit clobbering a pending body edit
  const latestTitleRef = useRef(note.title);
  const latestBodyRef = useRef(note.body);
  const latestDocRef = useRef<object>({}); // Tiptap JSON doc

  // Single debounced saver — reads from refs, not from captured values
  const debouncedSave = useRef(
    debounce(() => {
      const updated: Note = {
        ...note,
        title: latestTitleRef.current,
        body: latestBodyRef.current,
        linkedTasks: parseMentions(latestDocRef.current as TiptapNode).taskIds,
        linkedGroups: parseMentions(latestDocRef.current as TiptapNode).groupNames,
        updatedAt: toLocalIsoDateTime(new Date()),
      };
      onSave(updated);
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
  // title input and latest refs — but only when not currently focused
  useEffect(() => {
    latestTitleRef.current = note.title;
    latestBodyRef.current = note.body;
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
      />
    </div>
  );
}
