import { NoteIcon } from "../../components/Icons";
import type { Note } from "../../lib/types";

const stripMd = (s: string) =>
  s.replace(/[#>*_`~\-]|@task:[\w-]+|@group:[^\s]+/g, "").replace(/\s+/g, " ").trim();

export function NotesSidebarSection({
  notes,
  activeId,
  onOpen,
  onContextMenu,
}: {
  notes: Note[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
}) {
  const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (sorted.length === 0) return null;

  return (
    <div className="mt-3 space-y-0.5">
      <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold tracking-wide text-faint uppercase">
        Notas
      </div>
      {sorted.map((n) => {
        const preview = stripMd(n.body);
        return (
          <button
            key={n.id}
            onClick={() => onOpen(n.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(n.id, e.clientX, e.clientY);
            }}
            className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition-colors duration-150 ${
              activeId === n.id
                ? "bg-accent-dim font-medium text-accent"
                : "text-dim hover:bg-hover hover:text-ink"
            }`}
          >
            <span className="flex w-4 shrink-0 justify-center pt-[1px]">
              <NoteIcon size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{n.title || "Sem título"}</span>
              {preview && (
                <span className="block truncate text-[11px] text-faint font-normal">
                  {preview.slice(0, 40)}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
