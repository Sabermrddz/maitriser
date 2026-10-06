import mongoose from 'mongoose';
import express from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import VoiceExam from '../models/voiceExamModel.js';
import VoiceExamResult from '../models/voiceExamResultModel.js';
import Module from '../models/moduleModel.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { cacheMiddleware, delPattern } from '../utils/cache.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import { validate } from '../middleware/validate.js';
import { genExamId } from '../utils/idGenerator.js';
import { checkSubscription } from '../middleware/requireSubscription.js';
import logger from '../utils/logger.js';
import { getR2Client, getBucket } from '../config/r2.js';
import { streamStorageObject } from '../utils/streamObject.js';
import { cleanAndValidateQuestions } from '../utils/validateCriteria.js';
import { matchCriterion } from '../utils/textMatch.js';
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

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File too large (max 10MB)' });
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

const uploadImagesToR2 = async (files) => {
  const s3 = getR2Client();
  if (!files || files.length === 0) return [];
  if (!s3) {
    const err = new Error('Storage not configured');
    err.status = 500;
    throw err;
  }
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
    logger.info({ key, bytes: file.buffer.length }, 'Voice exam image uploaded to storage');
    keys.push(key);
  }
  return keys;
};

// ── Admin: list all voice exams (no student gates: no subscription,
// discipline or year enforcement) ──────────────────────────────────────────
router.get('/admin/voice-exams', verifyToken, requireAdmin, catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.year) filter.year = Number(req.query.year);
  if (req.query.moduleId && mongoose.Types.ObjectId.isValid(String(req.query.moduleId))) filter.moduleId = String(req.query.moduleId);
  if (req.query.course) filter.course = String(req.query.course);
  const exams = await VoiceExam.find(filter).populate('moduleId', 'name year').sort({ createdAt: -1 });
  res.json(exams);
}));

