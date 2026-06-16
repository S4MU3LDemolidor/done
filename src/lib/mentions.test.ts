import { describe, expect, it } from "vitest";
import { parseMentions } from "./mentions";

describe("parseMentions", () => {
  it("extracts task and group mentions, deduplicating task refs", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { kind: "task", ref: "t1", label: "Task 1" },
            },
            {
              type: "mention",
              attrs: { kind: "task", ref: "t1", label: "Task 1 again" },
            },
            {
              type: "mention",
              attrs: { kind: "group", ref: "Freela", label: "Freela" },
            },
          ],
        },
      ],
    };

    expect(parseMentions(doc)).toEqual({
      taskIds: ["t1"],
      groupNames: ["Freela"],
    });
  });

  it("returns empty arrays for an empty doc", () => {
    const doc = { type: "doc", content: [] };
    expect(parseMentions(doc)).toEqual({ taskIds: [], groupNames: [] });
  });

  it("ignores mention nodes with an unknown kind", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention",
              attrs: { kind: "foo", ref: "x" },
            },
          ],
        },
      ],
    };

    expect(parseMentions(doc)).toEqual({ taskIds: [], groupNames: [] });
  });

  it("handles nested content recursively", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "mention",
                  attrs: { kind: "task", ref: "t2", label: "Task 2" },
                },
              ],
            },
          ],
        },
      ],
    };

    expect(parseMentions(doc)).toEqual({
      taskIds: ["t2"],
      groupNames: [],
    });
  });
});
