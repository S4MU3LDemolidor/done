import { FolderIcon } from "../../components/Icons";
import { useGroupColor } from "./GroupColorContext";
import type { Task } from "../../lib/types";

export function Dashboard({
  tasks,
  groups,
  onOpenGroup,
}: {
  tasks: Task[];
  groups: string[];
  onOpenGroup: (name: string) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="px-1 pt-2 pb-1">
      <h2 className="px-1 pb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">
        Acesso rápido
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {groups.map((g) => (
          <GroupCard
            key={g}
            name={g}
            tasks={tasks}
            onOpen={() => onOpenGroup(g)}
          />
        ))}
      </div>
    </div>
  );
}

function GroupCard({
  name,
  tasks,
  onOpen,
}: {
  name: string;
  tasks: Task[];
  onOpen: () => void;
}) {
  const color = useGroupColor(name);
  const inGroup = tasks.filter((t) => t.group === name);
  const total = inGroup.length;
  const pending = inGroup.filter((t) => !t.done).length;

  return (
    <button
      onClick={onOpen}
      className="flex flex-col items-start gap-2.5 rounded-xl border p-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5"
      style={{ background: `${color}12`, borderColor: `${color}33` }}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ background: `${color}26`, color }}
      >
        <FolderIcon size={18} />
      </span>
      <span className="w-full truncate text-[14px] font-medium text-ink">
        {name}
      </span>
      <span className="text-[12px] text-dim">
        {total} {total === 1 ? "tarefa" : "tarefas"} · {pending}{" "}
        {pending === 1 ? "pendente" : "pendentes"}
      </span>
    </button>
  );
}
