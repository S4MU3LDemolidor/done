import { toIsoDate } from "./parser";
import type { FocusSession } from "./types";

export const DEEP_WORK_SECONDS = 25 * 60;

function dayOf(session: FocusSession): string {
  return session.startedAt.slice(0, 10);
}

export function focusSecondsForDay(
  sessions: FocusSession[],
  isoDate: string,
): number {
  return sessions
    .filter((s) => dayOf(s) === isoDate)
    .reduce((sum, s) => sum + s.focusedSeconds, 0);
}

export function focusSecondsToday(
  sessions: FocusSession[],
  now: Date = new Date(),
): number {
  return focusSecondsForDay(sessions, toIsoDate(now));
}

export function totalFocusSeconds(sessions: FocusSession[]): number {
  return sessions.reduce((sum, s) => sum + s.focusedSeconds, 0);
}

export function focusDayStreak(
  sessions: FocusSession[],
  now: Date = new Date(),
): number {
  const days = new Set(sessions.map(dayOf));
  if (days.size === 0) return 0;

  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Sem foco hoje ainda não quebra: começa a contar de ontem
  if (!days.has(toIsoDate(cursor))) cursor.setDate(cursor.getDate() - 1);

  let count = 0;
  while (days.has(toIsoDate(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function hasDeepWorkSession(
  sessions: FocusSession[],
  threshold: number = DEEP_WORK_SECONDS,
): boolean {
  return sessions.some((s) => s.focusedSeconds >= threshold);
}

export function formatTimer(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(m)}:${pad(s)}`;
}

export function formatFocusTotal(seconds: number): string {
  const totalMin = Math.floor(Math.max(0, seconds) / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
