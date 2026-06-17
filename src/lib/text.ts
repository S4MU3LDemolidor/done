/**
 * Shared text utility — kept intentionally minimal.
 * Import individual exports rather than the module to keep tree-shaking easy.
 */

/**
 * Accent-folds a string: lower-case → NFD decompose → strip combining marks.
 * Used for fuzzy search / matching across the app (parser, notes, mentions, etc.).
 *
 * The regex range ̀-ͯ covers the Unicode "Combining Diacritical Marks"
 * block (same characters the previous per-file copies encoded as literal combining
 * chars, which were visually ambiguous in source).
 */
// eslint-disable-next-line no-misleading-character-class
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
