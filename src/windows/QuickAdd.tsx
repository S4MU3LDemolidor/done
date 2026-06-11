import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { parseTask, formatDue, toLocalIsoDateTime } from "../lib/parser";
import { saveTask } from "../lib/store";
import { SparkleIcon } from "../components/Icons";
import type { Task } from "../lib/types";

const win = getCurrentWebviewWindow();

export default function QuickAdd() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = parseTask(text);

  const reset = useCallback(() => {
    setText("");
    setSaved(false);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const unlisten = win.listen("quickadd:shown", reset);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [reset]);

  useEffect(() => {
    const unlisten = win.onFocusChanged(({ payload: focused }) => {
      if (!focused) win.hide();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  async function submit() {
    if (!parsed.title.trim() || saved) return;
    const now = new Date();
    const task: Task = {
      id: crypto.randomUUID(),
      title: parsed.title.trim(),
      due: parsed.due,
      group: parsed.group,
      done: false,
      created: toLocalIsoDateTime(now),
      completedAt: null,
      xp: 10,
    };
    try {
      await saveTask(task);
      setSaved(true);
      setTimeout(() => {
        win.hide();
        reset();
      }, 550);
    } catch (err) {
      console.error("Falha ao salvar tarefa:", err);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") {
      win.hide();
      reset();
    }
  }

  return (
    <div className="relative h-full overflow-hidden rounded-[16px] border border-white/10 bg-[rgba(28,28,30,0.72)] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
      {/* Linha do input */}
      <div className="flex h-[72px] items-center gap-3.5 px-5">
        <SparkleIcon size={20} className="shrink-0 text-accent" />
        <input
          ref={inputRef}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="limpar casa, sexta, casa"
          spellCheck={false}
          className="h-full flex-1 bg-transparent text-[18px] font-normal text-ink outline-none placeholder:text-faint"
        />
        <button
          onClick={submit}
          disabled={!parsed.title.trim()}
          className="shrink-0 rounded-lg bg-accent-dim px-3 py-1.5 text-[13px] font-medium text-accent transition-opacity duration-150 disabled:opacity-35"
        >
          ↵ adicionar
        </button>
      </div>

      <div className="border-t border-line" />

      {/* Pré-visualização dos campos */}
      <div className="flex h-[48px] items-center gap-2 px-5 text-[12px]">
        {text.trim() ? (
          <>
            {parsed.title.trim() && (
              <Chip key={`t-${parsed.title}`}>📋 {truncate(parsed.title.trim(), 32)}</Chip>
            )}
            {parsed.due && <Chip key={`d-${parsed.due}`}>📅 {formatDue(parsed.due)}</Chip>}
            {parsed.group && <Chip key={`g-${parsed.group}`}>🏷 {parsed.group}</Chip>}
          </>
        ) : (
          <span className="text-faint">
            título, data e grupo separados por vírgula — só o título é
            obrigatório
          </span>
        )}
      </div>

      {/* Estado de sucesso */}
      {saved && (
        <div className="animate-fade-in absolute inset-0 flex items-center justify-center gap-2.5 bg-[rgba(28,28,30,0.92)]">
          <span className="animate-check-pop text-[20px] text-mint">✓</span>
          <span className="text-[16px] font-medium text-ink">
            Tarefa adicionada
          </span>
        </div>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="animate-chip-in rounded-md bg-white/[0.07] px-2 py-1 font-medium text-dim">
      {children}
    </span>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
