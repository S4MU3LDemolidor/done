import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { parseTask, formatDue, isDateText, toLocalIsoDateTime } from "../lib/parser";
import { loadGroups, saveTask, type GroupInfo } from "../lib/store";
import { SparkleIcon } from "../components/Icons";
import { DateGlyph, SparkGlyph, TagGlyph, TaskGlyph } from "../components/glyphs";
import { Kbd } from "../components/Kbd";
import type { Task } from "../lib/types";

const win = getCurrentWebviewWindow();
const BASE_HEIGHT = 146;
const ITEM_HEIGHT = 36;
const MAX_VISIBLE = 5;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function QuickAdd() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = parseTask(text);

  const loadGroupList = useCallback(() => {
    loadGroups()
      .then(setGroups)
      .catch((err) => console.error("Falha ao carregar grupos:", err));
  }, []);

  const reset = useCallback(() => {
    setText("");
    setSaved(false);
    setHighlight(-1);
    setDismissed(false);
    loadGroupList();
    inputRef.current?.focus();
  }, [loadGroupList]);

  useEffect(() => {
    loadGroupList();
  }, [loadGroupList]);

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

  // Sugestão de grupo: último segmento, se já houver vírgula e não for data
  const segments = text.split(",");
  const fragment = segments.length >= 2 ? segments[segments.length - 1].trim() : "";
  const inGroupSegment = segments.length >= 2 && !isDateText(fragment);
  const matches = inGroupSegment
    ? groups.filter((g) => norm(g.name).includes(norm(fragment)))
    : [];
  const dropdownOpen = matches.length > 0 && !dismissed && !saved;

  // Redimensiona a janela para acomodar a lista
  useEffect(() => {
    const listH = Math.min(matches.length, MAX_VISIBLE) * ITEM_HEIGHT + 10;
    const h = dropdownOpen ? 56 + 1 + listH + 38 : BASE_HEIGHT;
    win.setSize(new LogicalSize(660, Math.round(h))).catch(() => {});
  }, [dropdownOpen, matches.length]);

  function applyGroup(name: string) {
    const parts = text.split(",");
    parts[parts.length - 1] = ` ${name}`;
    setText(parts.join(","));
    setDismissed(true);
    setHighlight(-1);
    inputRef.current?.focus();
  }

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
    if (dropdownOpen && e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
      return;
    }
    if (dropdownOpen && e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
      return;
    }
    if (dropdownOpen && e.key === "Tab") {
      e.preventDefault();
      applyGroup(matches[highlight >= 0 ? highlight : 0].name);
      return;
    }
    if (e.key === "Enter") {
      if (dropdownOpen && highlight >= 0) {
        e.preventDefault();
        applyGroup(matches[highlight].name);
        return;
      }
      submit();
      return;
    }
    if (e.key === "Escape") {
      if (dropdownOpen) {
        e.preventDefault();
        setDismissed(true);
      } else {
        win.hide();
        reset();
      }
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[16px] border border-white/[0.12] bg-[rgba(30,30,34,0.7)]">
      {/* Linha do input: bloco de ícone + campo grande */}
      <div className="flex h-[56px] shrink-0 items-center gap-3 px-3.5">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.05]">
          <SparkleIcon size={15} className="text-accent" />
        </span>
        <input
          ref={inputRef}
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setDismissed(false);
            setHighlight(-1);
          }}
          onKeyDown={onKeyDown}
          placeholder="Adicionar tarefa… ex.: limpar casa, sexta, casa"
          spellCheck={false}
          className="h-full flex-1 bg-transparent text-[17px] font-normal text-ink outline-none placeholder:text-faint"
        />
      </div>

      <div className="shrink-0 border-t border-line" />

      {/* Meio: lista de grupos (quando ativa) ou pré-visualização dos campos */}
      {dropdownOpen ? (
        <ul className="flex-1 overflow-y-auto py-1">
          {matches.map((g, i) => (
            <li key={g.name}>
              <button
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyGroup(g.name);
                }}
                className={`flex h-[36px] w-full items-center gap-2.5 px-4 text-[13px] transition-colors duration-100 ${
                  i === highlight ? "bg-white/[0.08]" : ""
                }`}
              >
                <span
                  className="h-[8px] w-[8px] shrink-0 rounded-full"
                  style={{ background: g.color }}
                />
                <span className="text-ink">{g.name}</span>
                {norm(g.name) === norm(fragment) && (
                  <span className="ml-auto text-[11px] text-faint">atual</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 items-center gap-2 px-4 text-[12px]">
          {text.trim() ? (
            <>
              {parsed.title.trim() && (
                <Chip key={`t-${parsed.title}`}>
                  <TaskGlyph size={14} className="text-accent" />
                  {truncate(parsed.title.trim(), 32)}
                </Chip>
              )}
              {parsed.due && (
                <Chip key={`d-${parsed.due}`}>
                  <DateGlyph size={14} className="text-accent" />
                  {formatDue(parsed.due)}
                </Chip>
              )}
              {parsed.group && (
                <Chip key={`g-${parsed.group}`}>
                  <TagGlyph size={14} className="text-accent" />
                  {parsed.group}
                </Chip>
              )}
            </>
          ) : (
            <span className="text-faint">
              título, data e grupo separados por vírgula — só o título é
              obrigatório
            </span>
          )}
        </div>
      )}

      {/* Barra de ações (rodapé estilo Raycast) */}
      <div className="flex h-[38px] shrink-0 items-center justify-between border-t border-line bg-black/20 px-3.5 text-[12px]">
        <span className="flex items-center gap-1.5 font-medium text-dim">
          <SparkleIcon size={12} className="text-accent" />
          Done
        </span>
        <span className="flex items-center gap-2">
          {dropdownOpen ? (
            <>
              <span className="flex items-center gap-1.5 text-faint">
                Escolher grupo
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                <Kbd>↹</Kbd>
              </span>
            </>
          ) : (
            <>
              <button
                onClick={submit}
                disabled={!parsed.title.trim()}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-dim transition-colors duration-150 enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-40"
              >
                Adicionar
                <Kbd>↵</Kbd>
              </button>
              <span className="text-white/10">|</span>
              <span className="flex items-center gap-1.5 text-faint">
                Fechar
                <Kbd>esc</Kbd>
              </span>
            </>
          )}
        </span>
      </div>

      {/* Estado de sucesso */}
      {saved && (
        <div className="animate-fade-in absolute inset-0 flex items-center justify-center gap-2.5 bg-[rgba(28,28,30,0.86)] backdrop-blur-xl">
          <SparkGlyph size={22} className="animate-check-pop text-accent" />
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
    <span className="animate-chip-in flex items-center gap-1.5 rounded-md bg-white/[0.07] py-1 pr-2.5 pl-2 font-medium text-dim">
      {children}
    </span>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
