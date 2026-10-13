import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { store } from '../db/store';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequestError, notFoundError } from '../utils/httpError';
import { UPLOADS_DIR } from '../config';
import type { DocumentId, DocumentRecord } from '../types';

export const documentsRouter = Router({ mergeParams: true });

const DOCUMENT_IDS: DocumentId[] = ['discharge-summary', 'id-proof', 'policy-document', 'itemized-bill'];

const documentIdSchema = z.enum(['discharge-summary', 'id-proof', 'policy-document', 'itemized-bill']);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const caseDir = path.join(UPLOADS_DIR, req.params.caseId);
    fs.mkdirSync(caseDir, { recursive: true });
    cb(null, caseDir);
  },
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB — plenty for a demo scan/photo
});

// GET /api/cases/:caseId/documents
documentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    if (!store.caseExists(caseId)) throw notFoundError(`No case with id "${caseId}"`);
    res.json(store.listDocuments(caseId));
  })
);

// POST /api/cases/:caseId/documents  (multipart/form-data: file, documentId)
documentsRouter.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    if (!store.caseExists(caseId)) throw notFoundError(`No case with id "${caseId}"`);

    const parsedDocId = documentIdSchema.safeParse(req.body.documentId);
    if (!parsedDocId.success) {
      throw badRequestError(`documentId must be one of: ${DOCUMENT_IDS.join(', ')}`);
    }
    if (!req.file) {
      throw badRequestError('No file uploaded — send it as multipart/form-data under field "file".');
    }

    const record: DocumentRecord = {
      documentId: parsedDocId.data,
      originalName: req.file.originalname,
      // Forward slashes always, regardless of host OS, so this can be
      // appended straight onto the /uploads/ static route as a URL path.
      storedPath: path.relative(UPLOADS_DIR, req.file.path).split(path.sep).join('/'),
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedAt: new Date().toISOString(),
    };

    const documents = store.addDocument(caseId, record);
    res.status(201).json(documents);
  })
);
