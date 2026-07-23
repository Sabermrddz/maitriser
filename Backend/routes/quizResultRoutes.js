import express from 'express';
import { body, param } from 'express-validator';
import Quiz from '../models/quizModel.js';
import QuizAttempt from '../models/quizAttemptModel.js';
import QuizResult from '../models/quizResultModel.js';
import logger from '../utils/logger.js';
import { broadcast } from '../ws.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import { validate } from '../middleware/validate.js';
import { verifyToken } from '../controllers/authController.js';
import { checkSubscription } from '../middleware/requireSubscription.js';

const router = express.Router();

// POST /api/quizzes/:quizId/submit
// Body: { selectedAnswers: [] }
router.post('/quizzes/:quizId/submit', [
  param('quizId').isMongoId(),
  body('selectedAnswers').isArray({ min: 1 }),
], validate, catchAsync(async (req, res) => {
  const { quizId } = req.params;
  const { selectedAnswers } = req.body;
  const userId = req.user?.userId;

  if (!userId) return res.status(400).json({ message: 'userId is required' });

  if (!await checkSubscription(req.user?.id)) return res.status(403).json({ message: 'Subscription required' });

  const quiz = await Quiz.findById(quizId);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
  if (!quiz.published) return res.status(404).json({ message: 'Quiz not found' });

  const attempt = await QuizAttempt.findOne({ userId: req.user.id, quizId: quiz._id });
  if (!attempt) return res.status(410).json({ message: 'Quiz session not started. Please go back and start the quiz.' });
  if (attempt.expiresAt < new Date()) return res.status(410).json({ message: 'Quiz session expired. Please go back and start again.' });

  const correct = quiz.question?.correctAnswers || [];

  const isCorrect =
    Array.isArray(selectedAnswers) &&
    selectedAnswers.length === correct.length &&
    selectedAnswers.every((a) => correct.includes(a)) &&
    correct.every((c) => selectedAnswers.includes(c));

  const score = isCorrect ? 1 : 0;

  await QuizResult.create({
    userId,
    quizId,
    score,
    answers: { [quizId]: selectedAnswers },
  });

  logger.info({ userId, quizId, correct: isCorrect, score }, 'Quiz submitted');
  broadcast('quiz:submitted', { userId, quizId, correct: isCorrect, score });

  return res.status(200).json({
    correct: isCorrect,
    score,
    correctAnswers: correct,
    selectedAnswers,
    explanation: quiz.explanation || '',
  });
}));

// GET /api/results/:userId — fetch attempt history
router.get('/results/:userId', verifyToken, catchAsync(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.userId !== req.params.userId)
    return res.status(403).json({ message: 'Access denied' });

  const { userId } = req.params;
  if (!userId || typeof userId !== 'string')
    return res.status(400).json({ message: 'Invalid userId parameter' });

  const { skip, limit, page } = getPagination(req.query);
  const [results, total] = await Promise.all([
    QuizResult.find({ userId })
      .populate({ path: 'quizId', select: 'question.questionText quizId explanation year course moduleId', populate: { path: 'moduleId', select: 'name year' } })
      .sort({ timestamp: -1 }).skip(skip).limit(limit),
    QuizResult.countDocuments({ userId }),
  ]);
  return res.json(paginatedResponse(results, total, page, limit));
}));

export default router;
