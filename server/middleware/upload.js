import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * PDF upload handling: memory storage only (nothing touches the disk) with a
 * size cap. The magic bytes are verified again in the controller, because a
 * client can send any MIME type it likes.
 */
const storage = multer.memoryStorage();

const pdfUpload = multer({
  storage,
  limits: {
    fileSize: env.AI_MAX_PDF_MB * 1024 * 1024,
    files: 1,
    fields: 6,
  },
  fileFilter: (_req, file, callback) => {
    const looksLikePdf =
      file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
    if (!looksLikePdf) {
      return callback(ApiError.badRequest('Only PDF files can be uploaded.'));
    }
    return callback(null, true);
  },
});

/** Single-file upload that converts multer errors into clean API errors. */
export const uploadSinglePdf = (req, res, next) => {
  pdfUpload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof ApiError) return next(error);
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return next(
        ApiError.badRequest(`The PDF is too large. The maximum size is ${env.AI_MAX_PDF_MB} MB.`),
      );
    }
    if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(ApiError.badRequest('Send the PDF in a single form field named "file".'));
    }
    return next(ApiError.badRequest(error?.message || 'The upload could not be processed.'));
  });
};

export const isPdfBuffer = (buffer) =>
  Boolean(buffer && buffer.length > 4 && buffer.subarray(0, 5).toString('latin1') === '%PDF-');
