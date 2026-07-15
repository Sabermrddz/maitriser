import express from 'express';
import { body, param } from 'express-validator';
import crypto from 'crypto';
import User from '../models/userModel.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import logger from '../utils/logger.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { genUserId } from '../utils/idGenerator.js';

const router = express.Router();

const userCreate = async (req, res) => {
  const { name, email, role, discipline, year } = req.body;

  const tempPassword = crypto.randomBytes(12).toString('hex');

  const userId = await genUserId();
  const newUser = new User({ userId, name, email, password: tempPassword, role, discipline, year });

  try {
    await newUser.save();
    res.status(201).json({ message: 'User created successfully', tempPassword, userId });
  } catch (error) {
    logger.error({ err: error, userId }, 'Add user failed');
    if (error.code === 11000) return res.status(409).json({ message: 'userId or email already exists' });
    res.status(500).json({ message: 'Error creating user' });
  }
};

const userValidation = [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['user', 'admin']),
  body('discipline').optional().isIn(['medicine', 'pharmacy', '']),
  body('year').optional({ values: 'null' }).isInt({ min: 1, max: 6 }),
];

// Create a user — admin generates a random initial password and returns it once
router.post('/users', verifyToken, requireAdmin, userValidation, validate, userCreate);
router.post('/add-user', verifyToken, requireAdmin, userValidation, validate, userCreate);

// Get all users (password excluded)
router.get('/users', verifyToken, requireAdmin, catchAsync(async (req, res) => {
  const { skip, limit, page } = getPagination(req.query);
  const [users, total] = await Promise.all([
    User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);
  res.status(200).json(paginatedResponse(users, total, page, limit));
}));

const userDelete = catchAsync(async (req, res) => {
  const deletedUser = await User.findByIdAndDelete(req.params.id);
  if (!deletedUser) return res.status(404).json({ message: 'User not found' });
  res.status(200).json({ message: 'User deleted successfully' });
});

const userEdit = catchAsync(async (req, res) => {
  const { name, email, role, discipline, year, subscription } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (role) updates.role = role;
  if (discipline !== undefined) updates.discipline = discipline;
  if (year !== undefined) updates.year = year;
  if (subscription) {
    if (subscription.status !== undefined) updates['subscription.status'] = subscription.status;
    if (subscription.planId !== undefined) updates['subscription.planId'] = subscription.planId || null;
    if (subscription.planName !== undefined) updates['subscription.planName'] = subscription.planName || '';
    if (subscription.startDate !== undefined) updates['subscription.startDate'] = subscription.startDate || null;
    if (subscription.endDate !== undefined) updates['subscription.endDate'] = subscription.endDate || null;
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true }
  ).select('-password');
  if (!updatedUser) return res.status(404).json({ message: 'User not found' });
  res.status(200).json({ message: 'User updated successfully', user: updatedUser });
});

const editUserValidation = [
  param('id').isMongoId(),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['user', 'admin']),
  body('discipline').optional().isIn(['medicine', 'pharmacy', '']),
  body('year').optional({ values: 'null' }).isInt({ min: 1, max: 6 }),
  body('subscription.status').optional().isIn(['none', 'active', 'expired', 'cancelled']),
  body('subscription.planId').optional({ values: 'null' }).isMongoId(),
  body('subscription.planName').optional().trim(),
  body('subscription.startDate').optional({ values: 'null' }).isISO8601(),
  body('subscription.endDate').optional({ values: 'null' }).isISO8601(),
];

// Delete user by ID
router.delete('/users/:id', verifyToken, requireAdmin, [param('id').isMongoId()], validate, userDelete);
router.delete('/users/delete-user/:id', verifyToken, requireAdmin, [param('id').isMongoId()], validate, userDelete);

// Edit user by ID
router.put('/users/:id', verifyToken, requireAdmin, editUserValidation, validate, userEdit);
router.put('/users/edit-user/:id', verifyToken, requireAdmin, editUserValidation, validate, userEdit);

export default router;
