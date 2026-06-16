import type { Note } from "./types";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export type NoteInputResult =
  | { isNote: true; title: string }
  | { isNote: false };

export function parseNoteInput(input: string): NoteInputResult {
  if (input.startsWith("//")) {
    return { isNote: true, title: input.slice(2).trim() };
  }
  return { isNote: false };
}

export function findNoteByTitle(
  notes: Note[],
  title: string,
): Note | undefined {
  const normalizedTitle = normalize(title.trim());
  return notes.find((n) => normalize(n.title.trim()) === normalizedTitle);
}
