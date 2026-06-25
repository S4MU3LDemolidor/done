import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emitTo } from "@tauri-apps/api/event";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { normalizeText } from "../lib/text";
import { toIsoDate, toLocalIsoDateTime } from "../lib/parser";
import { xpForCompletion } from "../lib/game";
import { formatTimer } from "../lib/focus";
import { appendFocusSession, loadGroups, loadTasks, saveTask, type GroupInfo } from "../lib/store";
import { CheckCircleIcon } from "../components/Icons";
import { FocusGlyph, SparkGlyph } from "../components/glyphs";
import { Kbd } from "../components/Kbd";
import type { Task } from "../lib/types";

const win = getCurrentWebviewWindow();

const PICKER_W = 440;
const WIDGET_W = 270;
const WIDGET_H = 156;
const MINI_W = 124;
const MINI_H = 44;
const INPUT_H = 54;
const ROW_H = 38;
const FOOTER_H = 34;
const MAX_ROWS = 5;

const PRESETS = [15, 25, 45];
const DEFAULT_MIN = 25;

type Mode = "picker" | "running" | "mini";

/** Pendentes primeiro por prazo (vencidas/hoje no topo), sem prazo por último. */
function orderForPicker(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.due ?? "9999-99-99").localeCompare(b.due ?? "9999-99-99"));
}

