import { useState } from "react";
import { GROUP_PALETTE, groupColor } from "../../lib/colors";
import { MoneyGlyph, TrashGlyph } from "../../components/glyphs";
import type { ClientMap, GroupColors } from "../../lib/store";

export interface GroupEditorTarget {
  name: string;
  x: number;
  y: number;
}

export function GroupEditor({
  target,
  colors,
  clients,
  onRename,
  onSetColor,
  onSetClient,
  onDelete,
  onClose,
}: {
  target: GroupEditorTarget;
  colors: GroupColors;
  clients: ClientMap;
  onRename: (oldName: string, newName: string) => void;
  onSetColor: (name: string, color: string) => void;
  onSetClient: (name: string, monthly: number | null) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(target.name);
  const [confirming, setConfirming] = useState(false);
  const current = groupColor(target.name, colors);
  const isClient = clients[target.name] !== undefined;

  function commitRename() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== target.name) onRename(target.name, trimmed);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onMouseDown={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="animate-fade-in fixed z-50 w-[244px] rounded-xl border border-white/10 bg-raised p-3 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        style={{
          left: Math.min(target.x, window.innerWidth - 256),
          top: Math.min(target.y, window.innerHeight - (isClient ? 268 : 220)),
        }}
      >
        <input
          autoFocus
          value={name}
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitRename();
              onClose();
            }
            if (e.key === "Escape") onClose();
          }}
          onBlur={commitRename}
          className="w-full rounded-lg border border-line bg-black/20 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent/60"
        />

        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {GROUP_PALETTE.map((c) => {
            const selected = c.toLowerCase() === current.toLowerCase();
            return (
              <button
                key={c}
                onClick={() => onSetColor(target.name, c)}
                aria-label={`Cor ${c}`}
                className={`flex h-7 items-center justify-center rounded-md transition-transform duration-150 hover:scale-110 ${
                  selected ? "ring-2 ring-white/70" : ""
                }`}
                style={{ background: c }}
              >
                {selected && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m2.5 6.5 2.5 2.5 4.5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Cliente: marca o grupo e define o valor mensal */}
        <div className="mt-3 border-t border-line pt-3">
          <button
            onClick={() => onSetClient(target.name, isClient ? null : 0)}
            className="flex w-full items-center justify-between rounded-lg px-1 py-0.5 text-[13px] text-ink"
          >
            <span className="flex items-center gap-2">
              <MoneyGlyph size={15} className="text-dim" />
              É cliente
            </span>
            <span
              className={`flex h-[18px] w-[31px] items-center rounded-full px-[2px] transition-colors duration-150 ${
                isClient ? "bg-accent" : "bg-white/15"
              }`}
            >
              <span
                className={`h-[14px] w-[14px] rounded-full bg-white transition-transform duration-150 ${
                  isClient ? "translate-x-[13px]" : ""
                }`}
              />
            </span>
          </button>
          {isClient && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-black/20 px-2.5 py-1.5 focus-within:border-accent/60">
              <span className="text-[13px] text-dim">R$</span>
              <input
                autoFocus
                type="number"
                min="0"
                inputMode="numeric"
                value={clients[target.name] || ""}
                placeholder="0"
                onChange={(e) =>
                  onSetClient(
                    target.name,
                    Math.max(0, Math.round(Number(e.target.value) || 0)),
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") onClose();
                }}
                className="w-full bg-transparent text-[13px] text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-[12px] text-faint">/mês</span>
            </div>
          )}
        </div>

        <button
          onClick={() =>
            confirming ? onDelete(target.name) : setConfirming(true)
          }
          className={`mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-danger transition-colors duration-150 ${
            confirming ? "bg-danger-dim font-medium" : "hover:bg-danger-dim"
          }`}
        >
          <TrashGlyph size={15} />
          {confirming ? "Excluir grupo e tarefas?" : "Excluir grupo"}
        </button>
      </div>
    </>
  );
}
