/**
 * Retrieval for document Q&A.
 *
 * Two scorers are combined:
 *  - cosine similarity over Gemini embeddings (when they were generated), and
 *  - a TF-IDF style keyword score that always works.
 *
 * Similarity is computed in Node instead of using Atlas Vector Search, so the
 * feature works on any MongoDB deployment, including a local one.
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'do', 'does', 'for', 'from',
  'how', 'i', 'in', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'so', 'that', 'the',
  'their', 'then', 'there', 'these', 'this', 'to', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your', 'explain', 'define',
  'describe', 'tell', 'give', 'about', 'please',
]);

export const tokenize = (text) =>
  (String(text || '').toLowerCase().match(/[a-z0-9]{2,}/g) || []).filter(
    (token) => !STOPWORDS.has(token),
  );

export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** IDF-weighted term overlap for every chunk. */
export function keywordScores(query, chunks) {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length || !chunks.length) return chunks.map(() => 0);

  const tokenized = chunks.map((chunk) => tokenize(chunk.text));
  const documentFrequency = new Map();
  for (const tokens of tokenized) {
    const unique = new Set(tokens);
    for (const term of terms) {
      if (unique.has(term)) documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    }
  }

  const total = chunks.length;
  return tokenized.map((tokens) => {
    let score = 0;
    for (const term of terms) {
      const frequency = tokens.filter((token) => token === term).length;
      if (!frequency) continue;
      const idf = Math.log(1 + total / (1 + (documentFrequency.get(term) || 0)));
      score += (1 + Math.log(frequency)) * idf;
    }
    return tokens.length ? score / Math.sqrt(tokens.length) : 0;
  });
}

/**
 * Picks the chunks most relevant to the question.
 * Returns `[{ chunk, score }]` sorted by relevance.
 */
export function selectRelevantChunks(query, chunks, { topK = 6, queryEmbedding = null } = {}) {
  if (!chunks.length) return [];

  const keyword = keywordScores(query, chunks);
  const keywordMax = Math.max(...keyword, 1);
  const canUseVectors =
    Array.isArray(queryEmbedding) &&
    queryEmbedding.length > 0 &&
    chunks.every((chunk) => Array.isArray(chunk.embedding) && chunk.embedding.length > 0);

  const scored = chunks.map((chunk, position) => {
    const keywordScore = keyword[position] / keywordMax;
    if (!canUseVectors) return { chunk, score: keywordScore };
    const vectorScore = cosine(queryEmbedding, chunk.embedding);
    return { chunk, score: 0.6 * vectorScore + 0.4 * keywordScore };
  });

  const ranked = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Nothing matched lexically or semantically: still give the model some context
  // so it can say the document does not cover the question.
  if (ranked.length === 0) {
    return chunks.slice(0, Math.min(topK, chunks.length)).map((chunk) => ({ chunk, score: 0 }));
  }
  return ranked;
}

/** Short, readable excerpt used for page citations in the UI. */
export const snippetOf = (text, limit = 240) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit).trimEnd()}…` : clean;
};
