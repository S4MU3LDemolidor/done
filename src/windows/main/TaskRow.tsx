import { useEffect, useRef } from "react";
import { formatDue, isOverdue, toEditText } from "../../lib/parser";
import { useGroupColor } from "./GroupColorContext";
import type { Task } from "../../lib/types";

export interface RowActions {
  onToggle: (task: Task, checkboxEl: HTMLElement) => void;
  onContextMenu: (task: Task, x: number, y: number) => void;
  onSelect: (task: Task) => void;
  onStartEdit: (task: Task) => void;
  onSubmitEdit: (task: Task, text: string) => void;
  onCancelEdit: () => void;
}

interface TaskRowProps extends RowActions {
  task: Task;
  selected: boolean;
  editing: boolean;
  meta?: string;
}

export function TaskRow({
  task,
  selected,
  editing,
  meta,
  onToggle,
  onContextMenu,
  onSelect,
  onStartEdit,
  onSubmitEdit,
  onCancelEdit,
}: TaskRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const overdue = !task.done && isOverdue(task.due);

  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (editing) {
    return (
      <div className="flex h-[46px] items-center gap-3 rounded-lg bg-white/[0.06] px-3 ring-1 ring-accent/60">
        <span className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] border-faint" />
        <input
          autoFocus
          defaultValue={toEditText(task)}
          spellCheck={false}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmitEdit(task, e.currentTarget.value);
            if (e.key === "Escape") onCancelEdit();
          }}
          onBlur={onCancelEdit}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none"
        />
        <span className="shrink-0 text-[11px] text-faint">↵ salvar · esc cancelar</span>
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      data-task-id={task.id}
      onClick={() => onSelect(task)}
      onDoubleClick={() => onStartEdit(task)}
      onContextMenu={(e) => {
        e.preventDefault();
        onSelect(task);
        onContextMenu(task, e.clientX, e.clientY);
      }}
      className={`group flex h-[46px] items-center gap-3 rounded-lg px-3 transition-colors duration-150 ${
        selected ? "bg-white/[0.07]" : "hover:bg-hover"
      }`}
    >
      <button
        ref={checkboxRef}
        data-checkbox
        onClick={(e) => {
          e.stopPropagation();
          if (checkboxRef.current) onToggle(task, checkboxRef.current);
        }}
        aria-label={task.done ? "Reabrir tarefa" : "Concluir tarefa"}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150 ${
          task.done
            ? "border-accent bg-accent"
            : overdue
              ? "border-overdue group-hover:border-accent"
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
        {task.group && <GroupPill name={task.group} />}
        {meta ? (
          <span className="font-medium text-accent">{meta}</span>
        ) : task.done ? (
          <span className="text-faint">concluído</span>
        ) : task.due ? (
          <span className={overdue ? "font-medium text-overdue" : "text-dim"}>
            {overdue ? `atrasada · ${formatDue(task.due)}` : formatDue(task.due)}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function GroupPill({ name }: { name: string }) {
  const color = useGroupColor(name);
  return (
    <span
      className="rounded-[5px] px-2 py-0.5 text-[11px] font-medium"
      style={{ background: `${color}26`, color }}
    >
      {name}
    </span>
  );
}
