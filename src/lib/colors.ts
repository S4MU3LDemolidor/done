/** Paleta de cores para grupos — usada nos seletores e como fallback estável. */
export const GROUP_PALETTE = [
  "#FF6363",
  "#FF8FB1",
  "#FFB454",
  "#FFD166",
  "#59D499",
  "#2DD4BF",
  "#56C2FF",
  "#7C9BFF",
  "#CF9EF1",
  "#9AA0A6",
];

/** Cor de um grupo: a escolhida pelo usuário, ou uma cor estável derivada do nome. */
export function groupColor(
  name: string,
  overrides?: Record<string, string>,
): string {
  const chosen = overrides?.[name];
  if (chosen) return chosen;
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return GROUP_PALETTE[Math.abs(hash) % GROUP_PALETTE.length];
}
