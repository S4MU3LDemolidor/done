const PALETTE = [
  "#7C5CFF",
  "#5CA8FF",
  "#4ADE80",
  "#FFB454",
  "#FF6B9D",
  "#2DD4BF",
];

/** Cor estável por nome de grupo. */
export function groupColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
