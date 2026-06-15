export interface DayCell {
  iso: string;
  day: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Células de um mês para a grade do calendário: nulls antes do dia 1 e
 *  depois do último dia, completando semanas inteiras (múltiplo de 7). */
export function monthCells(year: number, month: number): (DayCell | null)[] {
  const startWeekday = new Date(year, month, 1).getDay(); // 0 = domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (DayCell | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: `${year}-${pad(month + 1)}-${pad(d)}`, day: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
