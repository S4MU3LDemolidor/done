import { useRef } from "react";
import { formatDue, isOverdue } from "../../lib/parser";
import { groupColor } from "../../lib/colors";
import type { Task } from "../../lib/types";

interface TaskRowProps {
  task: Task;
  onToggle: (task: Task, checkboxEl: HTMLElement) => void;
  onContextMenu: (task: Task, x: number, y: number) => void;
  /** Texto extra à direita (ex.: "+15 XP" na tela de concluídas) */
  meta?: string;
}

export function TaskRow({ task, onToggle, onContextMenu, meta }: TaskRowProps) {
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const overdue = !task.done && isOverdue(task.due);

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(task, e.clientX, e.clientY);
      }}
      className="group flex h-[46px] items-center gap-3 rounded-lg px-3 transition-colors duration-150 hover:bg-hover"
    >
      <button
        ref={checkboxRef}
        onClick={() => checkboxRef.current && onToggle(task, checkboxRef.current)}
        aria-label={task.done ? "Reabrir tarefa" : "Concluir tarefa"}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 ${
          task.done
            ? "border-accent bg-accent"
            : "border-faint group-hover:border-accent"
        }`}
      >
        {task.done && (
          <svg
            viewBox="0 0 12 12"
            className="animate-check-pop h-[10px] w-[10px]"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m2.5 6.5 2.5 2.5 4.5-5" />
          </svg>
        )}
      </button>

      <span
        className={`min-w-0 flex-1 truncate text-[14px] ${
          task.done ? "text-faint line-through" : "font-medium text-ink"
        }`}
      >
        {task.title}
      </span>

      <span className="flex shrink-0 items-center gap-2.5 text-[12px]">
        {task.group && (
          <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2 py-0.5 text-dim">
            <span
              className="h-[6px] w-[6px] rounded-full"
              style={{ background: groupColor(task.group) }}
            />
            {task.group}
          </span>
        )}
        {meta ? (
          <span className="font-medium text-accent">{meta}</span>
        ) : task.done ? (
          <span className="text-faint">concluído</span>
        ) : task.due ? (
          <span className={overdue ? "font-medium text-coral" : "text-dim"}>
            {overdue ? `atrasada · ${formatDue(task.due)}` : formatDue(task.due)}
          </span>
        ) : null}
      </span>
    </div>
  );
}
