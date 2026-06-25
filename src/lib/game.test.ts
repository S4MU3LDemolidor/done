import { describe, expect, test } from "vitest";
import {
  evaluateAchievements,
  levelForXp,
  streak,
  totalXp,
  xpForCompletion,
} from "./game";
import type { FocusSession, Task } from "./types";

function focusSession(
  startedAt: string,
  focusedSeconds: number,
): FocusSession {
  return { taskId: "t", startedAt, focusedSeconds, completed: true };
}

// Quinta-feira, 11 de junho de 2026
const NOW = new Date(2026, 5, 11, 14, 0);

let seq = 0;
function doneTask(overrides: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `tarefa ${seq}`,
    due: null,
    group: null,
    done: true,
    created: "2026-06-01T08:00:00",
    completedAt: "2026-06-11T09:00:00",
    xp: 10,
    ...overrides,
  };
}

describe("xpForCompletion", () => {
  test("sem prazo ganha 10", () => {
    expect(xpForCompletion(null, NOW)).toBe(10);
  });

  test("antes do prazo ganha bônus: 15", () => {
    expect(xpForCompletion("2026-06-20", NOW)).toBe(15);
  });

  test("no dia do prazo ainda ganha bônus", () => {
    expect(xpForCompletion("2026-06-11", NOW)).toBe(15);
  });

  test("depois do prazo ganha só 10", () => {
    expect(xpForCompletion("2026-06-10", NOW)).toBe(10);
  });

  test("concluída em foco ganha bônus de foco: +5", () => {
    expect(xpForCompletion(null, NOW, true)).toBe(15);
  });

  test("foco + no prazo somam os dois bônus: 20", () => {
    expect(xpForCompletion("2026-06-20", NOW, true)).toBe(20);
  });

  test("foco vale o bônus mesmo fora do prazo: 15", () => {
    expect(xpForCompletion("2026-06-10", NOW, true)).toBe(15);
  });
});

describe("totalXp", () => {
  test("soma apenas tarefas concluídas", () => {
    const tasks = [
      doneTask({ xp: 10 }),
      doneTask({ xp: 15 }),
      doneTask({ done: false, completedAt: null, xp: 10 }),
    ];
    expect(totalXp(tasks)).toBe(25);
  });
});

describe("levelForXp — limiares 0, 100, 250, 500, 1000, 2000, dobrando", () => {
  test("começa no nível 1", () => {
    expect(levelForXp(0)).toEqual({ level: 1, min: 0, next: 100 });
    expect(levelForXp(99)).toEqual({ level: 1, min: 0, next: 100 });
  });

  test("nível 2 aos 100 XP", () => {
    expect(levelForXp(100)).toEqual({ level: 2, min: 100, next: 250 });
  });

  test("nível 3 aos 250, nível 4 aos 500, nível 5 aos 1000", () => {
    expect(levelForXp(250).level).toBe(3);
    expect(levelForXp(999).level).toBe(4);
    expect(levelForXp(1000).level).toBe(5);
  });

  test("depois de 2000 os limiares dobram", () => {
    expect(levelForXp(2000)).toEqual({ level: 6, min: 2000, next: 4000 });
    expect(levelForXp(4000)).toEqual({ level: 7, min: 4000, next: 8000 });
  });
});

