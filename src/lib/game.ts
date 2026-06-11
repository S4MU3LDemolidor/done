import { toIsoDate } from "./parser";
import type { AchievementId, Task } from "./types";

export const BASE_XP = 10;
export const ON_TIME_BONUS = 5;

// Limiares de nível: 0, 100, 250, 500, 1000, 2000 e depois dobrando
const THRESHOLDS = [0, 100, 250, 500, 1000, 2000];

function thresholdFor(level: number): number {
  if (level <= THRESHOLDS.length) return THRESHOLDS[level - 1];
  return THRESHOLDS[THRESHOLDS.length - 1] * 2 ** (level - THRESHOLDS.length);
}

export function xpForCompletion(due: string | null, completedAt: Date): number {
  if (!due) return BASE_XP;
  const completedDay = toIsoDate(completedAt);
  return completedDay <= due ? BASE_XP + ON_TIME_BONUS : BASE_XP;
}

export function totalXp(tasks: Task[]): number {
  return tasks.filter((t) => t.done).reduce((sum, t) => sum + t.xp, 0);
}

export function levelForXp(xp: number): {
  level: number;
  min: number;
  next: number;
} {
  let level = 1;
  while (xp >= thresholdFor(level + 1)) level += 1;
  return { level, min: thresholdFor(level), next: thresholdFor(level + 1) };
}

export function streak(tasks: Task[], now: Date = new Date()): number {
  const days = new Set(
    tasks
      .filter((t) => t.done && t.completedAt)
      .map((t) => t.completedAt!.slice(0, 10)),
  );
  if (days.size === 0) return 0;

  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Sem conclusão hoje ainda não quebra: começa a contar de ontem
  if (!days.has(toIsoDate(cursor))) cursor.setDate(cursor.getDate() - 1);

  let count = 0;
  while (days.has(toIsoDate(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function evaluateAchievements(
  tasks: Task[],
  now: Date = new Date(),
): AchievementId[] {
  const doneCount = tasks.filter((t) => t.done).length;
  const currentStreak = streak(tasks, now);
  const level = levelForXp(totalXp(tasks)).level;

  const unlocked: AchievementId[] = [];
  if (doneCount >= 1) unlocked.push("first_task");
  if (doneCount >= 10) unlocked.push("ten_tasks");
  if (currentStreak >= 7) unlocked.push("streak_7");
  if (currentStreak >= 30) unlocked.push("streak_30");
  if (tasks.some((t) => t.group)) unlocked.push("first_group");
  if (level >= 5) unlocked.push("level_5");
  return unlocked;
}
