import { useEffect, useRef } from "react";
import { toLocalIsoDateTime } from "../../lib/parser";
import { debounce } from "../../lib/debounce";
import type { Note } from "../../lib/types";

interface NotesViewProps {
  note: Note;
  onSave: (note: Note) => void;
}

export function NotesView({ note, onSave }: NotesViewProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Debounced save — flushed on unmount and when the note id changes (keyed externally)
  const debouncedSave = useRef(
    debounce((updated: Note) => {
      onSave(updated);
    }, 500),
  );

  // Flush pending save on unmount
  useEffect(() => {
    const d = debouncedSave.current;
    return () => {
      d.flush();
    };
  }, []);

  // When the note prop changes externally (e.g. title renamed), sync inputs
  useEffect(() => {
    if (titleRef.current && document.activeElement !== titleRef.current) {
      titleRef.current.value = note.title;
    }
    if (bodyRef.current && document.activeElement !== bodyRef.current) {
      bodyRef.current.value = note.body;
    }
  }, [note]);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    const body = bodyRef.current?.value ?? note.body;
    debouncedSave.current({
      ...note,
      title,
      body,
      updatedAt: toLocalIsoDateTime(new Date()),
    });
  }

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const body = e.target.value;
    const title = titleRef.current?.value ?? note.title;
    debouncedSave.current({
      ...note,
      title,
      body,
      updatedAt: toLocalIsoDateTime(new Date()),
    });
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
      <textarea
        ref={bodyRef}
        defaultValue={note.body}
        placeholder="Escreva algo…"
        spellCheck={false}
        onChange={handleBodyChange}
        className="min-h-[300px] flex-1 resize-none bg-transparent text-[14px] leading-relaxed text-ink outline-none placeholder:text-faint"
      />
    </div>
  );
}
