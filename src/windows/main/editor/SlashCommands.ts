import { Extension } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import {
  BulletListIcon,
  CodeBlockIcon,
  DividerIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  OrderedListIcon,
  TaskListIcon,
  TextIcon,
} from "../../../components/Icons";
import { SlashMenu, type SlashMenuRef } from "./SlashMenu";
import type { ComponentProps, ComponentType } from "react";

interface IconProps {
  size?: number;
  className?: string;
}

type SlashMenuProps = ComponentProps<typeof SlashMenu>;

export interface SlashItem {
  key: string;
  title: string;
  glyph: ComponentType<IconProps>;
  /** Applies the block command after the "/query" range has been removed. */
  command: (editor: Editor, range: Range) => void;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const ITEMS: SlashItem[] = [
  {
    key: "paragraph",
    title: "Texto",
    glyph: TextIcon,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    key: "heading-1",
    title: "Título 1",
    glyph: Heading1Icon,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run(),
  },
  {
    key: "heading-2",
    title: "Título 2",
    glyph: Heading2Icon,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
  },
  {
    key: "heading-3",
    title: "Título 3",
    glyph: Heading3Icon,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run(),
  },
  {
    key: "bullet-list",
    title: "Lista com marcadores",
    glyph: BulletListIcon,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    key: "ordered-list",
    title: "Lista numerada",
    glyph: OrderedListIcon,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    key: "task-list",
    title: "Lista de tarefas",
    glyph: TaskListIcon,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    key: "code-block",
    title: "Bloco de código",
    glyph: CodeBlockIcon,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    key: "divider",
    title: "Divisor",
    glyph: DividerIcon,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

export const slashCommandsPluginKey = new PluginKey("slashCommands");

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        pluginKey: slashCommandsPluginKey,

        items: ({ query }) => {
          const q = norm(query.trim());
          if (!q) return ITEMS;
          return ITEMS.filter((item) => norm(item.title).includes(q));
        },

        command: ({ editor, range, props }) => {
          props.command(editor, range);
        },

        render: () => {
          let renderer: ReactRenderer<SlashMenuRef, SlashMenuProps> | null =
            null;
          let menu: HTMLElement | null = null;

          const position = (clientRect?: (() => DOMRect | null) | null) => {
            if (!menu || !clientRect) return;
            const rect = clientRect();
            if (!rect) return;
            const margin = 8;
            const menuHeight = menu.offsetHeight || 280;
            const menuWidth = menu.offsetWidth || 232;

            // Prefer opening below the caret; flip above if it would overflow.
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
            onStart: (props: SuggestionProps<SlashItem, SlashItem>) => {
              const r = new ReactRenderer(SlashMenu, {
                editor: props.editor,
                props: {
                  items: props.items,
                  command: (item: SlashItem) => props.command(item),
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

            onUpdate: (props: SuggestionProps<SlashItem, SlashItem>) => {
              renderer?.updateProps({
                items: props.items,
                command: (item: SlashItem) => props.command(item),
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
      }),
    ];
  },
});
