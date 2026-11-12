/**
 * Splits extracted pages into overlapping chunks that keep their page number,
 * so a generated answer can cite the exact page it came from.
 *
 * The chunk size adapts to the document: a very long PDF produces fewer, larger
 * chunks instead of thousands of tiny ones, which keeps retrieval fast and
 * memory use bounded on a 1 GB instance.
 */
const DEFAULT_MAX_CHARS = 1400;
const DEFAULT_OVERLAP = 200;
const MAX_CHARS_LIMIT = 6000;

const splitPageText = (text, size, overlap) => {
  const pieces = text.match(/[^.!?\n]+[.!?]*\s*/g) || [text];
  const chunks = [];
  let current = '';

  for (const piece of pieces) {
    if (current && current.length + piece.length > size) {
      chunks.push(current.trim());
      current = current.slice(-overlap) + piece;
    } else {
      current += piece;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
};

export function chunkPages(
  pages,
  { maxChars = DEFAULT_MAX_CHARS, overlap = DEFAULT_OVERLAP, maxChunks = 400 } = {},
) {
  const totalChars = pages.reduce((sum, page) => sum + (page.text?.length || 0), 0);
  if (!totalChars) return [];

  const size = Math.min(Math.max(Math.ceil(totalChars / maxChunks), maxChars), MAX_CHARS_LIMIT);
  const effectiveOverlap = Math.min(overlap, Math.floor(size / 4));

  const chunks = [];
  for (const page of pages) {
    const text = (page.text || '').trim();
    if (!text) continue;
    for (const part of splitPageText(text, size, effectiveOverlap)) {
      chunks.push({ index: chunks.length, page: page.page, text: part });
    }
  }

  // Hard cap: keep the first `maxChunks` so the request stays bounded.
  return chunks.slice(0, maxChunks).map((chunk, index) => ({ ...chunk, index }));
}

export const chunkingDefaults = { DEFAULT_MAX_CHARS, DEFAULT_OVERLAP, MAX_CHARS_LIMIT };
