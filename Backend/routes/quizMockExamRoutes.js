import mongoose from 'mongoose';
import express from 'express';
import { body, param } from 'express-validator';
import QuizMockExam from '../models/quizMockExamModel.js';
import QuizMockAttempt from '../models/quizMockAttemptModel.js';
import Quiz from '../models/quizModel.js';
import Module from '../models/moduleModel.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { checkSubscription } from '../middleware/requireSubscription.js';
import { validate } from '../middleware/validate.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { shuffle } from '../utils/shuffle.js';

const router = express.Router();

// ───── User endpoints ─────

router.get('/mock-exams', verifyToken, catchAsync(async (req, res) => {
  const filter = { published: true };
  if (req.query.moduleId && mongoose.Types.ObjectId.isValid(String(req.query.moduleId))) filter.moduleId = String(req.query.moduleId);
  const exams = await QuizMockExam.find(filter)
    .populate('moduleId', 'name')
    .select('title moduleId year duration quizIds createdAt')
    .sort({ createdAt: -1 })
    .lean();
  const result = exams.map((e) => ({
    _id: e._id, title: e.title, moduleId: e.moduleId, year: e.year,
    duration: e.duration, questionCount: e.quizIds?.length || 0, createdAt: e.createdAt,
  }));
  res.json(result);
}));

router.post('/mock-exams/:id/start', verifyToken, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const exam = await QuizMockExam.findById(req.params.id).populate('moduleId', 'name');
  if (!exam || !exam.published) return res.status(404).json({ message: 'Mock exam not found' });

  if (!await checkSubscription(req.user?.id)) return res.status(403).json({ message: 'Subscription required' });

  const quizIds = shuffle(exam.quizIds);

  const attempt = await QuizMockAttempt.create({
    userId: req.user.userId || req.user.id || req.user._id,
    mockExamId: exam._id,
    quizIds,
    status: 'in-progress',
    startedAt: new Date(),
  });

  const quizzes = await Quiz.find({ _id: { $in: quizIds } })
    .select('quizId question moduleId year')
    .lean();

  const quizMap = {};
  for (const q of quizzes) quizMap[q._id.toString()] = q;

  const questions = quizIds.map((id) => {
    const q = quizMap[id.toString()];
    if (!q) return null;
    return {
      _id: q._id, quizId: q.quizId,
      question: {
        questionText: q.question?.questionText,
        questionImage: q.question?.questionImage,
        options: q.question?.options || [],
      },
      moduleId: q.moduleId, year: q.year,
      _shuffledOptions: shuffle(q.question?.options || []),
    };
  }).filter(Boolean);

  res.json({ attemptId: attempt._id, title: exam.title, duration: exam.duration, questions });
}));

router.post('/mock-exams/:id/submit', verifyToken, [
  param('id').isMongoId(),
  body('attemptId').isMongoId(),
  body('answers').isArray({ min: 1 }),
], validate, catchAsync(async (req, res) => {
  const { attemptId, answers } = req.body;
  const attempt = await QuizMockAttempt.findById(attemptId);
  if (!attempt || attempt.status === 'completed') return res.status(400).json({ message: 'Invalid attempt' });

  const quizIds = answers.map((a) => a.quizId);
  const quizzes = await Quiz.find({ _id: { $in: quizIds } })
    .select('question.correctAnswers question.explanation')
    .lean();

  const quizMap = {};
  for (const q of quizzes) quizMap[q._id.toString()] = q;

  const resultAnswers = [];
  let totalScore = 0;
  const totalPossible = answers.length;

  for (const ans of answers) {
    const quiz = quizMap[ans.quizId];
    if (!quiz) continue;
    const correct = (quiz.question?.correctAnswers || []).slice().sort();
    const selected = (ans.selectedAnswers || []).slice().sort();
    const isCorrect = correct.length === selected.length && correct.every((v, i) => v === selected[i]);
    if (isCorrect) totalScore++;
    resultAnswers.push({
      quizId: ans.quizId,
      selectedAnswers: ans.selectedAnswers || [],
      correct: isCorrect,
      correctAnswers: correct,
      explanation: quiz.question?.explanation || '',
    });
  }

  const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
  attempt.answers = resultAnswers;
  attempt.totalScore = totalScore;
  attempt.totalPossible = totalPossible;
  attempt.percentage = percentage;
  attempt.status = 'completed';
  attempt.completedAt = new Date();
  await attempt.save();

  res.json({ attemptId: attempt._id, totalScore, totalPossible, percentage, results: resultAnswers });
}));

router.get('/mock-exam-results', verifyToken, catchAsync(async (req, res) => {
  const userId = req.user.userId || req.user.id || req.user._id;
  const results = await QuizMockAttempt.find({ userId, status: 'completed' })
    .populate('mockExamId', 'title')
    .select('mockExamId totalScore totalPossible percentage completedAt')
    .sort({ completedAt: -1 })
    .limit(50)
    .lean();
  res.json(results);
}));

// ───── Admin endpoints ─────

router.get('/admin/mock-exams', requireAdmin, catchAsync(async (req, res) => {
  const exams = await QuizMockExam.find()
    .populate('moduleId', 'name')
    .sort({ createdAt: -1 });
  res.json(exams);
}));

router.post('/admin/mock-exams', requireAdmin, [
  body('title').trim().notEmpty(),
  body('moduleId').isMongoId(),
  body('quizIds').isArray({ min: 1 }),
  body('duration').optional().isInt({ min: 1 }),
], validate, catchAsync(async (req, res) => {
  const { title, moduleId, quizIds, duration, published } = req.body;
  const mod = await Module.findById(moduleId);
  if (!mod) return res.status(404).json({ message: 'Module not found' });
  const exam = await QuizMockExam.create({
    title, moduleId, year: mod.year, discipline: mod.discipline || 'medicine',
    quizIds, duration: duration || 30, published: !!published,
    createdBy: req.user.id || req.user.userId,
  });
  res.status(201).json(exam);
}));

router.put('/admin/mock-exams/:id', requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const allowed = ['title', 'moduleId', 'quizIds', 'duration', 'published'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.moduleId) {
    const mod = await Module.findById(updates.moduleId);
    if (mod) updates.year = mod.year;
  }
  const exam = await QuizMockExam.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!exam) return res.status(404).json({ message: 'Not found' });
  res.json(exam);
}));

router.delete('/admin/mock-exams/:id', requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const exam = await QuizMockExam.findByIdAndDelete(req.params.id);
  if (!exam) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
}));

export default router;
