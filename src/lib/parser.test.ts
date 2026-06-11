import { describe, expect, test } from "vitest";
import {
  formatDue,
  isOverdue,
  parseTask,
  toIsoDate,
  toLocalIsoDateTime,
} from "./parser";

// Quinta-feira, 11 de junho de 2026
const NOW = new Date(2026, 5, 11, 10, 30);

describe("parseTask — segmentos", () => {
  test("título, data e grupo", () => {
    expect(parseTask("revisar PR, 15/06, trabalho", NOW)).toEqual({
      title: "revisar PR",
      due: "2026-06-15",
      group: "trabalho",
    });
  });

  test("apenas título", () => {
    expect(parseTask("academia", NOW)).toEqual({
      title: "academia",
      due: null,
      group: null,
    });
  });

  test("título com espaços, sem data nem grupo", () => {
    expect(parseTask("reunião com time", NOW)).toEqual({
      title: "reunião com time",
      due: null,
      group: null,
    });
  });

  test("título e grupo sem data", () => {
    expect(parseTask("limpar casa, casa", NOW)).toEqual({
      title: "limpar casa",
      due: null,
      group: "casa",
    });
  });

  test("título e data sem grupo", () => {
    expect(parseTask("ligar médico, hoje", NOW)).toEqual({
      title: "ligar médico",
      due: "2026-06-11",
      group: null,
    });
  });

  test("segmentos extras: último não-data vira grupo", () => {
    expect(parseTask("tarefa, 15/06, casa, urgente", NOW)).toEqual({
      title: "tarefa",
      due: "2026-06-15",
      group: "urgente",
    });
  });

  test("data no fim também funciona", () => {
    expect(parseTask("tarefa, casa, 15/06", NOW)).toEqual({
      title: "tarefa",
      due: "2026-06-15",
      group: "casa",
    });
  });

  test("espaços e segmentos vazios são ignorados", () => {
    expect(parseTask("  tarefa ,  , casa ", NOW)).toEqual({
      title: "tarefa",
      due: null,
      group: "casa",
    });
  });

  test("entrada vazia retorna título vazio", () => {
    expect(parseTask("", NOW)).toEqual({ title: "", due: null, group: null });
  });
});

describe("parseTask — datas dd/mm e dd/mm/yyyy", () => {
  test("dd/mm futuro neste ano", () => {
    expect(parseTask("t, 15/06", NOW).due).toBe("2026-06-15");
  });

  test("dd/mm já passado vira próximo ano", () => {
    expect(parseTask("limpar casa, 12/05, casa", NOW).due).toBe("2027-05-12");
  });

  test("dd/mm igual a hoje é hoje", () => {
    expect(parseTask("t, 11/06", NOW).due).toBe("2026-06-11");
  });

  test("dd/mm/yyyy explícito", () => {
    expect(parseTask("t, 25/12/2026", NOW).due).toBe("2026-12-25");
  });

  test("dígito único dd/m", () => {
    expect(parseTask("t, 5/7", NOW).due).toBe("2026-07-05");
  });

  test("data inválida vira grupo", () => {
    expect(parseTask("t, 32/13", NOW)).toEqual({
      title: "t",
      due: null,
      group: "32/13",
    });
  });
});

describe("parseTask — datas por extenso (PT-BR)", () => {
  test("hoje", () => {
    expect(parseTask("t, hoje", NOW).due).toBe("2026-06-11");
  });

  test("amanhã (com e sem acento)", () => {
    expect(parseTask("t, amanhã", NOW).due).toBe("2026-06-12");
    expect(parseTask("t, amanha", NOW).due).toBe("2026-06-12");
  });

  test("sexta é a próxima sexta-feira", () => {
    expect(parseTask("comprar presente, sexta, pessoal", NOW)).toEqual({
      title: "comprar presente",
      due: "2026-06-12",
      group: "pessoal",
    });
  });

  test("dia da semana de hoje conta como hoje", () => {
    expect(parseTask("t, quinta", NOW).due).toBe("2026-06-11");
  });

  test("segunda e segunda-feira", () => {
    expect(parseTask("t, segunda", NOW).due).toBe("2026-06-15");
    expect(parseTask("t, segunda-feira", NOW).due).toBe("2026-06-15");
  });

  test("sábado e domingo (com e sem acento)", () => {
    expect(parseTask("t, sábado", NOW).due).toBe("2026-06-13");
    expect(parseTask("t, sabado", NOW).due).toBe("2026-06-13");
    expect(parseTask("t, domingo", NOW).due).toBe("2026-06-14");
  });

  test("terça e terca", () => {
    expect(parseTask("t, terça", NOW).due).toBe("2026-06-16");
    expect(parseTask("t, terca", NOW).due).toBe("2026-06-16");
  });

  test("maiúsculas não importam", () => {
    expect(parseTask("t, HOJE", NOW).due).toBe("2026-06-11");
    expect(parseTask("t, Sexta", NOW).due).toBe("2026-06-12");
  });
});

describe("formatDue", () => {
  test("hoje e amanhã", () => {
    expect(formatDue("2026-06-11", NOW)).toBe("hoje");
    expect(formatDue("2026-06-12", NOW)).toBe("amanhã");
  });

  test("outras datas em formato curto", () => {
    expect(formatDue("2026-05-12", NOW)).toBe("12 mai");
    expect(formatDue("2026-12-25", NOW)).toBe("25 dez");
  });
});

describe("isOverdue", () => {
  test("data passada está atrasada", () => {
    expect(isOverdue("2026-06-10", NOW)).toBe(true);
  });

  test("hoje e futuro não estão atrasados", () => {
    expect(isOverdue("2026-06-11", NOW)).toBe(false);
    expect(isOverdue("2026-06-20", NOW)).toBe(false);
  });

  test("sem data nunca atrasa", () => {
    expect(isOverdue(null, NOW)).toBe(false);
  });
});

describe("toIsoDate", () => {
  test("formata em horário local, não UTC", () => {
    expect(toIsoDate(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
  });
});

describe("toLocalIsoDateTime", () => {
  test("data e hora locais sem sufixo de fuso", () => {
    expect(toLocalIsoDateTime(new Date(2026, 3, 28, 10, 32, 0))).toBe(
      "2026-04-28T10:32:00",
    );
  });

  test("zera à esquerda", () => {
    expect(toLocalIsoDateTime(new Date(2026, 0, 5, 9, 7, 3))).toBe(
      "2026-01-05T09:07:03",
    );
  });
});
