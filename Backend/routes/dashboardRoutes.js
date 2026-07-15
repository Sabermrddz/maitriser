import express from 'express';
import User from '../models/userModel.js';
import Quiz from '../models/quizModel.js';
import QuizResult from '../models/quizResultModel.js';
import Module from '../models/moduleModel.js';
import VoiceExam from '../models/voiceExamModel.js';
import VoiceExamResult from '../models/voiceExamResultModel.js';
import Case from '../models/caseModel.js';
import Contact from '../models/contactModel.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';

const router = express.Router();

router.get('/dashboard-stats', verifyToken, requireAdmin, catchAsync(async (req, res) => {
  const stats = await Promise.all([
    User.countDocuments(),
    Quiz.countDocuments(),
    Module.countDocuments(),
    QuizResult.countDocuments(),
    VoiceExam.countDocuments(),
    VoiceExamResult.countDocuments(),
    Case.countDocuments(),
    Contact.countDocuments(),
    Quiz.countDocuments({ published: true }),
    QuizResult.countDocuments({ score: 1 }),
  ]);

  const [totalUsers, totalQuizzes, totalModules, totalAttempts, totalVoiceExams, totalVoiceResults, totalCases, totalContacts, publishedQuizzes, passed] = stats;
  const passRate = totalAttempts > 0 ? Number(((passed / totalAttempts) * 100).toFixed(1)) : 0;
  const draftQuizzes = totalQuizzes - publishedQuizzes;

  res.json({
    users: totalUsers, quizzes: totalQuizzes, modules: totalModules,
    attempts: totalAttempts, passRate,
    voiceExams: totalVoiceExams, voiceResults: totalVoiceResults,
    cases: totalCases, contacts: totalContacts,
    published: publishedQuizzes, drafts: draftQuizzes,
  });
}));

export default router;