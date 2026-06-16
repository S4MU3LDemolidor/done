import { formatDue, toIsoDate } from "../../lib/parser";
import { TaskRow, type RowActions } from "./TaskRow";
import type { Task } from "../../lib/types";
import type { View } from "./MainApp";

export interface TaskSection {
  key: string;
  label?: string;
  count?: number;
  tone?: "overdue";
  /** Esconde a etiqueta de grupo nas linhas (quando o título da seção já é o grupo) */
  hideGroupPill?: boolean;
  /** Texto extra à direita por tarefa (ex.: data + XP nas concluídas) */
  metaFor?: (t: Task) => string;
  items: Task[];
}

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

/** Seções na mesma ordem em que são renderizadas — base da navegação por teclado. */
export function sectionsFor(
  view: View,
  tasks: Task[],
  now: Date = new Date(),
): TaskSection[] {
  switch (view.kind) {
    case "today": {
      const today = toIsoDate(now);
      const overdue = tasks
        .filter((t) => !t.done && t.due && t.due < today)
        .sort(byDue);
      const dueToday = tasks.filter((t) => !t.done && t.due === today);
      const noDate = tasks.filter((t) => !t.done && !t.due);
      const doneToday = tasks.filter(
        (t) => t.done && t.completedAt?.slice(0, 10) === today,
      );
      return [
        {
          key: "overdue",
          label: "Atrasadas",
          tone: "overdue" as const,
          count: overdue.length,
          items: overdue,
        },
        { key: "due-today", label: "Hoje", count: dueToday.length, items: dueToday },
        { key: "no-date", label: "Sem data", count: noDate.length, items: noDate },
        {
          key: "done-today",
          label: "Concluídas hoje",
          count: doneToday.length,
          items: doneToday,
        },
      ].filter((s) => s.items.length > 0);
    }

    case "agenda":
      return []; // a Agenda agora é renderizada pelo CalendarView

    case "completed": {
      const done = tasks
        .filter((t) => t.done && t.completedAt)
        .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
      return done.length === 0
        ? []
        : [
            {
              key: "done",
              metaFor: (t: Task) =>
                `${formatDue(t.completedAt!.slice(0, 10), now)} · +${t.xp} XP`,
              items: done,
            },
          ];
    }

    case "group": {
      const inGroup = tasks.filter((t) => t.group === view.name);
      const pending = inGroup.filter((t) => !t.done).sort(byTitle);
      const done = inGroup.filter((t) => t.done).sort(byTitle);
      const sections: TaskSection[] = [];
      if (pending.length > 0) sections.push({ key: "pending", items: pending });
      if (done.length > 0)
        sections.push({
          key: "done",
          label: "Concluídas",
          count: done.length,
          items: done,
        });
      return sections;
    }

    case "all": {
      const groupNames = [
        ...new Set(tasks.map((t) => t.group).filter(Boolean) as string[]),
      ].sort((a, b) => a.localeCompare(b, "pt-BR"));
      const sections: TaskSection[] = [];
      const sectionFor = (key: string, label: string, items: Task[]) => {
        const pending = items.filter((t) => !t.done).sort(byDue);
        const done = items.filter((t) => t.done).sort(byTitle);
        return {
          key,
          label,
          count: items.length,
          hideGroupPill: true,
          items: [...pending, ...done],
        };
      };
      for (const g of groupNames) {
        sections.push(sectionFor(g, g, tasks.filter((t) => t.group === g)));
      }
      const ungrouped = tasks.filter((t) => !t.group);
      if (ungrouped.length > 0) {
        sections.push(sectionFor("__none", "Sem grupo", ungrouped));
      }
      return sections;
    }

    case "profile":
      return [];
  }
}

export function emptyTextFor(view: View): string {
  switch (view.kind) {
    case "today":
      return "Nada para hoje. Aproveite seu dia ✦";
    case "agenda":
      return "Semana livre. Que tal planejar algo? ✦";
    case "completed":
      return "Nenhuma tarefa concluída ainda. Você consegue ✦";
    case "all":
      return "Nenhuma tarefa ainda. Adicione a primeira ✦";
    default:
      return "Nenhuma tarefa neste grupo.";
  }
}

export function TaskList({
  sections,
  view,
  actions,
  selectedId,
  editingId,
}: {
  sections: TaskSection[];
  view: View;
  actions: RowActions;
  selectedId: string | null;
  editingId: string | null;
}) {
  if (sections.length === 0) {
    return <EmptyState text={emptyTextFor(view)} />;
  }

  return (
    <div className="pt-2">
      {sections.map((section) => (
        <section key={section.key} className="mb-4">
          {section.label && (
            <h2 className="flex items-baseline gap-2 px-3 pt-4 pb-1.5">
              <span
                className={`text-[12px] font-semibold ${
                  section.tone === "overdue" ? "text-overdue" : "text-dim"
                }`}
              >
                {section.label}
              </span>
              {section.count !== undefined && (
                <span className="text-[11px] text-faint">
                  {section.count} {section.count === 1 ? "tarefa" : "tarefas"}
                </span>
              )}
            </h2>
          )}
          {section.items.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              selected={t.id === selectedId}
              editing={t.id === editingId}
              meta={section.metaFor?.(t)}
              hideGroup={section.hideGroupPill}
              {...actions}
            />
          ))}
        </section>
      ))}
    </div>
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
