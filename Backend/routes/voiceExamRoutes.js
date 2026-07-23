import mongoose from 'mongoose';
import express from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import VoiceExam from '../models/voiceExamModel.js';
import VoiceExamResult from '../models/voiceExamResultModel.js';
import Module from '../models/moduleModel.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { cacheMiddleware, delPattern } from '../utils/cache.js';
import logger from '../utils/logger.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import { validate } from '../middleware/validate.js';
import { genExamId } from '../utils/idGenerator.js';
import { checkSubscription } from '../middleware/requireSubscription.js';
import { getR2Client, getBucket, getPresignedExpiry } from '../config/r2.js';
import User from '../models/userModel.js';

const router = express.Router();

const allowedMime = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = '.' + file.originalname.toLowerCase().split('.').pop();
    if (allowed.includes(ext) && allowedMime.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed (png, jpg, jpeg, gif, webp)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadImagesToR2 = async (files) => {
  const s3 = getR2Client();
  if (!s3 || !files || files.length === 0) return [];
  const keys = [];
  for (const file of files) {
    const ext = file.originalname.toLowerCase().split('.').pop();
    const key = `voice-exam-images/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    await s3.send(new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: file.buffer,
      ContentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    }));
    keys.push(key);
  }
  return keys;
};

router.get('/voice-exams', verifyToken, cacheMiddleware(), catchAsync(async (req, res) => {
  if (!req.query.year) return res.json([]);
  if (!await checkSubscription(req.user?.id)) return res.json([]);

  const user = await User.findById(req.user.id || req.user._id).select('discipline').lean();
  const allowedDisciplines = ['medicine'];
  const allowedYears = ['5','6','7'];
  if (!allowedDisciplines.includes(user?.discipline) || !allowedYears.includes(req.query.year)) {
    return res.json([]);
  }

  const filter = { year: Number(req.query.year), discipline: 'medicine' };
  if (req.query.moduleId && mongoose.Types.ObjectId.isValid(String(req.query.moduleId))) filter.moduleId = String(req.query.moduleId);
  if (req.query.course) filter.course = String(req.query.course);
  const exams = await VoiceExam.find(filter).populate('moduleId', 'name year').sort({ createdAt: -1 });
  res.json(exams);
}));

router.get('/voice-exam-counts', verifyToken, cacheMiddleware(), catchAsync(async (req, res) => {
  const filter = { discipline: 'medicine' };
  if (req.query.year) filter.year = Number(req.query.year);
  const counts = await VoiceExam.aggregate([
    { $match: filter },
    { $group: { _id: '$moduleId', count: { $sum: 1 } } },
  ]);
  const result = {};
  for (const entry of counts) {
    if (entry._id) result[entry._id.toString()] = entry.count;
  }
  res.json(result);
}));

router.get('/voice-exams/:id', verifyToken, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  if (!await checkSubscription(req.user?.id)) return res.status(404).json({ message: 'Voice exam not found' });

  const user = await User.findById(req.user.id || req.user._id).select('discipline').lean();
  const allowedDisciplines = ['medicine'];
  if (!allowedDisciplines.includes(user?.discipline)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const exam = await VoiceExam.findById(req.params.id).populate('moduleId', 'name year');
  if (!exam) return res.status(404).json({ message: 'Voice exam not found' });
  res.json(exam);
}));

router.post('/voice-exams', requireAdmin, upload.array('images', 10), catchAsync(async (req, res) => {
  let { title, moduleId, course, clinicalCasePrompt, questions } = req.body;
  if (!title || !moduleId || !clinicalCasePrompt)
    return res.status(400).json({ message: 'title, moduleId, and clinicalCasePrompt are required' });

  if (typeof questions === 'string') questions = JSON.parse(questions);
  if (!Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ message: 'At least one question is required' });

  const module = await Module.findById(moduleId);
  if (!module) return res.status(404).json({ message: 'Module not found' });

  const images = await uploadImagesToR2(req.files);

  const examId = await genExamId();
  const exam = await VoiceExam.create({
    examId, title, moduleId, course: course || '', year: module.year, discipline: 'medicine', clinicalCasePrompt, questions, images,
  });
  delPattern('GET:/api/voice-exams');
  res.status(201).json({ message: 'Voice exam created successfully', exam });
}));

router.put('/voice-exams/:id', requireAdmin, upload.array('images', 10), [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  let { title, moduleId, course, clinicalCasePrompt, questions, existingImages } = req.body;
  let year;
  if (moduleId) {
    const module = await Module.findById(moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    year = module.year;
  }

  if (typeof questions === 'string') questions = JSON.parse(questions);

  let images = existingImages
    ? (Array.isArray(existingImages) ? existingImages : (() => { try { return JSON.parse(existingImages); } catch { return []; } })())
    : [];
  if (req.files && req.files.length > 0) {
    const newKeys = await uploadImagesToR2(req.files);
    images = [...images, ...newKeys];
  }

  const updateFields = {};
  if (title)              updateFields.title = title;
  if (moduleId)           updateFields.moduleId = moduleId;
  if (course !== undefined) updateFields.course = course;
  if (year)               updateFields.year = year;
  updateFields.discipline = 'medicine';
  if (clinicalCasePrompt) updateFields.clinicalCasePrompt = clinicalCasePrompt;
  if (questions)          updateFields.questions = questions;
  updateFields.images = images;

  const updated = await VoiceExam.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ message: 'Voice exam not found' });
  delPattern('GET:/api/voice-exams');
  res.json({ message: 'Voice exam updated successfully', exam: updated });
}));

router.delete('/voice-exams/:id', requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const exam = await VoiceExam.findByIdAndDelete(req.params.id);
  if (!exam) return res.status(404).json({ message: 'Voice exam not found' });

  const s3 = getR2Client();
  if (s3 && exam.images && exam.images.length > 0) {
    for (const img of exam.images) {
      try { await s3.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: img })); }
      catch { /* may not exist */ }
    }
  }

  delPattern('GET:/api/voice-exams');
  res.json({ message: 'Voice exam deleted successfully' });
}));

router.get('/voice-exam-images/:filename', catchAsync(async (req, res) => {
  const s3 = getR2Client();
  if (!s3) return res.status(500).json({ message: 'Storage not configured' });
  const key = `voice-exam-images/${path.basename(req.params.filename)}`;
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: getBucket(), Key: key }), {
    expiresIn: getPresignedExpiry(),
  });
  res.redirect(url);
}));

router.post('/voice-exams/:id/submit', verifyToken, [
  param('id').isMongoId(),
  body('answers').isArray({ min: 1 }).withMessage('answers array is required'),
  body('answers.*.questionIndex').isInt({ min: 0 }),
  body('answers.*.text').isString(),
], validate, catchAsync(async (req, res) => {
  const { answers } = req.body;

  const exam = await VoiceExam.findById(req.params.id);
  if (!exam) return res.status(404).json({ message: 'Voice exam not found' });

  const resultAnswers = [];
  let overallPassed = 0;
  let overallTotal = 0;

  for (const ans of answers) {
    const question = exam.questions[ans.questionIndex];
    if (!question) return res.status(400).json({ message: `Question index ${ans.questionIndex} not found` });

    const text = (ans.text || '').toLowerCase();
    const criteriaResults = question.criteria.map((c) => {
      const passed = c.keywords.some((kw) => text.includes(kw.toLowerCase()));
      return { label: c.label, passed };
    });

    const allPassed = criteriaResults.every((cr) => cr.passed);
    if (allPassed) overallPassed++;
    overallTotal++;

    resultAnswers.push({ questionIndex: ans.questionIndex, text: ans.text || '', criteriaResults, allPassed });
  }

  const result = await VoiceExamResult.create({
    userId: req.user.userId || req.user.id || req.user._id,
    examId: exam._id,
    answers: resultAnswers,
    overallPassed,
    overallTotal,
    overallMax: exam.questions.length,
  });

  res.status(201).json({
    resultId: result._id,
    answers: resultAnswers,
    overallPassed,
    overallTotal,
    overallMax: exam.questions.length,
  });
}));

router.get('/voice-exam-results/:userId', verifyToken, catchAsync(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.userId !== req.params.userId)
    return res.status(403).json({ message: 'Access denied' });
  const { skip, limit, page } = getPagination(req.query);
  const [results, total] = await Promise.all([
    VoiceExamResult.find({ userId: req.params.userId })
      .populate('examId', 'title')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    VoiceExamResult.countDocuments({ userId: req.params.userId }),
  ]);
  res.json(paginatedResponse(results, total, page, limit));
}));

router.get('/voice-exam-results/:userId/:resultId', verifyToken, catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.resultId))
    return res.status(400).json({ message: 'Invalid result ID' });
  const result = await VoiceExamResult.findById(req.params.resultId).populate('examId');
  if (!result) return res.status(404).json({ message: 'Result not found' });
  if (req.user.role !== 'admin' && result.userId !== req.params.userId)
    return res.status(403).json({ message: 'Access denied' });
  res.json(result);
}));

export default router;
