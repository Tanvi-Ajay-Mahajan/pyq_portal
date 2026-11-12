import { env, isAiConfigured } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Minimal Gemini REST client (no SDK dependency).
 * The API key is read from the server environment only and is never returned to
 * the browser. Every failure is translated into an actionable ApiError.
 */
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export { isAiConfigured };

export const AI_NOT_CONFIGURED_MESSAGE =
  'AI is not configured yet. Add GEMINI_API_KEY to the server environment variables and restart the server.';

const friendlyError = (status, providerMessage) => {
  if (status === 429) {
    return new ApiError(
      429,
      'The AI service rate limit was reached. Please wait a moment and try again.',
    );
  }
  if (status === 400 || status === 403) {
    if (/api[ _-]?key/i.test(providerMessage)) {
      return new ApiError(
        502,
        'The AI provider rejected the API key. Check that GEMINI_API_KEY is a valid Google AI Studio key.',
      );
    }
    return new ApiError(502, `The AI provider rejected the request: ${providerMessage}`);
  }
  if (status === 404) {
    return new ApiError(
      502,
      `The configured AI model "${env.GEMINI_MODEL}" is not available for this API key. Set GEMINI_MODEL to a supported model.`,
    );
  }
  if (status >= 500) {
    return new ApiError(502, 'The AI service is temporarily unavailable. Please try again.');
  }
  return new ApiError(502, `AI service error: ${providerMessage}`);
};

async function post(path, body) {
  if (!isAiConfigured()) throw ApiError.serviceUnavailable(AI_NOT_CONFIGURED_MESSAGE);

  let response;
  try {
    response = await fetch(`${BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(env.AI_TIMEOUT_MS),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new ApiError(504, 'The AI service took too long to respond. Please try again.');
    }
    throw new ApiError(502, 'Could not reach the AI service. Check the server network connection.');
  }

  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw friendlyError(response.status, payload?.error?.message || `HTTP ${response.status}`);
  }
  return payload;
}

/** Generates plain text (or JSON when `json` is true) for a single prompt. */
export async function generateText({
  system,
  prompt,
  temperature = 0.4,
  maxOutputTokens = 2048,
  json = false,
}) {
  const payload = await post(`models/${env.GEMINI_MODEL}:generateContent`, {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  });

  const candidate = payload?.candidates?.[0];
  const text = (candidate?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('')
    .trim();

  if (!text) {
    const reason = candidate?.finishReason;
    if (reason === 'SAFETY' || reason === 'PROHIBITED_CONTENT') {
      throw new ApiError(422, 'The AI declined to answer this request. Try rephrasing it.');
    }
    if (reason === 'MAX_TOKENS') {
      throw new ApiError(502, 'The answer was cut off because it was too long. Try a shorter question.');
    }
    throw new ApiError(502, 'The AI service returned an empty response. Please try again.');
  }

  return { text, model: env.GEMINI_MODEL, finishReason: candidate?.finishReason ?? null };
}

/**
 * Embeds texts for retrieval. Returns null when embeddings are unavailable so
 * the caller can fall back to keyword ranking instead of failing the request.
 */
export async function embedTexts(texts) {
  if (!texts.length) return [];
  if (!isAiConfigured()) return null;

  try {
    const vectors = [];
    const batchSize = 20;
    for (let start = 0; start < texts.length; start += batchSize) {
      const batch = texts.slice(start, start + batchSize);
      const payload = await post(`models/${env.GEMINI_EMBED_MODEL}:batchEmbedContents`, {
        requests: batch.map((text) => ({
          model: `models/${env.GEMINI_EMBED_MODEL}`,
          content: { parts: [{ text }] },
        })),
      });
      const embeddings = payload?.embeddings || [];
      if (embeddings.length !== batch.length) return null;
      vectors.push(...embeddings.map((entry) => entry?.values || []));
    }
    return vectors.every((vector) => Array.isArray(vector) && vector.length > 0) ? vectors : null;
  } catch {
    // Retrieval still works with keyword scoring, so never fail the upload here.
    return null;
  }
}
