import { useState } from "react";
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronIcon,
  FlameIcon,
  GridIcon,
  SunIcon,
  UserIcon,
} from "../../components/Icons";
import { useGroupColor } from "./GroupColorContext";
import type { View } from "./MainApp";

interface SidebarProps {
  view: View;
  setView: (v: View) => void;
  groups: string[];
  todayCount: number;
  streakDays: number;
  onEditGroup: (name: string, x: number, y: number) => void;
}

export function Sidebar({
  view,
  setView,
  groups,
  todayCount,
  streakDays,
  onEditGroup,
}: SidebarProps) {
  const [groupsOpen, setGroupsOpen] = useState(true);

  return (
    <aside
      data-tauri-drag-region
      className="flex w-[210px] shrink-0 flex-col border-r border-line bg-black/[0.22] pt-11"
    >
      <div
        data-tauri-drag-region
        className="px-4 pb-3 text-[15px] font-semibold tracking-tight text-ink"
      >
        Done
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5">
        <NavItem
          active={view.kind === "today"}
          onClick={() => setView({ kind: "today" })}
          icon={<SunIcon size={16} />}
          label="Hoje"
          badge={todayCount > 0 ? String(todayCount) : undefined}
        />
        <NavItem
          active={view.kind === "all"}
          onClick={() => setView({ kind: "all" })}
          icon={<GridIcon size={16} />}
          label="Tudo"
        />

        {groups.length > 0 && (
          <>
            <button
              onClick={() => setGroupsOpen((v) => !v)}
              className="mt-3 flex w-full items-center gap-1 px-2 py-1 text-[11px] font-semibold tracking-wide text-faint uppercase transition-colors duration-150 hover:text-dim"
            >
              <ChevronIcon size={11} open={groupsOpen} />
              Grupos
            </button>
            {groupsOpen &&
              groups.map((g) => (
                <GroupNavItem
                  key={g}
                  name={g}
                  active={view.kind === "group" && view.name === g}
                  onClick={() => setView({ kind: "group", name: g })}
                  onEdit={(x, y) => onEditGroup(g, x, y)}
                />
              ))}
          </>
        )}

        <div className="mt-3 space-y-0.5">
          <NavItem
            active={view.kind === "agenda"}
            onClick={() => setView({ kind: "agenda" })}
            icon={<CalendarIcon size={16} />}
            label="Agenda"
          />
          <NavItem
            active={view.kind === "completed"}
            onClick={() => setView({ kind: "completed" })}
            icon={<CheckCircleIcon size={16} />}
            label="Concluídas"
          />
          <NavItem
            active={view.kind === "profile"}
            onClick={() => setView({ kind: "profile" })}
            icon={<UserIcon size={16} />}
            label="Perfil"
          />
        </div>
      </nav>

      {streakDays > 0 && (
        <div className="flex items-center gap-2 border-t border-line px-4 py-3 text-[12px] font-medium text-dim">
          <FlameIcon size={15} className="text-[#FFB454]" />
          {streakDays} {streakDays === 1 ? "dia" : "dias"} de sequência
        </div>
      )}
    </aside>
  );
}

function GroupNavItem({
  name,
  active,
  onClick,
  onEdit,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
  onEdit: (x: number, y: number) => void;
}) {
  const color = useGroupColor(name);
  return (
    <NavItem
      active={active}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onEdit(e.clientX, e.clientY);
      }}
      icon={
        <span
          className="mx-0.5 h-[7px] w-[7px] rounded-full"
          style={{ background: color }}
        />
      }
      label={name}
    />
  );
}

function NavItem({
  active,
  onClick,
  onContextMenu,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors duration-150 ${
        active
          ? "bg-accent-dim font-medium text-accent"
          : "text-dim hover:bg-hover hover:text-ink"
      }`}
    >
      <span className="flex w-4 shrink-0 justify-center">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {badge && (
        <span
          className={`rounded-full px-1.5 text-[11px] ${active ? "text-accent" : "text-faint"}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
