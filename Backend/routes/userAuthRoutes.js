import express from 'express';
import crypto from 'crypto';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { verifyToken } from '../controllers/authController.js';
import logger from '../utils/logger.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { validatePassword } from '../middleware/passwordValidator.js';
import { addToBlacklist } from '../middleware/jwtBlacklist.js';
import { validate } from '../middleware/validate.js';
import { genUserId } from '../utils/idGenerator.js';
import { setTokenCookie } from '../controllers/authController.js';

const router = express.Router();

// POST /api/users/register — self-registration for students
router.post(
  '/users/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').custom(validatePassword),
  ],
  validate,
  async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'Email already exists.' });

      const userId = await genUserId();
      const user = new User({ userId, name, email, password, role: 'user' });
      user.activeTokenId = crypto.randomBytes(32).toString('hex');
      await user.save();

      const token = jwt.sign(
        { id: user._id, userId: user.userId, role: user.role, tokenId: user.activeTokenId },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      setTokenCookie(res, token);
      logger.info({ userId: user.userId }, 'User registered');
      return res.status(201).json({ message: 'Registration successful!', token, userId: user.userId, role: user.role });
    } catch (err) {
      logger.error({ err }, 'User registration failed');
      if (err.code === 11000) return res.status(409).json({ message: 'userId or email already exists' });
      return res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

// POST /api/users/login — student login (by email)
router.post(
  '/users/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

      user.activeTokenId = crypto.randomBytes(32).toString('hex');
      await user.save();

      const token = jwt.sign(
        { id: user._id, userId: user.userId, role: user.role, tokenId: user.activeTokenId },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      setTokenCookie(res, token);
      logger.info({ userId: user.userId }, 'User logged in');
      return res.status(200).json({ message: 'Login successful!', token, userId: user.userId, role: user.role });
    } catch (err) {
      logger.error({ err }, 'User login failed');
      return res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

// GET /api/users/profile — get own profile (authenticated)
router.get(
  '/users/profile',
  verifyToken,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  })
);

// PUT /api/users/profile — update own name/email (authenticated)
router.put(
  '/users/profile',
  verifyToken,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('discipline').optional().isIn(['medicine', 'pharmacy', '']).withMessage('Invalid discipline'),
    body('year').optional({ values: 'null' }).isInt({ min: 1, max: 6 }).withMessage('Year must be between 1 and 6'),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, discipline, year } = req.body;
      const updates = {};
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (discipline !== undefined) updates.discipline = discipline;
      if (year !== undefined) updates.year = year;
      if (!Object.keys(updates).length) return res.status(400).json({ message: 'Nothing to update' });

      const currentUser = await User.findById(req.user.id).select('year discipline subscription');
      if (currentUser) {
        const yearChanged = year !== undefined && Number(year) !== currentUser.year;
        const discChanged = discipline !== undefined && discipline !== currentUser.discipline;
        if ((yearChanged || discChanged) && currentUser.subscription?.status === 'active') {
          updates['subscription.status'] = 'expired';
        }
      }

      const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-password');
      if (!user) return res.status(404).json({ message: 'User not found' });
      logger.info({ userId: req.user.userId, updates: Object.keys(updates) }, 'Profile updated');
      res.json({ message: 'Profile updated', user });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'Email already in use' });
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }
);

const changePassword = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const isMatch = await user.comparePassword(req.body.currentPassword);
  if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
  user.password = req.body.newPassword;
  await user.save();
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await addToBlacklist(token, decoded.exp * 1000);
    } catch { logger.warn('Failed to blacklist old token after password change'); }
  }
  res.json({ message: 'Password changed successfully' });
});

const changePwdValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters').custom(validatePassword),
];

// PUT /api/users/change-password — change own password (authenticated)
router.put('/users/change-password', verifyToken, changePwdValidation, validate, changePassword);
// Alias for backward compatibility
router.put('/change-password', verifyToken, changePwdValidation, validate, changePassword);

// DELETE /api/users/me — self-service account deletion (GDPR)
router.delete(
  '/users/me',
  verifyToken,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.deletedAt = new Date();
    user.email = `deleted-${user._id}@placeholder.maitrisez.com`;
    user.name = 'Deleted User';
    user.password = crypto.randomBytes(32).toString('hex');
    await user.save();
    res.json({ message: 'Account deleted successfully' });
  })
);

export default router;
