import Mention, { type MentionOptions } from "@tiptap/extension-mention";
import { mergeAttributes } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import type {
  SuggestionProps,
  SuggestionKeyDownProps,
  SuggestionOptions,
} from "@tiptap/suggestion";
import type { Task } from "../../../lib/types";
import { MentionMenu, type MentionMenuRef, type MentionItem } from "./MentionMenu";
import type { ComponentProps } from "react";

/* ----------------------------------------------------------------------------
 * `@`-mention linking for the note editor.
 *
 * A mention node carries { kind: "task" | "group", ref, label }. It renders as a
 * frosted chip inline, and round-trips through markdown as the token
 * `@@kind:<encoded-ref>@@` (see the serialize/parse storage below). The token is
 * delimited and percent-encoded so a ref containing spaces or punctuation (group
 * names, "Trabalho - Cliente X") never breaks the round-trip.
 * -------------------------------------------------------------------------- */

type MentionMenuProps = ComponentProps<typeof MentionMenu>;

export interface LinkMentionOptions
  extends MentionOptions<MentionItem, MentionItem> {
  /** Returns the current task list — read via a ref so it stays fresh without
   *  re-creating the editor. */
  getTasks: () => Task[];
  /** Returns the current group names. */
  getGroups: () => string[];
  /** Resolves a group color for the menu dot / chip tint. */
  getGroupColor: (name: string) => string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, "");

const MAX_RESULTS = 8;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Builds the chip HTML emitted during markdown→DOM parsing. ProseMirror's
 *  `parseHTML` rule (below) then turns this span into a mention node. */
function chipHtml(kind: string, ref: string, label: string): string {
  return (
    `<span data-type="mention" data-kind="${escapeHtml(kind)}" ` +
    `data-ref="${escapeHtml(ref)}" data-label="${escapeHtml(label)}">` +
    `@${escapeHtml(label)}</span>`
  );
}

/** The markdown token a mention node serializes to (and parses back from). */
export function serializeMentionToken(kind: string, ref: string): string {
  const k = kind === "group" ? "group" : "task";
  return `@@${k}:${encodeURIComponent(ref)}@@`;
}

/**
 * Registers the `@@kind:ref@@` → chip-span inline rule on a markdown-it
 * instance. Extracted so it can be unit-tested without a full editor/DOM.
 * `resolveLabel` maps a parsed (kind, ref) to the display label.
 */
export function registerMentionMarkdownRule(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markdownit: any,
  resolveLabel: (kind: string, ref: string) => string,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rule = (state: any, silent: boolean): boolean => {
    const src: string = state.src;
    if (src.charCodeAt(state.pos) !== 0x40 /* @ */) return false;
    if (src.charCodeAt(state.pos + 1) !== 0x40 /* @ */) return false;
    const rest = src.slice(state.pos);
    const m = rest.match(/^@@(task|group):([^@]+)@@/);
    if (!m) return false;
    if (!silent) {
      const kind = m[1];
      let ref = m[2];
      try {
        ref = decodeURIComponent(ref);
      } catch {
        /* keep raw ref if it isn't valid percent-encoding */
      }
      const token = state.push("link_mention", "", 0);
      token.meta = { kind, ref, label: resolveLabel(kind, ref) };
    }
    state.pos += m[0].length;
    return true;
  };

  markdownit.inline.ruler.before("escape", "link_mention", rule);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markdownit.renderer.rules.link_mention = (tokens: any[], idx: number) => {
    const { kind, ref, label } = tokens[idx].meta;
    return chipHtml(kind, ref, label);
  };
}

