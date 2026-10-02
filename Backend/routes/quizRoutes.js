import express from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import {
  listQuizzes, getQuiz, getCase, quizCounts, startQuiz,
  listAdminQuizzes, createQuiz, editQuiz, deleteQuiz,
  createCaseQuizzes, serveQuizImage,
} from '../controllers/quizController.js';
import { bulkPublish, bulkUnpublish, bulkDelete, importQuizzesCsv } from '../controllers/quizBulkController.js';

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (ext === 'csv' && (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel')) cb(null, true);
    else cb(new Error('Only CSV files are allowed'));
  },
});

const allowedMime = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const quizImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = '.' + file.originalname.toLowerCase().split('.').pop();
    if (allowed.includes(ext) && allowedMime.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed (png, jpg, jpeg, gif, webp)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = express.Router();

const JSON_BODY_FIELDS = ['options', 'correctAnswers', 'optionExplanations', 'keyConcepts', 'commonTraps', 'tags'];

const parseJsonBodyFields = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const field of JSON_BODY_FIELDS) {
      const value = req.body[field];
      if (typeof value === 'string') {
        try { req.body[field] = JSON.parse(value); } catch { /* leave as-is; validator will reject */ }
      }
    }
    if (typeof req.body.published === 'string') req.body.published = req.body.published === 'true';
  }
  next();
};

const handleQuizUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File too large (max 10MB)' });
    return res.status(400).json({ message: err.message });
  }
  if (err && typeof err.message === 'string' && err.message.startsWith('Only image files')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

router.get('/quiz-counts', quizCounts);
router.get('/quizzes', listQuizzes);
router.get('/quizzes/:id', [param('id').isMongoId()], validate, getQuiz);
router.get('/cases/:id', [param('id').isMongoId()], validate, getCase);
router.post('/quizzes/:id/start', [param('id').isMongoId(), body('timer').optional().isInt({ min: 0 })], validate, startQuiz);

router.get('/admin/quizzes', requireAdmin, listAdminQuizzes);
router.post('/quizzes', requireAdmin, quizImageUpload.single('questionImage'), handleQuizUploadError, parseJsonBodyFields, [
  body('moduleId').isMongoId(),
  body('questionText').trim().notEmpty(),
  body('options').isArray({ min: 2 }),
  body('correctAnswers').isArray({ min: 1 }),
  body('course').optional().trim(),
  body('published').optional().isBoolean(),
  body('explanation').optional().trim(),
  body('optionExplanations').optional().isArray(),
  body('optionExplanations.*.letter').optional().isIn(['A','B','C','D','E']),
  body('optionExplanations.*.whyTrue').optional().trim(),
  body('optionExplanations.*.whyFalse').optional().trim(),
  body('keyConcepts').optional().isArray(),
  body('keyConcepts.*').optional().trim(),
  body('commonTraps').optional().isArray(),
  body('commonTraps.*').optional().trim(),
  body('timer').optional().isInt({ min: 0 }),
], validate, createQuiz);
router.put('/quizzes/:id', requireAdmin, quizImageUpload.single('questionImage'), handleQuizUploadError, parseJsonBodyFields, [
  param('id').isMongoId(),
  body('moduleId').optional().isMongoId(),
  body('questionText').optional().trim().notEmpty(),
  body('options').optional().isArray({ min: 2 }),
  body('correctAnswers').optional().isArray({ min: 1 }),
  body('course').optional().trim(),
  body('published').optional().isBoolean(),
  body('explanation').optional().trim(),
  body('optionExplanations').optional().isArray(),
  body('optionExplanations.*.letter').optional().isIn(['A','B','C','D','E']),
  body('optionExplanations.*.whyTrue').optional().trim(),
  body('optionExplanations.*.whyFalse').optional().trim(),
  body('keyConcepts').optional().isArray(),
  body('keyConcepts.*').optional().trim(),
  body('commonTraps').optional().isArray(),
  body('commonTraps.*').optional().trim(),
  body('timer').optional().isInt({ min: 0 }),
], validate, editQuiz);
router.delete('/quizzes/:id', requireAdmin, [param('id').isMongoId()], validate, deleteQuiz);
router.post('/admin/cases/quizzes', requireAdmin, createCaseQuizzes);

router.post('/quizzes/bulk/publish', requireAdmin, [body('ids').isArray({ min: 1 }), body('ids.*').isMongoId()], validate, bulkPublish);
router.post('/quizzes/bulk/unpublish', requireAdmin, [body('ids').isArray({ min: 1 }), body('ids.*').isMongoId()], validate, bulkUnpublish);
router.post('/quizzes/bulk/delete', requireAdmin, [body('ids').isArray({ min: 1 }), body('ids.*').isMongoId()], validate, bulkDelete);
router.post('/quizzes/import-csv', requireAdmin, csvUpload.single('file'), importQuizzesCsv);

router.get('/quiz-images/*', verifyToken, serveQuizImage);

export default router;
