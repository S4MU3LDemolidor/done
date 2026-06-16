import { describe, expect, it } from "vitest";
import type { Note } from "./types";
import { findNoteByTitle, parseNoteInput } from "./notes";

describe("parseNoteInput", () => {
  it('parses "//ideias de vídeo" → title "ideias de vídeo"', () => {
    const result = parseNoteInput("//ideias de vídeo");
    expect(result).toEqual({ isNote: true, title: "ideias de vídeo" });
  });

  it('parses "//  reunião " → title "reunião"', () => {
    const result = parseNoteInput("//  reunião ");
    expect(result).toEqual({ isNote: true, title: "reunião" });
  });

  it('returns isNote false for "comprar pão, sexta"', () => {
    const result = parseNoteInput("comprar pão, sexta");
    expect(result).toEqual({ isNote: false });
  });

  it('parses "//   " → isNote true, title ""', () => {
    const result = parseNoteInput("//   ");
    expect(result).toEqual({ isNote: true, title: "" });
  });
});

describe("findNoteByTitle", () => {
  const notes: Note[] = [
    {
      id: "1",
      title: "Ideias de Vídeo",
      body: "",
      linkedTasks: [],
      linkedGroups: [],
      created: "2026-06-16T00:00:00",
      updatedAt: "2026-06-16T00:00:00",
    },
  ];

  it('matches "ideias de video" against "Ideias de Vídeo" (case + accent insensitive)', () => {
    const result = findNoteByTitle(notes, "ideias de video");
    expect(result).toBe(notes[0]);
  });

  it("returns undefined when no match", () => {
    const result = findNoteByTitle(notes, "reunião de equipe");
    expect(result).toBeUndefined();
  });
});
