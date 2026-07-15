import express from 'express';
import { body } from 'express-validator';
import Quiz from '../models/quizModel.js';
import DailyActivity from '../models/dailyActivityModel.js';
import AppConfig from '../models/appConfigModel.js';
import User from '../models/userModel.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { checkSubscription } from '../middleware/requireSubscription.js';
import { shuffle } from '../utils/shuffle.js';

const router = express.Router();

function startOfDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Get today's daily quizzes ──────────────────────────────────────────────
router.get('/quizzes/daily', verifyToken, catchAsync(async (req, res) => {
  const today = startOfDay();
  const existing = await DailyActivity.findOne({ userId: req.user.id, date: today });
  if (existing) {
    return res.json({ completed: true, results: existing });
  }

  const user = await User.findById(req.user.id).select('discipline year');
  if (!user || !user.discipline || !user.year) {
    return res.json({ completed: false, quizzes: [], message: 'Set your discipline and year in your profile.' });
  }

  if (!await checkSubscription(req.user.id)) {
    return res.json({ completed: false, quizzes: [], message: 'Subscription required' });
  }

  const config = await AppConfig.findOne({ key: 'dailyQuizCount' });
  const count = (config && config.value) || 5;

  const filter = {
    published: true,
    discipline: user.discipline,
  };
  if (user.year === 7 && user.discipline === 'medicine') {
    // résidanat: include all years
  } else {
    filter.year = user.year;
  }

  // Exclude quizzes used in past 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentActivities = await DailyActivity.find({
    userId: req.user.id,
    date: { $gte: weekAgo.toISOString().slice(0, 10) },
  }).select('quizIds');
  const excludeIds = new Set();
  recentActivities.forEach((a) => a.quizIds.forEach((id) => excludeIds.add(id.toString())));

  let quizzes = await Quiz.find({ ...filter, _id: { $nin: [...excludeIds] } }).select('-question.correctAnswers');
  if (quizzes.length < count) {
    // Fall back to include recently used quizzes if pool is small
    quizzes = await Quiz.find(filter).select('-question.correctAnswers');
  }

  const selected = shuffle(quizzes).slice(0, Math.min(count, quizzes.length));

  return res.json({ completed: false, quizzes: selected });
}));

// ── Submit daily quiz answers ──────────────────────────────────────────────
router.post('/quizzes/daily/submit', verifyToken, [
  body('answers').isArray({ min: 1 }),
  body('answers.*.quizId').isMongoId(),
  body('answers.*.selectedAnswers').isArray({ min: 1 }),
], validate, catchAsync(async (req, res) => {
  const today = startOfDay();

  const quizIds = req.body.answers.map((a) => a.quizId);
  const quizzes = await Quiz.find({ _id: { $in: quizIds } }).select('question');

  const quizMap = {};
  quizzes.forEach((q) => { quizMap[q._id.toString()] = q; });

  const results = [];
  let score = 0;

  for (const ans of req.body.answers) {
    const quiz = quizMap[ans.quizId];
    if (!quiz) continue;

    const correctAnswers = quiz.question?.correctAnswers || [];
    const correct = JSON.stringify([...ans.selectedAnswers].sort()) === JSON.stringify([...correctAnswers].sort());

    results.push({
      quizId: ans.quizId,
      questionText: quiz.question?.questionText || '',
      selectedAnswers: ans.selectedAnswers,
      correctAnswers,
      correct,
    });

    if (correct) score++;
  }

  const daily = await DailyActivity.findOneAndUpdate(
    { userId: req.user.id, date: today },
    {
      $setOnInsert: {
        userId: req.user.id,
        date: today,
        quizIds,
        answers: results,
        score,
        total: results.length,
      },
    },
    { upsert: true, new: true, rawResult: true }
  );

  if (daily.lastErrorObject?.updatedExisting) {
    return res.status(400).json({ message: 'Already completed today\'s quiz' });
  }

  return res.json({ completed: true, results: daily.value });
}));

// ── Admin: get daily config ────────────────────────────────────────────────
router.get('/admin/daily-config', verifyToken, requireAdmin, catchAsync(async (req, res) => {
  const config = await AppConfig.findOne({ key: 'dailyQuizCount' });
  res.json({ key: 'dailyQuizCount', value: (config && config.value) || 5 });
}));

// ── Admin: update daily config ─────────────────────────────────────────────
router.put('/admin/daily-config', verifyToken, requireAdmin, [
  body('value').isInt({ min: 1, max: 50 }),
], validate, catchAsync(async (req, res) => {
  await AppConfig.findOneAndUpdate(
    { key: 'dailyQuizCount' },
    { value: req.body.value },
    { upsert: true, new: true },
  );
  res.json({ message: 'Daily quiz count updated', value: req.body.value });
}));

export default router;