export const LinkMention = Mention.extend<LinkMentionOptions>({
  name: "mention",

  addOptions(): LinkMentionOptions {
    const parent = this.parent?.() as MentionOptions<MentionItem, MentionItem>;
    return {
      ...parent,
      // Backspace next to a chip removes the whole chip (no leftover trigger
      // char) — the default would re-insert `mentionSuggestionChar`, an attr we
      // removed, so this also avoids inserting `undefined`.
      deleteTriggerWithBackspace: true,
      getTasks: () => [],
      getGroups: () => [],
      getGroupColor: () => "var(--color-accent)",
    };
  },

  // Replace the default id/label/mentionSuggestionChar attrs with our own.
  addAttributes() {
    return {
      kind: {
        default: "task",
        parseHTML: (el) => el.getAttribute("data-kind"),
        renderHTML: (attrs) => ({ "data-kind": attrs.kind }),
      },
      ref: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-ref"),
        renderHTML: (attrs) => ({ "data-ref": attrs.ref }),
      },
      label: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-label"),
        renderHTML: (attrs) => ({ "data-label": attrs.label }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="mention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = node.attrs.kind === "group" ? "group" : "task";
    const label: string = node.attrs.label || node.attrs.ref || "";
    const color =
      kind === "group"
        ? this.options.getGroupColor(node.attrs.ref)
        : undefined;
    const style = color ? `--chip-color: ${color};` : undefined;
    return [
      "span",
      mergeAttributes(
        { "data-type": "mention", class: "mention-chip" },
        style ? { style } : {},
        HTMLAttributes,
      ),
      `@${label}`,
    ];
  },

  // ── Markdown round-trip (consumed by tiptap-markdown via storage.markdown) ──
  addStorage() {
    const options = this.options;
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void },
          node: { attrs: { kind: string; ref: string } },
        ) {
          state.write(serializeMentionToken(node.attrs.kind, node.attrs.ref));
        },
        parse: {
          // Register a markdown-it inline rule that turns `@@kind:ref@@` back
          // into a mention chip span, resolving the current label from the
          // live tasks/groups so a chip re-rendered after reload shows the
          // up-to-date title (falling back to the ref).
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setup(markdownit: any) {
            registerMentionMarkdownRule(markdownit, (kind, ref) => {
              if (kind === "task") {
                const task = options.getTasks().find((t) => t.id === ref);
                return task?.title || ref;
              }
              return ref;
            });
          },
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return this.parent?.() ?? [];
  },
});

/**
 * Builds the suggestion config for the `@` menu. Kept as a factory so NoteEditor
 * can pass live data accessors and reuse the exact slash-menu render pattern.
 */
export function buildMentionSuggestion(opts: {
  getTasks: () => Task[];
  getGroups: () => string[];
  getGroupColor: (name: string) => string;
}): Omit<SuggestionOptions<MentionItem, MentionItem>, "editor"> {
  const search = (query: string): MentionItem[] => {
    const q = norm(query.trim());
    const tasks = opts.getTasks();
    const groups = opts.getGroups();

    const taskItems: MentionItem[] = tasks
      .filter((t) => !q || norm(t.title).includes(q))
      .map((t) => ({ kind: "task" as const, ref: t.id, label: t.title }));

    const groupItems: MentionItem[] = groups
      .filter((g) => !q || norm(g).includes(q))
      .map((g) => ({
        kind: "group" as const,
        ref: g,
        label: g,
        color: opts.getGroupColor(g),
      }));

    return [...taskItems, ...groupItems].slice(0, MAX_RESULTS);
  };

  return {
    char: "@",
    items: ({ query }) => search(query),

    command: ({ editor, range, props }) => {
      // Mirror the default mention command: insert the node then a trailing
      // space, collapsing the selection after the chip.
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: "mention",
            attrs: { kind: props.kind, ref: props.ref, label: props.label },
          },
          { type: "text", text: " " },
        ])
        .run();
    },

    render: () => {
      let renderer: ReactRenderer<MentionMenuRef, MentionMenuProps> | null = null;
      let menu: HTMLElement | null = null;

      const position = (clientRect?: (() => DOMRect | null) | null) => {
        if (!menu || !clientRect) return;
        const rect = clientRect();
        if (!rect) return;
        const margin = 8;
        const menuHeight = menu.offsetHeight || 280;
        const menuWidth = menu.offsetWidth || 256;

        let top = rect.bottom + 6;
        if (top + menuHeight > window.innerHeight - margin) {
          top = Math.max(margin, rect.top - menuHeight - 6);
        }
        let left = rect.left;
        if (left + menuWidth > window.innerWidth - margin) {
          left = Math.max(margin, window.innerWidth - menuWidth - margin);
        }

        menu.style.top = `${Math.round(top)}px`;
        menu.style.left = `${Math.round(left)}px`;
      };

      return {
        onStart: (props: SuggestionProps<MentionItem, MentionItem>) => {
          const r = new ReactRenderer(MentionMenu, {
            editor: props.editor,
            props: {
              items: props.items,
              command: (item: MentionItem) => props.command(item),
            },
          });
          renderer = r;

          const el = document.createElement("div");
          el.style.position = "fixed";
          el.style.zIndex = "1000";
          el.appendChild(r.element);
          document.body.appendChild(el);
          menu = el;
          position(props.clientRect);
        },

        onUpdate: (props: SuggestionProps<MentionItem, MentionItem>) => {
          renderer?.updateProps({
            items: props.items,
            command: (item: MentionItem) => props.command(item),
          });
          position(props.clientRect);
        },

        onKeyDown: (props: SuggestionKeyDownProps) => {
          if (props.event.key === "Escape") {
            return true;
          }
          return renderer?.ref?.onKeyDown(props.event) ?? false;
        },

        onExit: () => {
          renderer?.destroy();
          menu?.remove();
          renderer = null;
          menu = null;
        },
      };
    },
  };
}
