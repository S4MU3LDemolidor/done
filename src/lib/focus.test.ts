import { describe, expect, it } from "vitest";
import {
  focusDayStreak,
  focusSecondsForDay,
  focusSecondsToday,
  formatFocusTotal,
  formatTimer,
  hasDeepWorkSession,
  totalFocusSeconds,
} from "./focus";
import type { FocusSession } from "./types";

function session(
  startedAt: string,
  focusedSeconds: number,
  completed = false,
): FocusSession {
  return { taskId: "t", startedAt, focusedSeconds, completed };
}

describe("focusSecondsForDay", () => {
  it("sums only sessions started on the given day", () => {
    const sessions = [
      session("2026-06-25T09:00:00", 600),
      session("2026-06-25T14:00:00", 900),
      session("2026-06-24T10:00:00", 1200),
    ];
    expect(focusSecondsForDay(sessions, "2026-06-25")).toBe(1500);
  });

  it("is zero when no sessions match", () => {
    expect(focusSecondsForDay([session("2026-06-01T09:00:00", 600)], "2026-06-25")).toBe(0);
  });
});

describe("focusSecondsToday", () => {
  it("sums sessions started today", () => {
    const now = new Date(2026, 5, 25, 18, 0, 0);
    const sessions = [
      session("2026-06-25T09:00:00", 300),
      session("2026-06-24T09:00:00", 999),
    ];
    expect(focusSecondsToday(sessions, now)).toBe(300);
  });
});

describe("totalFocusSeconds", () => {
  it("sums every session", () => {
    expect(
      totalFocusSeconds([session("2026-06-25T09:00:00", 600), session("2026-06-24T09:00:00", 1200)]),
    ).toBe(1800);
  });

  it("is zero for no sessions", () => {
    expect(totalFocusSeconds([])).toBe(0);
  });
});

describe("focusDayStreak", () => {
  it("counts consecutive days ending today", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const sessions = [
      session("2026-06-25T09:00:00", 600),
      session("2026-06-24T09:00:00", 600),
      session("2026-06-23T09:00:00", 600),
    ];
    expect(focusDayStreak(sessions, now)).toBe(3);
  });

  it("does not break if there is no session today yet (counts from yesterday)", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const sessions = [
      session("2026-06-24T09:00:00", 600),
      session("2026-06-23T09:00:00", 600),
    ];
    expect(focusDayStreak(sessions, now)).toBe(2);
  });

  it("is zero with no sessions", () => {
    expect(focusDayStreak([], new Date(2026, 5, 25))).toBe(0);
  });

  it("stops at a gap", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const sessions = [
      session("2026-06-25T09:00:00", 600),
      session("2026-06-23T09:00:00", 600), // gap on the 24th
    ];
    expect(focusDayStreak(sessions, now)).toBe(1);
  });
});

describe("hasDeepWorkSession", () => {
  it("is true when a single session reaches 25 minutes", () => {
    expect(hasDeepWorkSession([session("2026-06-25T09:00:00", 1500)])).toBe(true);
  });

  it("is false when no single session reaches the threshold", () => {
    expect(
      hasDeepWorkSession([session("2026-06-25T09:00:00", 1400), session("2026-06-25T10:00:00", 1499)]),
    ).toBe(false);
  });
});

describe("formatTimer", () => {
  it("formats minutes and seconds as mm:ss", () => {
    expect(formatTimer(1500)).toBe("25:00");
    expect(formatTimer(65)).toBe("01:05");
    expect(formatTimer(0)).toBe("00:00");
  });

  it("clamps negatives to zero", () => {
    expect(formatTimer(-5)).toBe("00:00");
  });

  it("shows minutes beyond 60 without rolling into hours", () => {
    expect(formatTimer(3600)).toBe("60:00");
  });
});

describe("formatFocusTotal", () => {
  it("shows only minutes under an hour", () => {
    expect(formatFocusTotal(1500)).toBe("25min");
  });

  it("shows hours and minutes", () => {
    expect(formatFocusTotal(5400)).toBe("1h 30min");
  });

  it("shows whole hours without minutes", () => {
    expect(formatFocusTotal(3600)).toBe("1h");
  });

  it("shows 0min for sub-minute totals", () => {
    expect(formatFocusTotal(45)).toBe("0min");
    expect(formatFocusTotal(0)).toBe("0min");
  });
});
