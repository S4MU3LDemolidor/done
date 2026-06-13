import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emitTo } from "@tauri-apps/api/event";
import { parseTask, toIsoDate, toLocalIsoDateTime } from "../../lib/parser";
import { evaluateAchievements, streak, xpForCompletion } from "../../lib/game";
import {
  deleteTask,
  loadAchievements,
  loadGroupColors,
  loadTasks,
  saveAchievements,
  saveGroupColors,
  saveTask,
  watchTasks,
  type AchievementState,
  type GroupColors,
} from "../../lib/store";
import { fireworksAt } from "../../lib/fireworks";
import { PencilIcon, PlusIcon, TrashIcon } from "../../components/Icons";
import {
  AchievementBadge,
  SparkGlyph,
  TrashGlyph,
  WarnGlyph,
} from "../../components/glyphs";
import { Kbd } from "../../components/Kbd";
import { Sidebar } from "./Sidebar";
import { Toasts, type Toast } from "./Toasts";
import { GroupColorProvider } from "./GroupColorContext";
import { GroupEditor, type GroupEditorTarget } from "./GroupEditor";
import { ACHIEVEMENTS } from "./achievements";
import { ProfileView } from "./ProfileView";
import {
  TaskList,
  pendingTodayTasks,
  sectionsFor,
} from "./views";
import type { RowActions } from "./TaskRow";
import type { ReactNode } from "react";
import type { Task } from "../../lib/types";

export type View =
  | { kind: "today" }
  | { kind: "agenda" }
  | { kind: "completed" }
  | { kind: "profile" }
  | { kind: "group"; name: string };

interface ContextMenu {
  task: Task;
  x: number;
  y: number;
}

