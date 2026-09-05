import path from 'path';
import mongoose from 'mongoose';
import Quiz from '../models/quizModel.js';
import QuizAttempt from '../models/quizAttemptModel.js';
import Module from '../models/moduleModel.js';
import Case from '../models/caseModel.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { checkSubscription } from '../middleware/requireSubscription.js';
import { genQuizId } from '../utils/idGenerator.js';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getBucket, getPresignedExpiry } from '../config/r2.js';
import logger from '../utils/logger.js';

const stripAnswers = (quiz) => {
  const obj = quiz.toObject ? quiz.toObject() : { ...quiz };
  if (obj.question) {
    const { correctAnswers, ...safeQuestion } = obj.question;
    obj.question = safeQuestion;
  }
  return obj;
};

export const listQuizzes = catchAsync(async (req, res) => {
  if (!req.query.discipline || !req.query.year) return res.json(paginatedResponse([], 0, 1, 1));
  if (!await checkSubscription(req.user?.id)) return res.json(paginatedResponse([], 0, 1, 1));
  const filter = { published: true, discipline: String(req.query.discipline) };
  const isResidanat = Number(req.query.year) === 7 && req.query.discipline === 'medicine';
  if (!isResidanat) filter.year = Number(req.query.year);
  const rawModuleId = req.query.moduleId ? (Array.isArray(req.query.moduleId) ? String(req.query.moduleId[0]) : String(req.query.moduleId)) : '';
  if (rawModuleId && mongoose.Types.ObjectId.isValid(rawModuleId)) filter.moduleId = rawModuleId;
  if (req.query.course) filter.course = String(req.query.course);
  if (req.query.search) filter.$or = [
    { quizId: { $regex: escapeRegex(req.query.search), $options: 'i' } },
    { 'question.questionText': { $regex: escapeRegex(req.query.search), $options: 'i' } },
  ];
  const { skip, limit, page } = getPagination(req.query);
  const [quizzes, total] = await Promise.all([
    Quiz.find(filter).populate('moduleId', 'name year').populate('caseId', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Quiz.countDocuments(filter),
  ]);
  return res.json(paginatedResponse(quizzes.map(stripAnswers), total, page, limit));
});

export const getQuiz = catchAsync(async (req, res) => {
  if (!await checkSubscription(req.user?.id)) return res.status(403).json({ message: 'Subscription required' });
  const quiz = await Quiz.findById(req.params.id).populate('moduleId').populate('caseId');
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
  if (!quiz.published) return res.status(404).json({ message: 'Quiz not found' });
  return res.json(stripAnswers(quiz));
});

export const getCase = catchAsync(async (req, res) => {
  if (!await checkSubscription(req.user?.id)) return res.status(403).json({ message: 'Subscription required' });
  const c = await Case.findById(req.params.id);
  if (!c) return res.status(404).json({ message: 'Case not found' });
  const quizzes = await Quiz.find({ caseId: c._id }).populate('moduleId', 'name year');
  return res.json({ case: c, quizzes: quizzes.map(stripAnswers) });
});

export const listAdminQuizzes = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.discipline) filter.discipline = String(req.query.discipline);
  if (req.query.year) filter.year = Number(req.query.year);
  const rawModuleId = req.query.moduleId ? (Array.isArray(req.query.moduleId) ? String(req.query.moduleId[0]) : String(req.query.moduleId)) : '';
  if (rawModuleId && mongoose.Types.ObjectId.isValid(rawModuleId)) filter.moduleId = rawModuleId;
  if (req.query.search) filter.$or = [
    { quizId: { $regex: escapeRegex(req.query.search), $options: 'i' } },
    { 'question.questionText': { $regex: escapeRegex(req.query.search), $options: 'i' } },
  ];
  const { skip, limit, page } = getPagination(req.query);
  const [quizzes, total] = await Promise.all([
    Quiz.find(filter).populate('moduleId', 'name year').populate('caseId', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Quiz.countDocuments(filter),
  ]);
  return res.json(paginatedResponse(quizzes, total, page, limit));
});

