import express from 'express';
import { body, param } from 'express-validator';
import { submitFeedback, getAllFeedback, updateFeedbackStatus } from '../controllers/feedbackController.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';

const router = express.Router();

router.post('/', verifyToken, [
  body('message').isString().isLength({ min: 10 }),
  body('pageUrl').optional().isString(),
], validate, submitFeedback);

router.get('/all', verifyToken, requireAdmin, (req, res, next) => {
  const { skip, limit, page } = getPagination(req.query);
  req.pagination = { skip, limit, page };
  next();
}, getAllFeedback);

router.patch('/:id/status', verifyToken, requireAdmin, [
  param('id').isMongoId(),
  body('status').isIn(['read', 'resolved']),
], validate, updateFeedbackStatus);

export default router;