export default function MainApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setViewRaw] = useState<View>({ kind: "today" });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ach, setAch] = useState<AchievementState | null>(null);
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupColors, setGroupColors] = useState<GroupColors>({});
  const [groupEditor, setGroupEditor] = useState<GroupEditorTarget | null>(null);
  const toastId = useRef(0);

  const setView = useCallback((v: View) => {
    setViewRaw(v);
    setSelectedId(null);
    setEditingId(null);
    setMenu(null);
  }, []);

  const reload = useCallback(async () => {
    try {
      setTasks(await loadTasks());
      setLoaded(true);
    } catch (err) {
      console.error("Falha ao carregar tarefas:", err);
    }
  }, []);

  // Carga inicial + observador da pasta de tarefas
  useEffect(() => {
    let cancelled = false;
    let unwatch: (() => void) | undefined;
    reload();
    loadAchievements().then((a) => {
      if (!cancelled) setAch(a);
    });
    loadGroupColors().then((c) => {
      if (!cancelled) setGroupColors(c);
    });
    watchTasks(reload).then((fn) => {
      if (cancelled) fn();
      else unwatch = fn;
    });
    return () => {
      cancelled = true;
      unwatch?.();
    };
  }, [reload]);

  const pushToast = useCallback(
    (icon: ReactNode, title: string, sub?: string, action?: Toast["action"]) => {
      const id = ++toastId.current;
      setToasts((ts) => [...ts, { id, icon, title, sub, action }]);
      setTimeout(
        () => setToasts((ts) => ts.filter((t) => t.id !== id)),
        action ? 5000 : 3200,
      );
    },
    [],
  );

  function runToastAction(toast: Toast) {
    toast.action?.run();
    setToasts((ts) => ts.filter((t) => t.id !== toast.id));
  }

  // Conquistas: avalia a cada mudança e persiste as novas
  useEffect(() => {
    if (!loaded || ach === null) return;
    const earned = evaluateAchievements(tasks);
    const fresh = earned.filter((id) => !ach[id]);
    if (fresh.length === 0) return;
    const now = toLocalIsoDateTime(new Date());
    const updated = { ...ach };
    for (const id of fresh) {
      updated[id] = now;
      pushToast(
        <AchievementBadge id={id} size={22} />,
        `Conquista: ${ACHIEVEMENTS[id].name}`,
        ACHIEVEMENTS[id].desc,
      );
    }
    setAch(updated);
    saveAchievements(updated).catch((err) =>
      console.error("Falha ao salvar conquistas:", err),
    );
  }, [tasks, loaded, ach, pushToast]);

  async function persist(updated: Task) {
    setTasks((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
    try {
      await saveTask(updated);
    } catch (err) {
      console.error("Falha ao salvar tarefa:", err);
      pushToast(<WarnGlyph className="text-overdue" />, "Não foi possível salvar", "Tente de novo");
      reload();
    }
  }

  function toggleTask(task: Task, checkboxEl: HTMLElement) {
    if (!task.done) {
      const now = new Date();
      const xp = xpForCompletion(task.due, now);
      const onTime = task.due !== null && toIsoDate(now) <= task.due;
      const completed: Task = {
        ...task,
        done: true,
        completedAt: toLocalIsoDateTime(now),
        xp,
      };
      fireworksAt(checkboxEl, onTime);
      pushToast(
        <SparkGlyph className="text-accent" />,
        `+${xp} XP`,
        onTime ? "concluída no prazo!" : undefined,
        {
          label: "Desfazer",
          run: () => persist({ ...task, done: false, completedAt: null, xp: 10 }),
        },
      );
      persist(completed);
    } else {
      persist({ ...task, done: false, completedAt: null, xp: 10 });
    }
  }

  async function removeTask(task: Task) {
    setMenu(null);
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    if (selectedId === task.id) setSelectedId(null);
    try {
      await deleteTask(task.id);
      pushToast(<TrashGlyph className="text-danger" />, "Tarefa excluída", task.title, {
        label: "Desfazer",
        run: () => {
          saveTask(task).catch((err) =>
            console.error("Falha ao restaurar tarefa:", err),
          );
        },
      });
    } catch (err) {
      console.error("Falha ao excluir tarefa:", err);
      pushToast(<WarnGlyph className="text-overdue" />, "Não foi possível excluir", "Tente de novo");
      reload();
    }
  }

  function setGroupColor(name: string, color: string) {
    setGroupColors((prev) => {
      const next = { ...prev, [name]: color };
      saveGroupColors(next).catch((err) =>
        console.error("Falha ao salvar cores de grupo:", err),
      );
      return next;
    });
  }

  async function renameGroup(oldName: string, newName: string) {
    setGroupEditor(null);
    if (tasks.some((t) => t.group === newName)) {
      pushToast(
        <WarnGlyph className="text-overdue" />,
        "Esse grupo já existe",
        `"${newName}" já está em uso`,
      );
      return;
    }
    // Renomeia a cor salva
    setGroupColors((prev) => {
      if (!prev[oldName]) return prev;
      const next = { ...prev, [newName]: prev[oldName] };
      delete next[oldName];
      saveGroupColors(next).catch((err) =>
        console.error("Falha ao salvar cores de grupo:", err),
      );
      return next;
    });
    // Reescreve as tarefas do grupo
    const affected = tasks.filter((t) => t.group === oldName);
    setTasks((ts) =>
      ts.map((t) => (t.group === oldName ? { ...t, group: newName } : t)),
    );
    for (const t of affected) {
      try {
        await saveTask({ ...t, group: newName });
      } catch (err) {
        console.error("Falha ao renomear grupo na tarefa:", err);
      }
    }
    if (view.kind === "group" && view.name === oldName) {
      setViewRaw({ kind: "group", name: newName });
    }
  }

  async function deleteGroup(name: string) {
    setGroupEditor(null);
    const affected = tasks.filter((t) => t.group === name);
    if (affected.length === 0) return;
    setTasks((ts) =>
      ts.map((t) => (t.group === name ? { ...t, group: null } : t)),
    );
    if (view.kind === "group" && view.name === name) setView({ kind: "today" });
    for (const t of affected) {
      try {
        await saveTask({ ...t, group: null });
      } catch (err) {
        console.error("Falha ao remover grupo da tarefa:", err);
      }
    }
    pushToast(
      <TrashGlyph className="text-danger" />,
      "Grupo excluído",
      `${affected.length} ${affected.length === 1 ? "tarefa" : "tarefas"} sem grupo`,
      {
        label: "Desfazer",
        run: () => {
          setTasks((ts) =>
            ts.map((t) =>
              affected.some((a) => a.id === t.id) ? { ...t, group: name } : t,
            ),
          );
          affected.forEach((t) =>
            saveTask(t).catch((err) =>
              console.error("Falha ao restaurar grupo:", err),
            ),
          );
        },
      },
    );
  }

  function submitEdit(task: Task, text: string) {
    setEditingId(null);
    const parsed = parseTask(text);
    if (!parsed.title.trim()) return;
    persist({
      ...task,
      title: parsed.title.trim(),
      due: parsed.due,
      group: parsed.group,
    });
  }

  const sections = useMemo(
    () => sectionsFor(view, tasks),
    [view, tasks],
  );
  const flatTasks = useMemo(
    () => sections.flatMap((s) => s.items),
    [sections],
  );

  // Navegação por teclado: ↑↓ seleciona, ↵ conclui, ⌫ exclui, E edita
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openQuickAdd();
        return;
      }
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (view.kind === "profile" || flatTasks.length === 0) return;

      const index = flatTasks.findIndex((t) => t.id === selectedId);
      const selected = index >= 0 ? flatTasks[index] : null;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = flatTasks[Math.min(index + 1, flatTasks.length - 1)];
          setSelectedId(next.id);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = flatTasks[index <= 0 ? 0 : index - 1];
          setSelectedId(prev.id);
          break;
        }
        case "Enter": {
          if (!selected) return;
          e.preventDefault();
          const checkbox = document.querySelector<HTMLElement>(
            `[data-task-id="${selected.id}"] [data-checkbox]`,
          );
          if (checkbox) toggleTask(selected, checkbox);
          break;
        }
        case "Backspace":
        case "Delete": {
          if (!selected) return;
          e.preventDefault();
          const next = flatTasks[index + 1] ?? flatTasks[index - 1];
          removeTask(selected);
          setSelectedId(next?.id ?? null);
          break;
        }
        case "e":
        case "E": {
          if (!selected) return;
          e.preventDefault();
          setEditingId(selected.id);
          break;
        }
        case "Escape": {
          setMenu(null);
          setSelectedId(null);
          break;
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const actions: RowActions = {
    onToggle: toggleTask,
    onContextMenu: (task, x, y) => setMenu({ task, x, y }),
    onSelect: (task) => setSelectedId(task.id),
    onStartEdit: (task) => {
      setSelectedId(task.id);
      setEditingId(task.id);
    },
    onSubmitEdit: submitEdit,
    onCancelEdit: () => setEditingId(null),
  };

  const groups = [...new Set(tasks.map((t) => t.group).filter(Boolean))].sort(
    (a, b) => a!.localeCompare(b!, "pt-BR"),
  ) as string[];
  const todayCount = pendingTodayTasks(tasks).length;
  const { title, subtitle } = headerFor(view, tasks, todayCount);

  return (
    <GroupColorProvider value={groupColors}>
    <div className="app-glass relative flex h-full overflow-hidden bg-[rgba(24,24,27,0.42)]">
      {/* Faixa de arrasto da janela (atrás dos semáforos do macOS) */}
      <div data-tauri-drag-region className="absolute inset-x-0 top-0 z-20 h-9" />

      <Sidebar
        view={view}
        setView={setView}
        groups={groups}
        todayCount={todayCount}
        streakDays={streak(tasks)}
        onEditGroup={(name, x, y) => setGroupEditor({ name, x, y })}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header
          data-tauri-drag-region
          className="flex items-end justify-between border-b border-line px-7 pt-11 pb-3.5"
        >
          <div data-tauri-drag-region>
            <h1
              data-tauri-drag-region
              className="text-[17px] font-semibold tracking-tight text-ink"
            >
              {title}
            </h1>
            {subtitle && (
              <p data-tauri-drag-region className="mt-0.5 text-[12px] text-dim">
                {subtitle}
              </p>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          {!loaded ? null : view.kind === "profile" ? (
            <ProfileView tasks={tasks} unlocked={ach ?? {}} />
          ) : (
            <TaskList
              sections={sections}
              view={view}
              actions={actions}
              selectedId={selectedId}
              editingId={editingId}
            />
          )}
        </div>

        {/* Barra de ações (rodapé estilo Raycast) */}
        <footer
          data-tauri-drag-region
          className="flex h-[38px] shrink-0 items-center justify-between border-t border-line bg-black/20 px-4 text-[12px]"
        >
          <span
            data-tauri-drag-region
            className="flex items-center gap-1.5 font-medium text-dim"
          >
            <span data-tauri-drag-region className="text-accent">
              ✦
            </span>
            Done
          </span>
          <span className="flex items-center gap-2">
            {selectedId ? (
              <span className="flex items-center gap-2 text-faint">
                <span className="flex items-center gap-1">
                  <Kbd>↵</Kbd> concluir
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>E</Kbd> editar
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>⌫</Kbd> excluir
                </span>
                <span className="text-white/10">|</span>
              </span>
            ) : null}
            <button
              onClick={openQuickAdd}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-dim transition-colors duration-150 hover:bg-hover hover:text-ink"
            >
              <PlusIcon size={13} />
              Nova tarefa
              <Kbd>⌥</Kbd>
              <Kbd>␣</Kbd>
            </button>
          </span>
        </footer>
      </main>

      {/* Menu de contexto */}
      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onMouseDown={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
            }}
          />
          <div
            className="animate-fade-in fixed z-50 w-[200px] rounded-xl border border-white/10 bg-raised p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
            style={{
              left: Math.min(menu.x, window.innerWidth - 210),
              top: Math.min(menu.y, window.innerHeight - 92),
            }}
          >
            <button
              onClick={() => {
                setMenu(null);
                setSelectedId(menu.task.id);
                setEditingId(menu.task.id);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink transition-colors duration-150 hover:bg-hover"
            >
              <PencilIcon size={15} className="text-dim" />
              Editar tarefa
            </button>
            <button
              onClick={() => removeTask(menu.task)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-danger transition-colors duration-150 hover:bg-danger-dim"
            >
              <TrashIcon size={15} />
              Excluir tarefa
            </button>
          </div>
        </>
      )}

      {groupEditor && (
        <GroupEditor
          target={groupEditor}
          colors={groupColors}
          onRename={renameGroup}
          onSetColor={setGroupColor}
          onDelete={deleteGroup}
          onClose={() => setGroupEditor(null)}
        />
      )}

      <Toasts toasts={toasts} onAction={runToastAction} />
    </div>
    </GroupColorProvider>
  );
}

async function openQuickAdd() {
  const win = await WebviewWindow.getByLabel("quickadd");
  if (!win) return;
  await emitTo("quickadd", "quickadd:shown");
  await win.center();
  await win.show();
  await win.setFocus();
}

function headerFor(
  view: View,
  tasks: Task[],
  todayCount: number,
): { title: string; subtitle: string | null } {
  switch (view.kind) {
    case "today":
      return {
        title: "Hoje",
        subtitle:
          todayCount === 0
            ? "tudo em dia"
            : `${todayCount} ${todayCount === 1 ? "tarefa" : "tarefas"}`,
      };
    case "agenda":
      return { title: "Agenda", subtitle: "próximos 7 dias" };
    case "completed": {
      const n = tasks.filter((t) => t.done).length;
      return {
        title: "Concluídas",
        subtitle: `${n} ${n === 1 ? "tarefa" : "tarefas"}`,
      };
    }
    case "profile":
      return { title: "Perfil", subtitle: null };
    case "group": {
      const n = tasks.filter((t) => t.group === view.name && !t.done).length;
      return {
        title: view.name,
        subtitle: `${n} ${n === 1 ? "pendente" : "pendentes"}`,
      };
    }
  }
}
