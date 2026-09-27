import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../database/connection.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { parseDocument } from '../../src/modules/verichain/agents/evidence.js';

const router = express.Router();

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.csv', '.xlsx', '.txt', '.md'];
const SUPPORTED_MIMES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown'
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.resolve(process.cwd(), '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^\w\-\.]/g, '_');
        cb(null, safeName);
    }
});

const upload = multer({ storage });

// POST /documents/upload
router.post('/upload', authenticateUser, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ detail: 'No file uploaded' });
    }

    const { originalname, path: filePath, mimetype, size } = req.file;
    const fileExt = path.extname(originalname).toLowerCase();

    // Check extensions/mimetypes
    if (!SUPPORTED_EXTENSIONS.includes(fileExt) && !SUPPORTED_MIMES.includes(mimetype)) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return res.status(400).json({
            detail: 'File extension or MIME type not supported. Use PDF, DOCX, CSV, XLSX, MD, or TXT.'
        });
    }

    try {
        // Extract preview content using our core TS parser
        const previewText = await parseDocument(filePath, mimetype || fileExt.replace('.', ''));
        const previewSample = previewText ? previewText.substring(0, 1000) : null;

        const now = new Date().toISOString();
        const result = await db.run(
            'INSERT INTO uploaded_documents (user_id, filename, file_path, file_type, file_size, content_preview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, originalname, filePath, mimetype || fileExt.replace('.', ''), size, previewSample, now]
        );

        console.log(`User ${req.user.username} uploaded ${originalname} (${size} bytes).`);
        await db.run(
            'INSERT INTO audit_logs (user_id, action, created_at) VALUES (?, ?, ?)',
            [req.user.id, `Uploaded document: ${originalname}`, now]
        );

        return res.status(201).json({
            id: result.lastID,
            filename: originalname,
            file_type: mimetype || fileExt.replace('.', ''),
            file_size: size,
            created_at: now
        });
    } catch (err: any) {
        console.error('Failed to register uploaded document:', err.message);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return res.status(500).json({ detail: 'Failed to upload document' });
    }
});

// GET /documents
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const docs = await db.all<{ id: number, filename: string, file_type: string, file_size: number, created_at: string }>('SELECT * FROM uploaded_documents ORDER BY created_at DESC');
        return res.json(docs.map(doc => ({
            id: doc.id,
            filename: doc.filename,
            file_type: doc.file_type,
            file_size: doc.file_size,
            created_at: doc.created_at
        })));
    } catch (err: any) {
        console.error('Failed to list documents:', err.message);
        return res.status(500).json({ detail: 'Failed to retrieve documents list' });
    }
});

// DELETE /documents/:doc_id
router.delete('/:doc_id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const docId = req.params.doc_id;

    try {
        const doc = await db.get<{ id: number, filename: string, file_path: string }>('SELECT * FROM uploaded_documents WHERE id = ?', [docId]);
        if (!doc) {
            return res.status(404).json({ detail: 'Document not found' });
        }

        if (fs.existsSync(doc.file_path)) {
            fs.unlinkSync(doc.file_path);
        }

        await db.run('DELETE FROM evidence WHERE doc_id = ?', [docId]);
        await db.run('DELETE FROM uploaded_documents WHERE id = ?', [docId]);

        console.log(`User ${req.user.username} deleted document ID ${docId}.`);
        const now = new Date().toISOString();
        await db.run(
            'INSERT INTO audit_logs (user_id, action, created_at) VALUES (?, ?, ?)',
            [req.user.id, `Deleted document: ${doc.filename}`, now]
        );

        return res.json({ detail: 'Document successfully deleted' });
    } catch (err: any) {
        console.error('Failed to delete document:', err.message);
        return res.status(500).json({ detail: 'Failed to delete document' });
    }
});

export default router;