const uploadImageToR2 = async (buffer, originalname) => {
  const s3 = getR2Client();
  if (!s3) return null;
  const ext = originalname.toLowerCase().split('.').pop();
  const key = `quiz-images/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  await s3.send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: buffer,
    ContentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  }));
  return key;
};

export const createQuiz = catchAsync(async (req, res) => {
  const { moduleId, questionText, options, correctAnswers, course, published, explanation, timer, optionExplanations, keyConcepts, commonTraps, tags } = req.body;
  if (!moduleId || !questionText || !options?.length || !correctAnswers?.length)
    return res.status(400).json({ message: 'All fields are required' });

  const module = await Module.findById(moduleId);
  if (!module) return res.status(404).json({ message: 'Module not found' });

  const quizId = await genQuizId();
  let questionImage = null;
  if (req.file) {
    questionImage = await uploadImageToR2(req.file.buffer, req.file.originalname);
  }
  const quiz = await Quiz.create({
    quizId, moduleId, year: module.year, discipline: module.discipline, course, published, explanation, timer,
    optionExplanations: optionExplanations || [], keyConcepts: keyConcepts || [], commonTraps: commonTraps || [], tags: tags || [],
    question: { questionText, questionImage, options, correctAnswers },
  });
  return res.status(201).json({ message: 'Quiz created successfully', quiz });
});

export const editQuiz = catchAsync(async (req, res) => {
  const { moduleId, questionText, options, correctAnswers, course, published, explanation, timer, optionExplanations, keyConcepts, commonTraps, tags } = req.body;
  let year, discipline;
  if (moduleId) {
    const module = await Module.findById(moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    year = module.year;
    discipline = module.discipline;
  }

  const updates = {
    ...(moduleId && { moduleId }),
    ...(year && { year }),
    ...(discipline && { discipline }),
    ...(course !== undefined && { course }),
    ...(published !== undefined && { published }),
    ...(explanation !== undefined && { explanation }),
    ...(timer !== undefined && { timer }),
    ...(optionExplanations !== undefined && { optionExplanations }),
    ...(keyConcepts !== undefined && { keyConcepts }),
    ...(commonTraps !== undefined && { commonTraps }),
    ...(tags !== undefined && { tags }),
    ...(questionText && { 'question.questionText': questionText }),
    ...(options && { 'question.options': options }),
    ...(correctAnswers && { 'question.correctAnswers': correctAnswers }),
  };

  if (req.file) {
    const key = await uploadImageToR2(req.file.buffer, req.file.originalname);
    if (key) updates['question.questionImage'] = key;
  } else if (req.body.removeImage === 'true') {
    updates['question.questionImage'] = null;
  }

  const updated = await Quiz.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ message: 'Quiz not found' });
  return res.json({ message: 'Quiz updated successfully', quiz: updated });
});

export const deleteQuiz = catchAsync(async (req, res) => {
  const quiz = await Quiz.findByIdAndDelete(req.params.id);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
  if (quiz.question?.questionImage) {
    const s3 = getR2Client();
    if (s3) {
      try { await s3.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: quiz.question.questionImage })); }
      catch { logger.warn('Failed to delete quiz image from R2'); }
    }
  }
  return res.json({ message: 'Quiz deleted successfully' });
});

export const createCaseQuizzes = catchAsync(async (req, res) => {
  const { title, description, moduleId, discipline, course, quizzes } = req.body;
  if (!title || !description || !moduleId || !quizzes?.length)
    return res.status(400).json({ message: 'title, description, moduleId, and quizzes are required' });
  if (quizzes.length > 50)
    return res.status(400).json({ message: 'Maximum 50 quizzes per case' });

  const module = await Module.findById(moduleId);
  if (!module) return res.status(404).json({ message: 'Module not found' });

  const caseDoc = await Case.create({ title, description, moduleId: module._id, year: module.year, discipline: discipline || module.discipline, course: course || '' });

  const created = [];
  for (let i = 0; i < quizzes.length; i++) {
    const q = quizzes[i];
    if (!q.questionText || !q.options?.length || !q.correctIndices?.length)
      return res.status(400).json({ message: `Quiz ${i + 1}: questionText, options, and correctIndices are required` });

    const correctAnswers = q.correctIndices.map((idx) => q.options[idx]);
    if (correctAnswers.some((a) => a === undefined))
      return res.status(400).json({ message: `Quiz ${i + 1}: correctIndices out of range` });

    const quizId = await genQuizId();
    const quiz = await Quiz.create({
      quizId,
      quizName: `${title} — Q${i + 1}`,
      moduleId: module._id,
      year: module.year,
      discipline: discipline || module.discipline,
      course: course || q.course || '',
      caseId: caseDoc._id,
      published: req.body.published !== undefined ? req.body.published : true,
      explanation: q.explanation || '',
      question: { questionText: q.questionText, options: q.options, correctAnswers },
    });
    created.push(quiz);
  }

  return res.status(201).json({ message: `Case and ${created.length} quizzes created`, case: caseDoc, quizzes: created });
});

export const startQuiz = catchAsync(async (req, res) => {
  if (!await checkSubscription(req.user?.id)) return res.status(403).json({ message: 'Subscription required' });
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
  if (!quiz.published) return res.status(404).json({ message: 'Quiz not found' });

  const timer = Number(req.body.timer) || quiz.timer || 0;
  const expiresAt = timer > 0 ? new Date(Date.now() + timer * 1000) : new Date('9999-12-31T23:59:59Z');

  await QuizAttempt.findOneAndUpdate(
    { userId: req.user.id, quizId: quiz._id },
    { userId: req.user.id, quizId: quiz._id, startedAt: new Date(), expiresAt },
    { upsert: true, new: true }
  );

  return res.json({ expiresAt: expiresAt.toISOString(), timer });
});

export const quizCounts = catchAsync(async (req, res) => {
  if (!await checkSubscription(req.user?.id)) return res.status(403).json({ message: 'Subscription required' });
  const filter = { published: true };
  if (req.query.discipline) filter.discipline = String(req.query.discipline);
  const isResidanat = Number(req.query.year) === 7 && String(req.query.discipline) === 'medicine';
  if (!isResidanat && req.query.year) filter.year = Number(req.query.year);

  const counts = await Quiz.aggregate([
    { $match: filter },
    { $group: {
      _id: { moduleId: '$moduleId', course: '$course' },
      count: { $sum: 1 },
    }},
    { $group: {
      _id: '$_id.moduleId',
      courses: { $push: { course: '$_id.course', count: '$count' } },
      total: { $sum: '$count' },
    }},
    { $project: {
      _id: 0,
      moduleId: '$_id',
      total: 1,
      courses: 1,
    }},
  ]);

  const result = {};
  for (const entry of counts) {
    const courses = {};
    for (const c of entry.courses) {
      if (c.course) courses[c.course] = c.count;
    }
    result[entry.moduleId.toString()] = {
      total: entry.total,
      courses,
    };
  }
  res.json(result);
});

export const serveQuizImage = catchAsync(async (req, res) => {
  if (!await checkSubscription(req.user?.id)) return res.status(403).json({ message: 'Subscription required' });
  const s3 = getR2Client();
  if (!s3) return res.status(500).json({ message: 'Storage not configured' });
  const key = `quiz-images/${path.basename(req.params.filename)}`;
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: getBucket(), Key: key }), {
    expiresIn: getPresignedExpiry(),
  });
  res.redirect(url);
});