router.get('/voice-exams', verifyToken, cacheMiddleware(), catchAsync(async (req, res) => {
  if (!req.query.year && !req.query.moduleId) return res.json([]);
  if (!await checkSubscription(req.user?.id)) return res.json([]);

  const user = await User.findById(req.user.id || req.user._id).select('discipline').lean();
  const allowedDisciplines = ['medicine'];
  const allowedYears = ['4','5','6','7'];
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

router.post('/voice-exams', requireAdmin, upload.array('images', 10), handleMulterError, catchAsync(async (req, res) => {
  let { title, moduleId, course, clinicalCasePrompt, questions } = req.body;
  if (!title || !moduleId || !clinicalCasePrompt)
    return res.status(400).json({ message: 'title, moduleId, and clinicalCasePrompt are required' });

  if (typeof questions === 'string') {
    try { questions = JSON.parse(questions); } catch { return res.status(400).json({ message: 'Invalid questions JSON' }); }
  }
  if (!Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ message: 'At least one question is required' });
  if (questions.length > 50)
    return res.status(400).json({ message: 'Maximum 50 questions per exam' });
  for (const [i, q] of questions.entries()) {
    if (!q || typeof q !== 'object' || !q.questionText)
      return res.status(400).json({ message: `Question ${i + 1} is missing questionText` });
  }
  const checked = cleanAndValidateQuestions(questions);
  if (checked.errors.length > 0)
    return res.status(400).json({ message: checked.errors[0], errors: checked.errors });
  questions = checked.questions;

  const module = await Module.findById(moduleId);
  if (!module) return res.status(404).json({ message: 'Module not found' });

  if (req.files?.length && !getR2Client())
    return res.status(500).json({ message: 'Storage not configured' });
  const images = req.files?.length
    ? await uploadImagesToR2(req.files)
    : [];

  const examId = await genExamId();
  const exam = await VoiceExam.create({
    examId, title, moduleId, course: course || '', year: module.year, discipline: 'medicine', clinicalCasePrompt, questions, images,
  });
  delPattern('GET:/api/voice-exams');
  res.status(201).json({ message: 'Voice exam created successfully', exam });
}));

const csvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ext = '.' + file.originalname.toLowerCase().split('.').pop();
    if (ext === '.csv' && file.mimetype === 'text/csv') cb(null, true);
    else if (ext === '.csv') cb(null, true);
    else cb(new Error('Only CSV files are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/voice-exams/import-csv', requireAdmin, csvUpload.single('file'), handleMulterError, catchAsync(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file is required' });

  const { parse } = await import('csv-parse/sync');
  const content = req.file.buffer.toString('utf8');
  const rawRecords = parse(content, { columns: true, skip_empty_lines: true, bom: true });

  if (rawRecords.length === 0) return res.status(400).json({ message: 'CSV is empty' });

  // Headers are case-insensitive ("ExamTitle" works like "examTitle").
  const records = rawRecords.map((r) => {
    const o = {};
    for (const [k, v] of Object.entries(r)) o[k.trim().toLowerCase()] = v;
    return o;
  });

  const requiredCols = ['examtitle', 'questiontext'];
  const missing = requiredCols.filter((c) => !(c in records[0]));
  if (missing.length > 0) return res.status(400).json({ message: `Missing required columns: ${missing.join(', ')}` });

  const results = { created: 0, questionsImported: 0, skipped: [], errors: [] };

  const moduleKeys = [...new Set(records.map((r) => {
    const name = r.modulename?.trim() || '';
    const year = Number(r.year) || 0;
    return `${name}|${year}`;
  }).filter((k) => k !== '|0'))];

  const modules = await Module.find({ $or: moduleKeys.map((k) => {
    const [name, year] = k.split('|');
    return { name, year: Number(year) };
  }) });
  const moduleMap = {};
  modules.forEach((m) => { moduleMap[`${m.name}|${m.year}`] = m; });

  const examsByName = {};
  const csvViolations = [];
  for (const row of records) {
    try {
      const examTitle = row.examtitle?.trim();
      const questionText = row.questiontext?.trim();
      if (!examTitle) { results.errors.push(`Row ${results.errors.length + results.questionsImported + 1}: missing examTitle`); continue; }
      if (!questionText) { results.errors.push(`Row "${examTitle}": missing questionText`); continue; }

      const moduleName = row.modulename?.trim() || '';
      const year = Number(row.year) || 0;
      const moduleKey = `${moduleName}|${year}`;
      const module = moduleMap[moduleKey];

      let criteria = [];
      if (row.criteria?.trim()) {
        const groups = row.criteria.split(';');
        for (const group of groups) {
          const trimmed = group.trim();
          if (!trimmed) continue;
          const colonIdx = trimmed.indexOf(':');
          if (colonIdx > 0) {
            const label = trimmed.slice(0, colonIdx).trim();
            const kws = trimmed.slice(colonIdx + 1).split('|').map((k) => k.trim()).filter(Boolean);
            if (label && kws.length === 0) {
              csvViolations.push(`Row "${examTitle}": criterion "${label}" needs at least one keyword`);
              continue;
            }
            if (label) criteria.push({ label, keywords: kws });
          } else {
            csvViolations.push(`Row "${examTitle}": criterion "${trimmed}" needs a label and at least one keyword (format Label: kw1|kw2)`);
          }
        }
      }

      const question = { questionText, idealAnswer: row.idealanswer?.trim() || '', criteria };

      if (!examsByName[examTitle]) {
        examsByName[examTitle] = {
          title: examTitle,
          moduleId: module?._id || null,
          year: module?.year || year,
          course: row.course?.trim() || '',
          clinicalCasePrompt: row.clinicalcaseprompt?.trim() || '',
          questions: [],
        };
      }
      examsByName[examTitle].questions.push(question);
      results.questionsImported++;
    } catch (e) {
      results.errors.push(`Row import error: ${e.message}`);
    }
  }

  // Mandatory keywords: fail the whole file up front (nothing written) so the
  // admin fixes every offending label in one round instead of discovering
  // unwinnable criteria later.
  if (csvViolations.length > 0) {
    return res.status(400).json({
      message: `CSV rejected: ${csvViolations.length} ${csvViolations.length > 1 ? 'criteria' : 'criterion'} without keywords. Each criterion needs the format "Label: keyword1|keyword2".`,
      errors: csvViolations,
    });
  }

  for (const [title, data] of Object.entries(examsByName)) {
    try {
      if (!data.moduleId) {
        results.skipped.push(`${title} (module not found)`);
        continue;
      }
      if (!data.clinicalCasePrompt) {
        data.clinicalCasePrompt = data.questions.map((q) => q.questionText).join('\n\n');
      }
      const examId = await genExamId();
      await VoiceExam.create({
        examId,
        title: data.title,
        moduleId: data.moduleId,
        course: data.course,
        year: data.year,
        discipline: 'medicine',
        clinicalCasePrompt: data.clinicalCasePrompt,
        questions: data.questions,
        images: [],
      });
      results.created++;
    } catch (e) {
      results.errors.push(`Exam "${title}": ${e.message}`);
    }
  }

  delPattern('GET:/api/voice-exams');
  res.status(201).json({
    message: `Import complete: ${results.created} exams, ${results.questionsImported} questions, ${results.errors.length} errors`,
    ...results,
  });
}));

router.put('/voice-exams/:id', requireAdmin, upload.array('images', 10), handleMulterError, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  let { title, moduleId, course, clinicalCasePrompt, questions, existingImages } = req.body;
  let year;
  if (moduleId) {
    const module = await Module.findById(moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    year = module.year;
  }

  if (typeof questions === 'string') {
    try { questions = JSON.parse(questions); } catch { return res.status(400).json({ message: 'Invalid questions JSON' }); }
  }
  if (questions) {
    const checked = cleanAndValidateQuestions(questions);
    if (checked.errors.length > 0)
      return res.status(400).json({ message: checked.errors[0], errors: checked.errors });
    questions = checked.questions;
  }

  let images = existingImages
    ? (Array.isArray(existingImages) ? existingImages : (() => { try { return JSON.parse(existingImages); } catch { return []; } })())
    : [];
  if (req.files && req.files.length > 0) {
    if (!getR2Client()) return res.status(500).json({ message: 'Storage not configured' });
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

router.get('/voice-exam-images/*', verifyToken, catchAsync(async (req, res) => {
  const raw = req.params?.[0] ?? req.params?.filename ?? '';
  await streamStorageObject(res, `voice-exam-images/${path.basename(String(raw))}`, 'image/png');
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
  let criteriaPassed = 0;
  let criteriaTotal = 0;

  for (const ans of answers) {
    const question = exam.questions[ans.questionIndex];
    if (!question) return res.status(400).json({ message: `Question index ${ans.questionIndex} not found` });

    // One matching keyword validates the criterion (synonyms/abbreviations
    // are alternative surface forms, not cumulative requirements).
    const criteriaResults = question.criteria.map((c) => {
      const matched = matchCriterion(ans.text || '', c.keywords);
      return { label: c.label, passed: matched !== null, matchedKeyword: matched };
    });

    const passedCount = criteriaResults.filter((cr) => cr.passed).length;
    const qTotal = criteriaResults.length;
    criteriaPassed += passedCount;
    criteriaTotal += qTotal;
    const allPassed = criteriaResults.every((cr) => cr.passed);
    if (allPassed) overallPassed++;
    overallTotal++;

    resultAnswers.push({
      questionIndex: ans.questionIndex,
      text: ans.text || '',
      criteriaResults,
      allPassed,
      passedCount,
      criteriaTotal: qTotal,
    });
  }

  const result = await VoiceExamResult.create({
    userId: req.user.userId || req.user.id || req.user._id,
    examId: exam._id,
    answers: resultAnswers,
    overallPassed,
    overallTotal,
    overallMax: exam.questions.length,
    criteriaPassed,
    criteriaTotal,
  });

  res.status(201).json({
    resultId: result._id,
    answers: resultAnswers,
    overallPassed,
    overallTotal,
    overallMax: exam.questions.length,
    criteriaPassed,
    criteriaTotal,
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
