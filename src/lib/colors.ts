const PALETTE = [
  "#FF6363",
  "#56C2FF",
  "#59D499",
  "#FFB454",
  "#CF9EF1",
  "#2DD4BF",
];

/** Cor estável por nome de grupo. */
export function groupColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
