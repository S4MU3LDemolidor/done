import { describe, expect, test } from "vitest";
import { monthCells } from "./calendar";

describe("monthCells", () => {
  test("junho 2026 começa numa segunda (1 espaço antes do dia 1)", () => {
    const cells = monthCells(2026, 5);
    expect(cells[0]).toBeNull();
    expect(cells[1]).toEqual({ iso: "2026-06-01", day: 1 });
  });

  test("comprimento é múltiplo de 7 (semanas inteiras)", () => {
    expect(monthCells(2026, 5).length % 7).toBe(0);
    expect(monthCells(2026, 1).length % 7).toBe(0); // fevereiro
  });

  test("contém todos os dias do mês", () => {
    const cells = monthCells(2026, 5).filter((c) => c !== null);
    expect(cells).toHaveLength(30); // junho tem 30 dias
    expect(cells[cells.length - 1]).toEqual({ iso: "2026-06-30", day: 30 });
  });

  test("fevereiro de ano bissexto tem 29 dias", () => {
    const cells = monthCells(2028, 1).filter((c) => c !== null);
    expect(cells).toHaveLength(29);
  });

  test("zera dia e mês à esquerda no iso", () => {
    expect(monthCells(2026, 0)[4]).toEqual({ iso: "2026-01-01", day: 1 });
  });
});