export default function Focus() {
  const [mode, setMode] = useState<Mode>("picker");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const [active, setActive] = useState<Task | null>(null);
  const [sessionStart, setSessionStart] = useState("");
  const [targetSeconds, setTargetSeconds] = useState(DEFAULT_MIN * 60);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dingedRef = useRef(false);
  const loggedRef = useRef(false);
  const lastDuration = useRef(DEFAULT_MIN * 60);
  // Logo após entrar no relógio: ignora o Enter que "carregou" do seletor e o
  // evento de movimento causado pelo próprio redimensionamento.
  const justEnteredRef = useRef(false);
  const modeRef = useRef<Mode>("picker");

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const armJustEntered = useCallback(() => {
    justEnteredRef.current = true;
    setTimeout(() => {
      justEnteredRef.current = false;
    }, 400);
  }, []);

  const groupColor = useCallback(
    (name: string | null) => groups.find((g) => g.name === name)?.color ?? "#FF6363",
    [groups],
  );

  const reloadPicker = useCallback(async () => {
    try {
      const [t, g] = await Promise.all([loadTasks(), loadGroups()]);
      setTasks(t);
      setGroups(g);
    } catch (err) {
      console.error("Falha ao carregar foco:", err);
    }
  }, []);

  const resetToPicker = useCallback(() => {
    setMode("picker");
    setActive(null);
    setQuery("");
    setHighlight(0);
    setElapsed(0);
    setRunning(false);
    setDone(false);
    dingedRef.current = false;
    loggedRef.current = false;
    reloadPicker();
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [reloadPicker]);

  // Carga inicial + reabertura via ⌥F
  useEffect(() => {
    resetToPicker();
    const unlisten = win.listen("focus:open", resetToPicker);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [resetToPicker]);

  // Arrastar o relógio encolhe-o para o mini-cronômetro (largar onde quiser)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let active = true;
    win
      .onMoved(() => {
        if (modeRef.current === "running" && !justEnteredRef.current) {
          setMode("mini");
        }
      })
      .then((fn) => {
        if (active) unlisten = fn;
        else fn();
      });
    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  const filtered = useMemo(() => {
    const ordered = orderForPicker(tasks);
    const q = normalizeText(query.trim());
    if (!q) return ordered;
    return ordered.filter((t) => normalizeText(t.title).includes(q));
  }, [tasks, query]);

  // Ajusta o tamanho da janela ao modo / tamanho da lista
  const pickerHeight =
    INPUT_H + 1 + Math.max(1, Math.min(filtered.length, MAX_ROWS)) * ROW_H + 8 + FOOTER_H;
  useEffect(() => {
    if (mode === "mini") {
      win.setSize(new LogicalSize(MINI_W, MINI_H)).catch(() => {});
    } else if (mode === "running") {
      win.setSize(new LogicalSize(WIDGET_W, WIDGET_H)).catch(() => {});
    } else {
      win.setSize(new LogicalSize(PICKER_W, Math.round(pickerHeight))).catch(() => {});
    }
  }, [mode, pickerHeight]);

  // Relógio: conta o tempo efetivamente focado (count-up) enquanto rodando
  useEffect(() => {
    if (mode === "picker" || !running) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [mode, running]);

  // Fim da contagem regressiva: ding + pausa
  useEffect(() => {
    if (mode === "picker") return;
    if (elapsed >= targetSeconds && !dingedRef.current) {
      dingedRef.current = true;
      setRunning(false);
      playDing();
    }
  }, [elapsed, targetSeconds, mode]);

  const startSession = useCallback(
    (task: Task) => {
      setActive(task);
      setSessionStart(toLocalIsoDateTime(new Date()));
      setTargetSeconds(lastDuration.current);
      setElapsed(0);
      setDone(false);
      dingedRef.current = false;
      loggedRef.current = false;
      armJustEntered();
      setRunning(true);
      setMode("running");
    },
    [armJustEntered],
  );

  const expand = useCallback(() => {
    armJustEntered();
    setMode("running");
  }, [armJustEntered]);

  const logSession = useCallback(
    (completed: boolean) => {
      if (loggedRef.current) return;
      loggedRef.current = true;
      if (elapsed <= 0 && !completed) return; // nada a registrar
      appendFocusSession({
        taskId: active!.id,
        startedAt: sessionStart,
        focusedSeconds: elapsed,
        completed,
      })
        .then(() => emitTo("main", "focus:done", {}))
        .catch((err) => console.error("Falha ao registrar sessão de foco:", err));
    },
    [active, elapsed, sessionStart],
  );

  const closeWindow = useCallback(() => {
    win.hide();
    resetToPicker();
  }, [resetToPicker]);

  const exitFocus = useCallback(() => {
    logSession(false);
    closeWindow();
  }, [logSession, closeWindow]);

  const conclude = useCallback(async () => {
    if (!active) return;
    const now = new Date();
    const xp = xpForCompletion(active.due, now, true);
    const completed: Task = {
      ...active,
      done: true,
      completedAt: toLocalIsoDateTime(now),
      xp,
    };
    setRunning(false);
    setDone(true);
    setMode("running");
    try {
      await saveTask(completed);
    } catch (err) {
      console.error("Falha ao concluir tarefa em foco:", err);
    }
    logSession(true);
    setTimeout(closeWindow, 950);
  }, [active, logSession, closeWindow]);

  const setPreset = useCallback((min: number) => {
    lastDuration.current = min * 60;
    setTargetSeconds(min * 60);
    setElapsed(0);
    dingedRef.current = false;
    setRunning(true);
  }, []);

  const addFive = useCallback(() => {
    setTargetSeconds((s) => s + 5 * 60);
    dingedRef.current = false;
    setRunning(true);
  }, []);

  // Teclado no relógio/mini: Esc sai, ↵ conclui (protegido), espaço pausa
  useEffect(() => {
    if (mode === "picker") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        exitFocus();
      } else if (e.key === "Enter") {
        if (e.repeat || justEnteredRef.current) return; // ignora o Enter do seletor
        e.preventDefault();
        conclude();
      } else if (e.code === "Space") {
        e.preventDefault();
        setRunning((r) => !r);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, exitFocus, conclude]);

  function onPickerKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const task = filtered[highlight] ?? filtered[0];
      if (task) startSession(task);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeWindow();
    }
  }

  const remaining = Math.max(0, targetSeconds - elapsed);
  const overtime = elapsed >= targetSeconds;

  // ---- Mini-cronômetro (após arrastar): só o tempo + botão de expandir ----
  if (mode === "mini" && active) {
    return (
      <div
        data-tauri-drag-region
        className="flex h-full items-center justify-between gap-1 rounded-[12px] border border-white/[0.12] bg-[rgba(28,28,32,0.72)] pr-1.5 pl-3"
      >
        <span
          data-tauri-drag-region
          className={`font-mono text-[15px] font-semibold tabular-nums ${
            overtime ? "text-accent" : running ? "text-ink" : "text-dim"
          }`}
        >
          {formatTimer(remaining)}
        </span>
        <button
          onClick={expand}
          title="Abrir relógio"
          className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-md text-dim transition-colors duration-150 hover:bg-hover hover:text-ink"
        >
          <ExpandIcon size={13} />
        </button>
      </div>
    );
  }

  // ---- Relógio completo ----
  if (mode === "running" && active) {
    const minutesActive = Math.round(targetSeconds / 60);
    return (
      <div
        data-tauri-drag-region
        className="relative flex h-full flex-col overflow-hidden rounded-[14px] border border-white/[0.12] bg-[rgba(28,28,32,0.72)]"
      >
        {done ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
            <SparkGlyph size={22} className="animate-check-pop text-accent" />
            <span className="text-[13px] font-medium text-ink">Concluído!</span>
          </div>
        ) : (
          <>
            {/* Cabeçalho: tarefa (arrastável) */}
            <div data-tauri-drag-region className="flex items-center gap-2 px-3 pt-2.5">
              <FocusGlyph size={12} className="text-accent" />
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ background: groupColor(active.group) }}
              />
              <span className="truncate text-[12px] font-medium text-ink">{active.title}</span>
            </div>

            {/* Contagem regressiva */}
            <div data-tauri-drag-region className="flex flex-1 items-center justify-center">
              <span
                className={`font-mono text-[34px] font-semibold tabular-nums tracking-tight ${
                  overtime ? "text-accent" : "text-ink"
                }`}
              >
                {formatTimer(remaining)}
              </span>
            </div>

            {/* Presets de duração */}
            <div className="flex items-center justify-center gap-1 pb-1.5">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => setPreset(m)}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] transition-colors duration-150 ${
                    minutesActive === m && !overtime
                      ? "bg-accent/20 text-accent"
                      : "text-faint hover:bg-hover hover:text-dim"
                  }`}
                >
                  {m}min
                </button>
              ))}
            </div>

            {/* Controles */}
            <div className="flex h-[34px] shrink-0 items-center justify-between border-t border-line bg-black/20 px-1.5 text-[11px]">
              <button
                onClick={() => setRunning((r) => !r)}
                className="rounded px-2 py-0.5 text-dim transition-colors duration-150 hover:bg-hover hover:text-ink"
              >
                {running ? "Pausar" : "Retomar"}
              </button>
              <button
                onClick={addFive}
                className="rounded px-2 py-0.5 text-dim transition-colors duration-150 hover:bg-hover hover:text-ink"
              >
                +5
              </button>
              <button
                onClick={conclude}
                className="flex items-center gap-1 rounded px-2 py-0.5 font-medium text-mint transition-colors duration-150 hover:bg-mint/10"
              >
                <CheckCircleIcon size={12} />
                Concluir
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---- Seletor de tarefa ----
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[16px] border border-white/[0.12] bg-[rgba(28,28,32,0.7)]">
      <div className="flex h-[54px] shrink-0 items-center gap-3 px-3.5">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.05]">
          <FocusGlyph size={15} className="text-accent" />
        </span>
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={onPickerKey}
          placeholder="Focar em… escolha uma tarefa"
          spellCheck={false}
          className="h-full flex-1 bg-transparent text-[16px] font-normal text-ink outline-none placeholder:text-faint"
        />
      </div>

      <div className="shrink-0 border-t border-line" />

      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center px-4 text-[13px] text-faint">
          {tasks.some((t) => !t.done)
            ? "Nenhuma tarefa encontrada"
            : "Nenhuma tarefa pendente para focar"}
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto py-1">
          {filtered.map((t, i) => (
            <li key={t.id}>
              <button
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  startSession(t);
                }}
                className={`flex h-[38px] w-full items-center gap-2.5 px-4 text-[13px] transition-colors duration-100 ${
                  i === highlight ? "bg-white/[0.08]" : ""
                }`}
              >
                <span
                  className="h-[8px] w-[8px] shrink-0 rounded-full"
                  style={{ background: groupColor(t.group) }}
                />
                <span className="truncate text-ink">{t.title}</span>
                {t.due && t.due <= toIsoDate(new Date()) && (
                  <span className="ml-auto shrink-0 text-[11px] text-accent">hoje</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex h-[34px] shrink-0 items-center justify-between border-t border-line bg-black/20 px-3.5 text-[12px]">
        <span className="flex items-center gap-1.5 font-medium text-dim">
          <FocusGlyph size={12} className="text-accent" />
          Foco
        </span>
        <span className="flex items-center gap-1.5 text-faint">
          Focar
          <Kbd>↵</Kbd>
          <span className="text-white/10">|</span>
          Fechar
          <Kbd>esc</Kbd>
        </span>
      </div>
    </div>
  );
}

/** Ícone de expandir (setas diagonais) para o mini-cronômetro. */
function ExpandIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ding suave de fim de sessão via Web Audio. */
function playDing() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* sem áudio disponível — silencioso */
  }
}
