import { describe, expect, test } from "vitest";
import { GROUP_PALETTE, groupColor } from "./colors";

describe("groupColor", () => {
  test("cor estável para o mesmo nome", () => {
    expect(groupColor("casa")).toBe(groupColor("casa"));
  });

  test("sempre retorna uma cor da paleta quando não há override", () => {
    expect(GROUP_PALETTE).toContain(groupColor("trabalho"));
    expect(GROUP_PALETTE).toContain(groupColor("qualquer-coisa"));
  });

  test("usa a cor escolhida pelo usuário quando existe override", () => {
    expect(groupColor("casa", { casa: "#123456" })).toBe("#123456");
  });

  test("override de outro grupo não afeta este", () => {
    expect(groupColor("casa", { trabalho: "#123456" })).toBe(groupColor("casa"));
  });
});
