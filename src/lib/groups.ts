import { groupColor } from "./colors";
import type { Task } from "./types";

export interface GroupInfo {
  name: string;
  color: string;
}

/** Grupos existentes derivados das TAREFAS — um grupo só existe se houver ao
 *  menos uma tarefa com ele. As cores salvas (groups.json) servem apenas para
 *  colorir; grupos sem tarefas (ex.: excluídos) não reaparecem. */
export function deriveGroups(
  tasks: Task[],
  colors: Record<string, string>,
): GroupInfo[] {
  const names = new Set<string>();
  for (const t of tasks) if (t.group) names.add(t.group);
  return [...names]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((name) => ({ name, color: groupColor(name, colors) }));
}
