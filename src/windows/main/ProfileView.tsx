import { levelForXp, streak, totalXp } from "../../lib/game";
import { FlameIcon, CheckCircleIcon, SparkleIcon } from "../../components/Icons";
import { ACHIEVEMENTS, ACHIEVEMENT_IDS } from "./achievements";
import type { AchievementState } from "../../lib/store";
import type { Task } from "../../lib/types";

export function ProfileView({
  tasks,
  unlocked,
}: {
  tasks: Task[];
  unlocked: AchievementState;
}) {
  const xp = totalXp(tasks);
  const { level, min, next } = levelForXp(xp);
  const progress = Math.min(1, (xp - min) / (next - min));
  const doneCount = tasks.filter((t) => t.done).length;
  const streakDays = streak(tasks);

  return (
    <div className="mx-auto max-w-[560px] pt-4">
      {/* Cabeçalho: avatar + nível */}
      <div className="flex items-center gap-4">
        <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#5a3fd9] text-[22px] font-semibold text-white">
          FB
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-semibold text-ink">
            Nível {level}
          </div>
          <div className="text-[13px] text-dim">
            {xp} XP · faltam {next - xp} para o nível {level + 1}
          </div>
        </div>
      </div>

      {/* Barra de XP */}
      <div className="mt-5 h-[8px] overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-[#9d85ff] transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(2, progress * 100)}%` }}
        />
      </div>

      {/* Cartões de estatísticas */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard
          icon={<FlameIcon size={18} className="text-[#FFB454]" />}
          value={String(streakDays)}
          label={streakDays === 1 ? "dia seguido" : "dias seguidos"}
        />
        <StatCard
          icon={<CheckCircleIcon size={18} className="text-mint" />}
          value={String(doneCount)}
          label={doneCount === 1 ? "tarefa concluída" : "tarefas concluídas"}
        />
        <StatCard
          icon={<SparkleIcon size={18} className="text-accent" />}
          value={String(xp)}
          label="XP no total"
        />
      </div>

      {/* Conquistas */}
      <h2 className="mt-8 mb-3 text-[11px] font-semibold tracking-wide text-faint uppercase">
        Conquistas
      </h2>
      <div className="grid grid-cols-3 gap-3 pb-8">
        {ACHIEVEMENT_IDS.map((id) => {
          const meta = ACHIEVEMENTS[id];
          const isUnlocked = Boolean(unlocked[id]);
          return (
            <div
              key={id}
              className={`rounded-xl border border-line bg-raised p-4 transition-opacity duration-150 ${
                isUnlocked ? "" : "opacity-40 grayscale"
              }`}
            >
              <div className="text-[22px]">{isUnlocked ? meta.emoji : "🔒"}</div>
              <div className="mt-2 text-[13px] font-semibold text-ink">
                {meta.name}
              </div>
              <div className="mt-0.5 text-[12px] leading-snug text-dim">
                {meta.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-raised p-4">
      {icon}
      <div className="mt-2 text-[22px] font-semibold text-ink">{value}</div>
      <div className="text-[12px] text-dim">{label}</div>
    </div>
  );
}
