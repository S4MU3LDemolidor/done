import { useCallback, useEffect, useRef, useState } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emitTo } from "@tauri-apps/api/event";
import { toIsoDate, toLocalIsoDateTime } from "../../lib/parser";
import { evaluateAchievements, streak, xpForCompletion } from "../../lib/game";
import {
  deleteTask,
  loadAchievements,
  loadTasks,
  saveAchievements,
  saveTask,
  watchTasks,
  type AchievementState,
} from "../../lib/store";
import { fireworksAt } from "../../lib/fireworks";
import { PlusIcon, TrashIcon } from "../../components/Icons";
import { Kbd } from "../../components/Kbd";
import { Sidebar } from "./Sidebar";
import { Toasts, type Toast } from "./Toasts";
import { ACHIEVEMENTS } from "./achievements";
import { ProfileView } from "./ProfileView";
import {
  AgendaView,
  CompletedView,
  GroupView,
  TodayView,
  pendingTodayTasks,
  type TaskActions,
} from "./views";
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
  confirming: boolean;
}

export default function MainApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>({ kind: "today" });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ach, setAch] = useState<AchievementState | null>(null);
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const toastId = useRef(0);

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
    watchTasks(reload).then((fn) => {
      if (cancelled) fn();
      else unwatch = fn;
    });
    return () => {
      cancelled = true;
      unwatch?.();
    };
  }, [reload]);

  const pushToast = useCallback((emoji: string, title: string, sub?: string) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts, { id, emoji, title, sub }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3200);
  }, []);

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
        ACHIEVEMENTS[id].emoji,
        `Conquista: ${ACHIEVEMENTS[id].name}`,
        ACHIEVEMENTS[id].desc,
      );
    }
    setAch(updated);
    saveAchievements(updated).catch((err) =>
      console.error("Falha ao salvar conquistas:", err),
    );
  }, [tasks, loaded, ach, pushToast]);

  // ⌘K abre a barra de adição rápida
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openQuickAdd();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function persist(updated: Task) {
    setTasks((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
    try {
      await saveTask(updated);
    } catch (err) {
      console.error("Falha ao salvar tarefa:", err);
      pushToast("⚠️", "Não foi possível salvar", "Tente de novo");
      reload();
    }
  }

  function toggleTask(task: Task, checkboxEl: HTMLElement) {
    if (!task.done) {
      const now = new Date();
      const xp = xpForCompletion(task.due, now);
      const onTime = task.due !== null && toIsoDate(now) <= task.due;
      fireworksAt(checkboxEl, onTime);
      pushToast("✦", `+${xp} XP`, onTime ? "concluída no prazo!" : undefined);
      persist({
        ...task,
        done: true,
        completedAt: toLocalIsoDateTime(now),
        xp,
      });
    } else {
      persist({ ...task, done: false, completedAt: null, xp: 10 });
    }
  }

  async function removeTask(task: Task) {
    setMenu(null);
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    try {
      await deleteTask(task.id);
    } catch (err) {
      console.error("Falha ao excluir tarefa:", err);
      pushToast("⚠️", "Não foi possível excluir", "Tente de novo");
      reload();
    }
  }

  const actions: TaskActions = {
    onToggle: toggleTask,
    onContextMenu: (task, x, y) => setMenu({ task, x, y, confirming: false }),
  };

  const groups = [...new Set(tasks.map((t) => t.group).filter(Boolean))].sort(
    (a, b) => a!.localeCompare(b!, "pt-BR"),
  ) as string[];
  const todayCount = pendingTodayTasks(tasks).length;
  const { title, subtitle } = headerFor(view, tasks, todayCount);

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Faixa de arrasto da janela (atrás dos semáforos do macOS) */}
      <div data-tauri-drag-region className="absolute inset-x-0 top-0 z-20 h-9" />

      <Sidebar
        view={view}
        setView={setView}
        groups={groups}
        todayCount={todayCount}
        streakDays={streak(tasks)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-end justify-between border-b border-line px-7 pt-11 pb-3.5">
          <div>
            <h1 className="text-[17px] font-semibold tracking-tight text-ink">
              {title}
            </h1>
            {subtitle && <p className="mt-0.5 text-[12px] text-dim">{subtitle}</p>}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          {!loaded ? null : view.kind === "today" ? (
            <TodayView tasks={tasks} actions={actions} />
          ) : view.kind === "agenda" ? (
            <AgendaView tasks={tasks} actions={actions} />
          ) : view.kind === "completed" ? (
            <CompletedView tasks={tasks} actions={actions} />
          ) : view.kind === "profile" ? (
            <ProfileView tasks={tasks} unlocked={ach ?? {}} />
          ) : (
            <GroupView name={view.name} tasks={tasks} actions={actions} />
          )}
        </div>

        {/* Barra de ações (rodapé estilo Raycast) */}
        <footer className="flex h-[38px] shrink-0 items-center justify-between border-t border-line bg-black/20 px-4 text-[12px]">
          <span className="flex items-center gap-1.5 font-medium text-dim">
            <span className="text-accent">✦</span>
            FocusBar
          </span>
          <span className="flex items-center gap-2">
            <button
              onClick={openQuickAdd}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-dim transition-colors duration-150 hover:bg-hover hover:text-ink"
            >
              <PlusIcon size={13} />
              Nova tarefa
              <Kbd>⌥</Kbd>
              <Kbd>␣</Kbd>
            </button>
            <span className="text-white/10">|</span>
            <button
              onClick={openQuickAdd}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-faint transition-colors duration-150 hover:bg-hover hover:text-ink"
            >
              Adição rápida
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </button>
          </span>
        </footer>
      </main>

      {/* Menu de contexto: excluir com confirmação */}
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
              top: Math.min(menu.y, window.innerHeight - 56),
            }}
          >
            <button
              onClick={() =>
                menu.confirming
                  ? removeTask(menu.task)
                  : setMenu({ ...menu, confirming: true })
              }
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors duration-150 ${
                menu.confirming
                  ? "bg-danger-dim font-medium text-danger"
                  : "text-ink hover:bg-hover"
              }`}
            >
              <TrashIcon size={15} className={menu.confirming ? "" : "text-dim"} />
              {menu.confirming ? "Confirmar exclusão?" : "Excluir tarefa"}
            </button>
          </div>
        </>
      )}

      <Toasts toasts={toasts} />
    </div>
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