describe("streak", () => {
  test("sem tarefas concluídas é 0", () => {
    expect(streak([], NOW)).toBe(0);
  });

  test("dias consecutivos terminando hoje", () => {
    const tasks = [
      doneTask({ completedAt: "2026-06-09T20:00:00" }),
      doneTask({ completedAt: "2026-06-10T08:00:00" }),
      doneTask({ completedAt: "2026-06-11T09:00:00" }),
    ];
    expect(streak(tasks, NOW)).toBe(3);
  });

  test("nada hoje ainda, mas ontem sim: streak segue valendo", () => {
    const tasks = [
      doneTask({ completedAt: "2026-06-09T20:00:00" }),
      doneTask({ completedAt: "2026-06-10T08:00:00" }),
    ];
    expect(streak(tasks, NOW)).toBe(2);
  });

  test("um dia sem concluir quebra a sequência", () => {
    const tasks = [
      doneTask({ completedAt: "2026-06-08T10:00:00" }),
      doneTask({ completedAt: "2026-06-11T09:00:00" }),
    ];
    expect(streak(tasks, NOW)).toBe(1);
  });

  test("último dia concluído anteontem ou antes: 0", () => {
    const tasks = [doneTask({ completedAt: "2026-06-09T10:00:00" })];
    expect(streak(tasks, NOW)).toBe(0);
  });

  test("várias conclusões no mesmo dia contam uma vez", () => {
    const tasks = [
      doneTask({ completedAt: "2026-06-11T09:00:00" }),
      doneTask({ completedAt: "2026-06-11T10:00:00" }),
      doneTask({ completedAt: "2026-06-10T10:00:00" }),
    ];
    expect(streak(tasks, NOW)).toBe(2);
  });
});

describe("evaluateAchievements", () => {
  test("sem tarefas: nada desbloqueado", () => {
    expect(evaluateAchievements([], NOW)).toEqual([]);
  });

  test("primeira tarefa concluída desbloqueia first_task", () => {
    const unlocked = evaluateAchievements([doneTask()], NOW);
    expect(unlocked).toContain("first_task");
    expect(unlocked).not.toContain("ten_tasks");
  });

  test("tarefa com grupo desbloqueia first_group", () => {
    expect(evaluateAchievements([doneTask({ group: "casa" })], NOW)).toContain(
      "first_group",
    );
    // grupo conta mesmo em tarefa pendente
    expect(
      evaluateAchievements(
        [doneTask({ done: false, completedAt: null, group: "casa" })],
        NOW,
      ),
    ).toContain("first_group");
  });

  test("10 concluídas desbloqueia ten_tasks", () => {
    const tasks = Array.from({ length: 10 }, () => doneTask());
    expect(evaluateAchievements(tasks, NOW)).toContain("ten_tasks");
  });

  test("streak de 7 dias desbloqueia streak_7", () => {
    const tasks = Array.from({ length: 7 }, (_, i) =>
      doneTask({ completedAt: `2026-06-${String(5 + i).padStart(2, "0")}T10:00:00` }),
    );
    expect(evaluateAchievements(tasks, NOW)).toContain("streak_7");
    expect(evaluateAchievements(tasks, NOW)).not.toContain("streak_30");
  });

  test("1000 XP (nível 5) desbloqueia level_5", () => {
    const tasks = Array.from({ length: 100 }, () => doneTask({ xp: 10 }));
    expect(evaluateAchievements(tasks, NOW)).toContain("level_5");
  });

  test("sessão de foco de 25min desbloqueia deep_work", () => {
    const sessions = [focusSession("2026-06-11T09:00:00", 1500)];
    expect(evaluateAchievements([], NOW, sessions)).toContain("deep_work");
  });

  test("sessões curtas não desbloqueiam deep_work", () => {
    const sessions = [focusSession("2026-06-11T09:00:00", 1499)];
    expect(evaluateAchievements([], NOW, sessions)).not.toContain("deep_work");
  });

  test("foco em 3 dias seguidos desbloqueia flow", () => {
    const sessions = [
      focusSession("2026-06-09T09:00:00", 600),
      focusSession("2026-06-10T09:00:00", 600),
      focusSession("2026-06-11T09:00:00", 600),
    ];
    expect(evaluateAchievements([], NOW, sessions)).toContain("flow");
  });

  test("menos de 3 dias de foco não desbloqueia flow", () => {
    const sessions = [
      focusSession("2026-06-10T09:00:00", 600),
      focusSession("2026-06-11T09:00:00", 600),
    ];
    expect(evaluateAchievements([], NOW, sessions)).not.toContain("flow");
  });

  test("sem sessões de foco não desbloqueia deep_work nem flow", () => {
    const unlocked = evaluateAchievements([doneTask()], NOW);
    expect(unlocked).not.toContain("deep_work");
    expect(unlocked).not.toContain("flow");
  });
});
