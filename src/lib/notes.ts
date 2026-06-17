import type { Note } from "./types";
import { normalizeText } from "./text";

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
  const normalizedTitle = normalizeText(title.trim());
  return notes.find((n) => normalizeText(n.title.trim()) === normalizedTitle);
}
