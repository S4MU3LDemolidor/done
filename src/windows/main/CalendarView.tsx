import { useMemo, useState } from "react";
import { monthCells } from "../../lib/calendar";
import { toIsoDate } from "../../lib/parser";
import { TaskRow, type RowActions } from "./TaskRow";
import { ChevronIcon } from "../../components/Icons";
import type { Task } from "../../lib/types";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

interface CalendarViewProps {
  tasks: Task[];
  actions: RowActions;
  selectedId: string | null;
  editingId: string | null;
}

export function CalendarView({
  tasks,
  actions,
  selectedId,
  editingId,
}: CalendarViewProps) {
  const todayIso = toIsoDate(new Date());
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(todayIso);

  const cells = useMemo(
    () => monthCells(cursor.year, cursor.month),
    [cursor],
  );

  // Contagem de tarefas por dia no mês visível
  const { pending, done } = useMemo(() => {
    const prefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
    const pending = new Map<string, number>();
    const done = new Map<string, number>();
    for (const t of tasks) {
      if (!t.due || !t.due.startsWith(prefix)) continue;
      const map = t.done ? done : pending;
      map.set(t.due, (map.get(t.due) ?? 0) + 1);
    }
    return { pending, done };
  }, [tasks, cursor]);

  const dayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.due === selectedDay)
        .sort((a, b) => Number(a.done) - Number(b.done)),
    [tasks, selectedDay],
  );

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function goToday() {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDay(todayIso);
  }

  const selectedLabel = (() => {
    const [, m, d] = selectedDay.split("-").map(Number);
    return `${d} de ${MONTHS[m - 1]}`;
  })();

  return (
    <div className="mx-auto max-w-[620px] pt-3">
      {/* Cabeçalho do mês */}
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold text-ink capitalize">
          {MONTHS[cursor.month]} {cursor.year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="mr-1 rounded-md px-2 py-1 text-[12px] text-dim transition-colors duration-150 hover:bg-hover hover:text-ink"
          >
            Hoje
          </button>
          <button
            onClick={() => shiftMonth(-1)}
            aria-label="Mês anterior"
            className="flex h-7 w-7 items-center justify-center rounded-md text-dim transition-colors duration-150 hover:bg-hover hover:text-ink"
          >
            <ChevronIcon size={16} className="rotate-180" />
          </button>
          <button
            onClick={() => shiftMonth(1)}
            aria-label="Próximo mês"
            className="flex h-7 w-7 items-center justify-center rounded-md text-dim transition-colors duration-150 hover:bg-hover hover:text-ink"
          >
            <ChevronIcon size={16} />
          </button>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 px-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="pb-1.5 text-center text-[11px] font-medium text-faint"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grade do mês */}
      <div className="grid grid-cols-7 gap-1 px-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`b${i}`} />;
          const isToday = cell.iso === todayIso;
          const isSelected = cell.iso === selectedDay;
          const nPending = pending.get(cell.iso) ?? 0;
          const nDone = done.get(cell.iso) ?? 0;
          const overdue = nPending > 0 && cell.iso < todayIso;
          return (
            <button
              key={cell.iso}
              onClick={() => setSelectedDay(cell.iso)}
              className={`flex h-[46px] flex-col items-center justify-center gap-1 rounded-lg text-[13px] transition-colors duration-150 ${
                isSelected
                  ? "bg-accent text-white"
                  : isToday
                    ? "bg-accent-dim text-accent"
                    : "text-ink hover:bg-hover"
              }`}
            >
              <span className={isToday && !isSelected ? "font-semibold" : ""}>
                {cell.day}
              </span>
              <span className="flex h-[5px] items-center gap-[3px]">
                {nPending > 0 && (
                  <span
                    className="h-[5px] w-[5px] rounded-full"
                    style={{
                      background: isSelected
                        ? "#fff"
                        : overdue
                          ? "var(--color-overdue)"
                          : "var(--color-accent)",
                    }}
                  />
                )}
                {nPending === 0 && nDone > 0 && (
                  <span
                    className="h-[5px] w-[5px] rounded-full"
                    style={{ background: isSelected ? "#ffffff80" : "#ffffff30" }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tarefas do dia selecionado */}
      <div className="mt-5">
        <h3 className="px-3 pb-1 text-[12px] font-semibold text-dim">
          {selectedLabel}
        </h3>
        {dayTasks.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-faint">
            Nada neste dia.
          </p>
        ) : (
          dayTasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              selected={t.id === selectedId}
              editing={t.id === editingId}
              {...actions}
            />
          ))
        )}
      </div>
    </div>
  );
}
