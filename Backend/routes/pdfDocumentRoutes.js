import express from 'express';
import multer from 'multer';
import path from 'path';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import PdfDocument from '../models/pdfDocumentModel.js';
import { requireAdmin, verifyToken } from '../controllers/authController.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { getR2Client, getBucket, getPresignedExpiry } from '../config/r2.js';

const router = express.Router();

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

const generatePdfId = async () => {
  const last = await PdfDocument.findOne().sort({ createdAt: -1 }).select('pdfId').lean();
  const num = last ? parseInt(last.pdfId.replace('PDF-', ''), 10) + 1 : 1;
  return `PDF-${String(num).padStart(3, '0')}`;
};

router.post('/pdf-documents', requireAdmin, pdfUpload.single('file'), catchAsync(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'PDF file is required' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  const s3 = getR2Client();
  if (!s3) return res.status(500).json({ message: 'Storage not configured' });
  const pdfId = await generatePdfId();
  const key = `course-pdfs/${Date.now()}-${Math.round(Math.random() * 1e6)}.pdf`;
  await s3.send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: req.file.buffer,
    ContentType: 'application/pdf',
  }));
  const doc = await PdfDocument.create({
    pdfId, name, filename: key, originalName: req.file.originalname, size: req.file.size,
  });
  res.status(201).json(doc);
}));

router.get('/pdf-documents', verifyToken, catchAsync(async (req, res) => {
  const docs = await PdfDocument.find().sort({ createdAt: -1 }).lean();
  res.json(docs);
}));

router.get('/pdf-documents/by-pdf-id/:pdfId', verifyToken, catchAsync(async (req, res) => {
  const doc = await PdfDocument.findOne({ pdfId: req.params.pdfId }).lean();
  if (!doc) return res.status(404).json({ message: 'PDF not found' });
  res.json(doc);
}));

router.delete('/pdf-documents/:id', requireAdmin, catchAsync(async (req, res) => {
  const doc = await PdfDocument.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: 'PDF not found' });
  const s3 = getR2Client();
  if (s3) {
    try { await s3.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: doc.filename })); }
    catch { /* may not exist */ }
  }
  res.json({ message: 'PDF deleted' });
}));

router.get('/course-pdfs/:filename', verifyToken, catchAsync(async (req, res) => {
  const s3 = getR2Client();
  if (!s3) return res.status(500).json({ message: 'Storage not configured' });
  const key = `course-pdfs/${path.basename(req.params.filename)}`;
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: getBucket(), Key: key }), {
    expiresIn: getPresignedExpiry(),
    ResponseContentDisposition: 'inline',
    ResponseContentType: 'application/pdf',
  });
  res.json({ url });
}));

export default router;
