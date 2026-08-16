import express from 'express';
import multer from 'multer';
import { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { requireAdmin } from '../controllers/authController.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { getR2Client, getBucket } from '../config/r2.js';
import Quiz from '../models/quizModel.js';
import VoiceExam from '../models/voiceExamModel.js';

const router = express.Router();

const allowedMime = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = '.' + file.originalname.toLowerCase().split('.').pop();
    if (allowed.includes(ext) && allowedMime.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed (png, jpg, jpeg, gif, webp)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/admin/images', requireAdmin, catchAsync(async (req, res) => {
  const s3 = getR2Client();
  if (!s3) return res.status(500).json({ message: 'Storage not configured' });
  const prefix = req.query.prefix || '';
  const data = await s3.send(new ListObjectsV2Command({
    Bucket: getBucket(),
    Prefix: prefix,
  }));
  const images = (data.Contents || []).map((obj) => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified,
    source: obj.Key.startsWith('quiz-images/') ? 'quiz' : obj.Key.startsWith('voice-exam-images/') ? 'voice-exam' : 'other',
  })).filter((img) => /\.(png|jpg|jpeg|gif|webp)$/i.test(img.key));
  res.json(images);
}));

router.post('/admin/images', requireAdmin, imageUpload.single('file'), catchAsync(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Image file is required' });
  const s3 = getR2Client();
  if (!s3) return res.status(500).json({ message: 'Storage not configured' });
  const ext = req.file.originalname.toLowerCase().split('.').pop();
  const key = `quiz-images/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  await s3.send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: req.file.buffer,
    ContentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  }));
  res.status(201).json({ key, size: req.file.size });
}));

router.delete('/admin/images', requireAdmin, catchAsync(async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ message: 'Key is required' });
  const s3 = getR2Client();
  if (!s3) return res.status(500).json({ message: 'Storage not configured' });
  if (key.startsWith('quiz-images/')) {
    await Quiz.updateMany(
      { 'question.questionImage': key },
      { $set: { 'question.questionImage': null } }
    );
  } else if (key.startsWith('voice-exam-images/')) {
    await VoiceExam.updateMany(
      { images: key },
      { $pull: { images: key } }
    );
  }
  await s3.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
  res.json({ message: 'Image deleted' });
}));

export default router;
