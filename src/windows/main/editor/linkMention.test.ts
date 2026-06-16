import { describe, expect, it } from "vitest";
import markdownit from "markdown-it";
import {
  serializeMentionToken,
  registerMentionMarkdownRule,
} from "./LinkMention";

/**
 * Exercises the markdown round-trip in isolation (no editor / DOM): the node
 * serializer writes a `@@kind:ref@@` token, and the markdown-it inline rule
 * turns that token back into a chip span carrying data-kind/data-ref/data-label.
 * tiptap-markdown then DOM-parses that span into a mention node via parseHTML.
 */

const TASKS = [
  { id: "uuid-123", title: "Pagar conta de luz" },
  { id: "uuid-removed", title: "" },
];

function makeRenderer() {
  const md = markdownit({ html: false });
  registerMentionMarkdownRule(md, (kind, ref) => {
    if (kind === "task") {
      return TASKS.find((t) => t.id === ref)?.title || ref;
    }
    return ref;
  });
  return md;
}

describe("serializeMentionToken", () => {
  it("encodes task and group refs", () => {
    expect(serializeMentionToken("task", "uuid-123")).toBe("@@task:uuid-123@@");
    expect(serializeMentionToken("group", "Trabalho - Cliente X")).toBe(
      "@@group:Trabalho%20-%20Cliente%20X@@",
    );
  });

  it("clamps unknown kinds to task", () => {
    expect(serializeMentionToken("bogus", "x")).toBe("@@task:x@@");
  });
});

describe("mention markdown parsing", () => {
  const md = makeRenderer();

  it("turns a task token into a chip span with the current title", () => {
    const html = md.render(`Lembrar de ${serializeMentionToken("task", "uuid-123")} hoje`);
    expect(html).toContain('data-type="mention"');
    expect(html).toContain('data-kind="task"');
    expect(html).toContain('data-ref="uuid-123"');
    expect(html).toContain('data-label="Pagar conta de luz"');
    expect(html).toContain("@Pagar conta de luz");
  });

  it("round-trips a group ref with spaces and ampersands", () => {
    const token = serializeMentionToken("group", "Casa & Cia");
    const html = md.render(`Grupo ${token}`);
    expect(html).toContain('data-kind="group"');
    // ref is decoded back to the original name (HTML-escaped in the attribute)
    expect(html).toContain('data-ref="Casa &amp; Cia"');
    expect(html).toContain('data-label="Casa &amp; Cia"');
  });

  it("falls back to the ref when a task no longer exists", () => {
    const html = md.render(serializeMentionToken("task", "missing-uuid"));
    expect(html).toContain('data-ref="missing-uuid"');
    expect(html).toContain('data-label="missing-uuid"');
  });

  it("parses multiple mentions on one line", () => {
    const html = md.render(
      `${serializeMentionToken("task", "uuid-123")} e ${serializeMentionToken("group", "Casa")}`,
    );
    expect((html.match(/data-type="mention"/g) ?? []).length).toBe(2);
  });

  it("parses mentions inside list items", () => {
    const html = md.render(`- item com ${serializeMentionToken("task", "uuid-123")}`);
    expect(html).toContain("<li>");
    expect(html).toContain('data-kind="task"');
  });

  it("does not treat a normal email as a mention", () => {
    const html = md.render("escreva para a@b.com por favor");
    expect(html).not.toContain('data-type="mention"');
    expect(html).toContain("a@b.com");
  });

  it("does not match a single @ or an incomplete token", () => {
    expect(md.render("preço @ vista")).not.toContain('data-type="mention"');
    expect(md.render("@@task:incompleto")).not.toContain('data-type="mention"');
  });
});
