import express from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';
import { broadcast } from '../ws.js';
import { validatePassword } from '../middleware/passwordValidator.js';
import { validate } from '../middleware/validate.js';
import { genUserId } from '../utils/idGenerator.js';
import { setTokenCookie } from '../controllers/authController.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').custom(validatePassword),
    body('admin_secret').notEmpty().withMessage('Admin secret is required'),
  ],
  validate,
  async (req, res) => {
    const secret = process.env.ADMIN_SECRET_CODE || '';
    const input = req.body.admin_secret || '';
    const maxLen = Math.max(secret.length, input.length || 0);
    const a = Buffer.alloc(maxLen, secret, 'utf-8');
    const b = Buffer.alloc(maxLen, input, 'utf-8');
    if (!crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ message: 'Invalid admin secret.' });
    }
    const { email, password } = req.body;
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'User already exists.' });

      const userId = await genUserId();
      const name = email.split('@')[0];
      const user = new User({ userId, name, email, password, role: 'admin' });
      await user.save();

      broadcast('user:signedUp', { userId, email });
      return res.status(201).json({ message: 'Admin registered successfully!' });
    } catch (err) {
      logger.error({ err }, 'Admin registration failed');
      if (err.code === 11000) return res.status(409).json({ message: 'Email already exists' });
      return res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/logging',
  loginLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate,
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email, role: 'admin' });
      if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials.' });

      const token = jwt.sign(
        { id: user._id, userId: user.userId, email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      setTokenCookie(res, token);
      return res.status(200).json({ token, message: 'Login successful!' });
    } catch (err) {
      logger.error({ err }, 'Admin login failed');
      return res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

export default router;
