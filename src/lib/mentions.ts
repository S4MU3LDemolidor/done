export interface TiptapNode {
  type: string;
  attrs?: Record<string, string>;
  content?: TiptapNode[];
}

export interface MentionResult {
  taskIds: string[];
  groupNames: string[];
}

export function parseMentions(doc: TiptapNode): MentionResult {
  const taskIds: string[] = [];
  const groupNames: string[] = [];
  const seenTaskIds = new Set<string>();
  const seenGroupNames = new Set<string>();

  function walk(node: TiptapNode): void {
    if (node.type === "mention" && node.attrs) {
      const { kind, ref } = node.attrs;
      if (kind === "task" && ref && !seenTaskIds.has(ref)) {
        seenTaskIds.add(ref);
        taskIds.push(ref);
      } else if (kind === "group" && ref && !seenGroupNames.has(ref)) {
        seenGroupNames.add(ref);
        groupNames.push(ref);
      }
    }
    if (node.content) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  walk(doc);
  return { taskIds, groupNames };
}
