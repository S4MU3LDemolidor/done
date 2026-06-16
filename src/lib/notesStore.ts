import { homeDir, join } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  watch,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { Note } from "./types";

async function baseDir(): Promise<string> {
  return join(await homeDir(), "FocusBar");
}

async function notesDir(): Promise<string> {
  return join(await baseDir(), "notes");
}

export async function ensureNotesDir(): Promise<void> {
  const dir = await notesDir();
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
}

export async function loadNotes(): Promise<Note[]> {
  await ensureNotesDir();
  const dir = await notesDir();
  const entries = await readDir(dir);
  const notes: Note[] = [];
  for (const entry of entries) {
    if (!entry.isFile || !entry.name.endsWith(".json")) continue;
    try {
      const raw = await readTextFile(await join(dir, entry.name));
      const note = JSON.parse(raw) as Note;
      if (note.id && typeof note.title === "string") notes.push(note);
    } catch (err) {
      console.warn(`Arquivo de nota ilegível, ignorado: ${entry.name}`, err);
    }
  }
  return notes;
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

/** Observa a pasta de notas; chama onChange em qualquer alteração. */
export async function watchNotes(onChange: () => void): Promise<() => void> {
  await ensureNotesDir();
  return watch(await notesDir(), onChange, { delayMs: 250 });
}
