import type { ParsedTask } from "./types";

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

const MONTHS_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toLocalIsoDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${toIsoDate(d)}T${time}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function parseDateSegment(segment: string, now: Date): string | null {
  const norm = normalize(segment);
  const today = startOfDay(now);

  if (norm === "hoje") return toIsoDate(today);
  if (norm === "amanha") return toIsoDate(addDays(today, 1));

  const weekday = WEEKDAYS[norm.replace(/-feira$/, "")];
  if (weekday !== undefined) {
    const diff = (weekday - today.getDay() + 7) % 7; // 0 = hoje conta
    return toIsoDate(addDays(today, diff));
  }

  const m = norm.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (m) {
    const [, dayStr, monthStr, yearStr] = m;
    const day = Number(dayStr);
    const month = Number(monthStr);
    const build = (year: number) => {
      const candidate = new Date(year, month - 1, day);
      const valid =
        candidate.getMonth() === month - 1 && candidate.getDate() === day;
      return valid ? candidate : null;
    };
    if (yearStr) {
      const candidate = build(Number(yearStr));
      return candidate ? toIsoDate(candidate) : null;
    }
    // dd/mm sem ano: próxima ocorrência (hoje conta)
    const thisYear = build(today.getFullYear());
    if (!thisYear) return null;
    if (thisYear >= today) return toIsoDate(thisYear);
    const nextYear = build(today.getFullYear() + 1);
    return nextYear ? toIsoDate(nextYear) : null;
  }

  return null;
}

/** O segmento digitado parece uma data (dd/mm, hoje, sexta…)? Usado para decidir
 *  quando sugerir grupos na barra de adição rápida. */
export function isDateText(segment: string, now: Date = new Date()): boolean {
  return parseDateSegment(segment.trim(), now) !== null;
}

export function parseTask(input: string, now: Date = new Date()): ParsedTask {
  const segments = input.split(",").map((s) => s.trim());
  const title = segments[0] ?? "";
  let due: string | null = null;
  let group: string | null = null;

  for (const segment of segments.slice(1)) {
    if (!segment) continue;
    const date: string | null =
      due === null ? parseDateSegment(segment, now) : null;
    if (date) {
      due = date;
    } else {
      group = segment;
    }
  }

  return { title, due, group };
}

/** Texto editável "título, dd/mm/yyyy, grupo" que o parseTask reconstrói sem perdas. */
export function toEditText(fields: {
  title: string;
  due: string | null;
  group: string | null;
}): string {
  const parts = [fields.title];
  if (fields.due) {
    const [y, m, d] = fields.due.split("-");
    parts.push(`${d}/${m}/${y}`);
  }
  if (fields.group) parts.push(fields.group);
  return parts.join(", ");
}

export function formatDue(due: string, now: Date = new Date()): string {
  const today = startOfDay(now);
  const date = fromIsoDate(due);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "amanhã";
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function isOverdue(due: string | null, now: Date = new Date()): boolean {
  if (!due) return false;
  return fromIsoDate(due).getTime() < startOfDay(now).getTime();
}
