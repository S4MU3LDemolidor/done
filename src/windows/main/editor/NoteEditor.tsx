import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { SlashCommands } from "./SlashCommands";
import { LinkMention, buildMentionSuggestion } from "./LinkMention";
import { groupColor } from "../../../lib/colors";
import type { GroupColors } from "../../../lib/store";
import type { Task } from "../../../lib/types";

interface NoteEditorProps {
  markdown: string;
  onChange: (markdown: string, doc: object) => void;
  tasks: Task[];
  groups: string[];
  groupColors: GroupColors;
  /** Called once the editor instance is ready (and null on teardown) so the
   *  parent can drive it imperatively (remove/insert mentions from chip rows). */
  onEditorReady?: (editor: Editor | null) => void;
}

export function NoteEditor({
  markdown,
  onChange,
  tasks,
  groups,
  groupColors,
  onEditorReady,
}: NoteEditorProps) {
  // Refs hold the latest data so the mention extension (created once) always
  // searches the current tasks/groups without re-creating the editor.
  const tasksRef = useRef(tasks);
  const groupsRef = useRef(groups);
  const groupColorsRef = useRef(groupColors);
  tasksRef.current = tasks;
  groupsRef.current = groups;
  groupColorsRef.current = groupColors;

  const getTasks = () => tasksRef.current;
  const getGroups = () => groupsRef.current;
  const getGroupColor = (name: string) => groupColor(name, groupColorsRef.current);

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
      LinkMention.configure({
        getTasks,
        getGroups,
        getGroupColor,
        suggestion: buildMentionSuggestion({
          getTasks,
          getGroups,
          getGroupColor,
        }),
      }),
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

  // Expose the editor instance to the parent for imperative chip-row actions.
  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  return <EditorContent editor={editor} />;
}
