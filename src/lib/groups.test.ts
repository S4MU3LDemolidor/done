import { describe, expect, test } from "vitest";
import { deriveGroups } from "./groups";
import type { Task } from "./types";

function task(group: string | null): Task {
  return {
    id: Math.random().toString(36),
    title: "t",
    due: null,
    group,
    done: false,
    created: "2026-06-01T00:00:00",
    completedAt: null,
    xp: 10,
  };
}

describe("deriveGroups", () => {
  test("um grupo existe só se houver tarefa com ele", () => {
    const tasks = [task("Casa"), task("Trabalho"), task(null)];
    const names = deriveGroups(tasks, {}).map((g) => g.name);
    expect(names).toEqual(["Casa", "Trabalho"]);
  });

  test("grupo presente só em groups.json (sem tarefa) NÃO aparece", () => {
    // Regressão: grupos excluídos deixavam cor órfã e reapareciam no Option+Space
    const tasks = [task("Casa")];
    const colors = { Casa: "#FF6363", Freela: "#56C2FF" };
    const names = deriveGroups(tasks, colors).map((g) => g.name);
    expect(names).toEqual(["Casa"]);
    expect(names).not.toContain("Freela");
  });

  test("usa a cor salva quando existe", () => {
    expect(deriveGroups([task("Casa")], { Casa: "#123456" })[0].color).toBe(
      "#123456",
    );
  });

  test("sem cor salva, cai na cor derivada do nome (não vazia)", () => {
    expect(deriveGroups([task("Casa")], {})[0].color).toMatch(/^#/);
  });

  test("não duplica e ordena em PT-BR", () => {
    const tasks = [task("Zebra"), task("Águia"), task("Zebra")];
    expect(deriveGroups(tasks, {}).map((g) => g.name)).toEqual([
      "Águia",
      "Zebra",
    ]);
  });
});
