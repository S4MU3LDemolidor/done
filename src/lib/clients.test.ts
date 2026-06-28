import { describe, expect, it } from "vitest";
import { clientCount, formatBRL, totalMonthly } from "./clients";

const NBSP = String.fromCharCode(160);

describe("formatBRL", () => {
  it("formats whole reais with pt-BR thousands separator and no cents", () => {
    expect(formatBRL(1500)).toBe("R$ 1.500");
    expect(formatBRL(2000)).toBe("R$ 2.000");
    expect(formatBRL(1500000)).toBe("R$ 1.500.000");
  });

  it("formats zero", () => {
    expect(formatBRL(0)).toBe("R$ 0");
  });

  it("rounds fractional values to whole reais", () => {
    expect(formatBRL(1499.6)).toBe("R$ 1.500");
  });

  it("never contains a non-breaking space", () => {
    expect(formatBRL(1500).includes(NBSP)).toBe(false);
  });
});

describe("totalMonthly", () => {
  it("sums every client's monthly value", () => {
    expect(totalMonthly({ Glide: 1500, "Lojas Ricardo's": 2000 })).toBe(3500);
  });

  it("is zero with no clients", () => {
    expect(totalMonthly({})).toBe(0);
  });
});

describe("clientCount", () => {
  it("counts the clients", () => {
    expect(clientCount({ a: 1, b: 2 })).toBe(2);
  });

  it("is zero with no clients", () => {
    expect(clientCount({})).toBe(0);
  });
});
