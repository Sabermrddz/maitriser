import express from 'express';
import { body, param } from 'express-validator';
import { addContactMessage, getAllContactMessages } from '../controllers/contactController.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';

const router = express.Router();

// Route to submit a contact message
router.post('/submit', [
  body('name').isString().isLength({ min: 2, max: 100 }),
  body('email').isEmail(),
  body('message').isString().isLength({ min: 10, max: 5000 }),
], validate, addContactMessage);

// Route to get all contact messages (admin only, paginated)
router.get('/all', verifyToken, requireAdmin, (req, res, next) => {
  const { skip, limit, page } = getPagination(req.query);
  req.pagination = { skip, limit, page };
  next();
}, getAllContactMessages);

export default router;
