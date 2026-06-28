import { FolderIcon } from "../../components/Icons";
import { MoneyGlyph } from "../../components/glyphs";
import { useGroupColor } from "./GroupColorContext";
import { clientCount, formatBRL, totalMonthly } from "../../lib/clients";
import type { ClientMap } from "../../lib/store";
import type { Task } from "../../lib/types";

export function Dashboard({
  tasks,
  groups,
  clients,
  onOpenGroup,
}: {
  tasks: Task[];
  groups: string[];
  clients: ClientMap;
  onOpenGroup: (name: string) => void;
}) {
  if (groups.length === 0) return null;
  const nClients = clientCount(clients);
  return (
    <div className="px-1 pt-2 pb-1">
      {nClients > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-accent/25 bg-accent/[0.08] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <MoneyGlyph size={18} />
            </span>
            <div>
              <div className="text-[11px] font-semibold tracking-wide text-faint uppercase">
                Receita mensal
              </div>
              <div className="text-[20px] font-semibold text-ink">
                {formatBRL(totalMonthly(clients))}
                <span className="text-[13px] font-normal text-dim"> /mês</span>
              </div>
            </div>
          </div>
          <div className="text-[12px] text-dim">
            {nClients} {nClients === 1 ? "cliente" : "clientes"}
          </div>
        </div>
      )}
      <h2 className="px-1 pb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">
        Acesso rápido
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {groups.map((g) => (
          <GroupCard
            key={g}
            name={g}
            tasks={tasks}
            monthly={clients[g]}
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
  monthly,
  onOpen,
}: {
  name: string;
  tasks: Task[];
  monthly: number | undefined;
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
      {monthly !== undefined && (
        <span className="text-[12px] font-semibold text-accent">
          {formatBRL(monthly)} <span className="font-normal text-dim">/mês</span>
        </span>
      )}
    </button>
  );
}
