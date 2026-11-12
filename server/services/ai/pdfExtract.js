import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Extracts text page by page from a PDF buffer held in memory.
 * Nothing is written to disk, which keeps the app usable on hosts without a
 * persistent volume.
 */
export async function extractPdfPages(buffer, { maxPages = 200 } = {}) {
  if (!buffer || buffer.length === 0) {
    throw ApiError.badRequest('The uploaded file is empty.');
  }

  let pdf;
  try {
    pdf = await getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    }).promise;
  } catch (error) {
    throw ApiError.badRequest(
      `This file could not be read as a PDF (${error?.message || 'invalid document'}).`,
    );
  }

  const totalPages = pdf.numPages || 0;
  const limit = Math.min(totalPages, maxPages);
  const pages = [];

  try {
    for (let pageNumber = 1; pageNumber <= limit; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = (content.items || [])
        .map((item) => {
          if (typeof item.str !== 'string') return '';
          return item.str + (item.hasEOL ? '\n' : ' ');
        })
        .join('')
        .replace(/[ \t]+/g, ' ')
        .replace(/ ?\n ?/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (text) pages.push({ page: pageNumber, text });
      page.cleanup?.();
    }
  } finally {
    await pdf.destroy?.();
  }

  return {
    pages,
    totalPages,
    truncated: totalPages > limit,
    maxPages,
  };
}
