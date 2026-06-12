import { useState } from "react";
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronIcon,
  FlameIcon,
  SunIcon,
  UserIcon,
} from "../../components/Icons";
import { groupColor } from "../../lib/colors";
import type { View } from "./MainApp";

interface SidebarProps {
  view: View;
  setView: (v: View) => void;
  groups: string[];
  todayCount: number;
  streakDays: number;
}

export function Sidebar({
  view,
  setView,
  groups,
  todayCount,
  streakDays,
}: SidebarProps) {
  const [groupsOpen, setGroupsOpen] = useState(true);

  return (
    <aside className="flex w-[210px] shrink-0 flex-col border-r border-line bg-black/[0.18] pt-11">
      <div className="px-4 pb-3 text-[15px] font-semibold tracking-tight text-ink">
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
                <NavItem
                  key={g}
                  active={view.kind === "group" && view.name === g}
                  onClick={() => setView({ kind: "group", name: g })}
                  icon={
                    <span
                      className="mx-0.5 h-[7px] w-[7px] rounded-full"
                      style={{ background: groupColor(g) }}
                    />
                  }
                  label={g}
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

function NavItem({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
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
