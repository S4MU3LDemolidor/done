import { formatDue, toIsoDate } from "../../lib/parser";
import { TaskRow } from "./TaskRow";
import type { Task } from "../../lib/types";

export interface TaskActions {
  onToggle: (task: Task, checkboxEl: HTMLElement) => void;
  onContextMenu: (task: Task, x: number, y: number) => void;
}

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function byDue(a: Task, b: Task): number {
  return (a.due ?? "9999").localeCompare(b.due ?? "9999");
}

function byTitle(a: Task, b: Task): number {
  return a.title.localeCompare(b.title, "pt-BR");
}

export function pendingTodayTasks(tasks: Task[], now = new Date()): Task[] {
  const today = toIsoDate(now);
  return tasks.filter((t) => !t.done && (!t.due || t.due <= today));
}

export function TodayView({
  tasks,
  actions,
}: {
  tasks: Task[];
  actions: TaskActions;
}) {
  const today = toIsoDate(new Date());
  const overdue = tasks
    .filter((t) => !t.done && t.due && t.due < today)
    .sort(byDue);
  const dueToday = tasks.filter((t) => !t.done && t.due === today);
  const noDate = tasks.filter((t) => !t.done && !t.due);
  const doneToday = tasks.filter(
    (t) => t.done && t.completedAt?.slice(0, 10) === today,
  );

  if (!overdue.length && !dueToday.length && !noDate.length && !doneToday.length) {
    return <EmptyState text="Nada para hoje. Aproveite seu dia ✦" />;
  }

  return (
    <div>
      {overdue.length > 0 && (
        <Section label="Atrasadas" tone="coral">
          {overdue.map((t) => (
            <TaskRow key={t.id} task={t} {...actions} />
          ))}
        </Section>
      )}
      {dueToday.length > 0 && (
        <Section label="Hoje">
          {dueToday.map((t) => (
            <TaskRow key={t.id} task={t} {...actions} />
          ))}
        </Section>
      )}
      {noDate.length > 0 && (
        <Section label="Sem data">
          {noDate.map((t) => (
            <TaskRow key={t.id} task={t} {...actions} />
          ))}
        </Section>
      )}
      {doneToday.length > 0 && (
        <Section label="Concluídas hoje">
          {doneToday.map((t) => (
            <TaskRow key={t.id} task={t} {...actions} />
          ))}
        </Section>
      )}
    </div>
  );
}

export function AgendaView({
  tasks,
  actions,
}: {
  tasks: Task[];
  actions: TaskActions;
}) {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return { date: d, iso: toIsoDate(d) };
  });

  const sections = days
    .map(({ date, iso }) => ({
      date,
      iso,
      items: tasks.filter((t) => !t.done && t.due === iso),
    }))
    .filter((s) => s.items.length > 0);

  if (sections.length === 0) {
    return <EmptyState text="Semana livre. Que tal planejar algo? ✦" />;
  }

  return (
    <div>
      {sections.map(({ date, iso, items }) => (
        <Section
          key={iso}
          label={`${WEEKDAYS_SHORT[date.getDay()]} · ${formatDue(iso, now)}`}
        >
          {items.map((t) => (
            <TaskRow key={t.id} task={t} {...actions} />
          ))}
        </Section>
      ))}
    </div>
  );
}

export function CompletedView({
  tasks,
  actions,
}: {
  tasks: Task[];
  actions: TaskActions;
}) {
  const done = tasks
    .filter((t) => t.done && t.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));

  if (done.length === 0) {
    return <EmptyState text="Nenhuma tarefa concluída ainda. Você consegue ✦" />;
  }

  return (
    <div className="pt-2">
      {done.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          {...actions}
          meta={`${formatDue(t.completedAt!.slice(0, 10))} · +${t.xp} XP`}
        />
      ))}
    </div>
  );
}

export function GroupView({
  name,
  tasks,
  actions,
}: {
  name: string;
  tasks: Task[];
  actions: TaskActions;
}) {
  const inGroup = tasks.filter((t) => t.group === name);
  const pending = inGroup.filter((t) => !t.done).sort(byTitle);
  const done = inGroup.filter((t) => t.done).sort(byTitle);

  if (inGroup.length === 0) {
    return <EmptyState text="Nenhuma tarefa neste grupo." />;
  }

  return (
    <div className="pt-2">
      {pending.map((t) => (
        <TaskRow key={t.id} task={t} {...actions} />
      ))}
      {done.length > 0 && (
        <Section label="Concluídas">
          {done.map((t) => (
            <TaskRow key={t.id} task={t} {...actions} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: "coral";
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <h2
        className={`px-3 pt-4 pb-1.5 text-[11px] font-semibold tracking-wide uppercase ${
          tone === "coral" ? "text-coral" : "text-faint"
        }`}
      >
        {label}
      </h2>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3">
      <span className="text-[28px] text-accent opacity-50">✦</span>
      <p className="text-[14px] text-dim">{text}</p>
    </div>
  );
}
