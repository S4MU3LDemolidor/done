import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { SlashCommands } from "./SlashCommands";

interface NoteEditorProps {
  markdown: string;
  onChange: (markdown: string, doc: object) => void;
}

export function NoteEditor({ markdown, onChange }: NoteEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Escreva algo, ou digite / para comandos…",
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
      }),
      SlashCommands,
    ],
    content: markdown,
    editorProps: {
      attributes: {
        class: "notes-prose focus:outline-none",
      },
    },
    onUpdate({ editor }) {
      // tiptap-markdown stores its API on editor.storage.markdown but types it
      // as generic Storage, so we access it via the raw object.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md: string = (editor.storage as any).markdown.getMarkdown();
      onChange(md, editor.getJSON());
    },
  });

  return <EditorContent editor={editor} />;
}
