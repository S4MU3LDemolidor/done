import type { Task } from "../../lib/types";

export function Dashboard({
  tasks,
  groupCount,
}: {
  tasks: Task[];
  groupCount: number;
}) {
  const total = tasks.length;
  const pending = tasks.filter((t) => !t.done).length;
  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="grid grid-cols-4 gap-3 px-1 pt-3 pb-2">
      <Stat value={total} label={total === 1 ? "tarefa" : "tarefas"} />
      <Stat value={pending} label="pendentes" accent />
      <Stat value={done} label={done === 1 ? "concluída" : "concluídas"} />
      <Stat value={groupCount} label={groupCount === 1 ? "grupo" : "grupos"} />
    </div>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-raised px-4 py-3.5">
      <div
        className={`text-[24px] leading-none font-semibold ${
          accent ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[12px] text-dim">{label}</div>
    </div>
  );
}
