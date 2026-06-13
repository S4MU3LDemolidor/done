import { useState } from "react";
import { GROUP_PALETTE, groupColor } from "../../lib/colors";
import { TrashGlyph } from "../../components/glyphs";
import type { GroupColors } from "../../lib/store";

export interface GroupEditorTarget {
  name: string;
  x: number;
  y: number;
}

export function GroupEditor({
  target,
  colors,
  onRename,
  onSetColor,
  onDelete,
  onClose,
}: {
  target: GroupEditorTarget;
  colors: GroupColors;
  onRename: (oldName: string, newName: string) => void;
  onSetColor: (name: string, color: string) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(target.name);
  const current = groupColor(target.name, colors);

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
          top: Math.min(target.y, window.innerHeight - 168),
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

        <button
          onClick={() => onDelete(target.name)}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-danger transition-colors duration-150 hover:bg-danger-dim"
        >
          <TrashGlyph size={15} />
          Excluir grupo
        </button>
      </div>
    </>
  );
}
