import express from 'express';
import { body } from 'express-validator';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import User from '../models/userModel.js';
import { sendEmail, verificationEmailHtml, resetPasswordHtml } from '../utils/email.js';
import logger from '../utils/logger.js';
import { validate } from '../middleware/validate.js';

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',').map((o) => o.trim());

const allowedHosts = ALLOWED_ORIGINS.map((o) => { try { return new URL(o).host; } catch { return null; } }).filter(Boolean);

const safeBaseUrl = (req) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  const host = req.get('host');
  if (host && allowedHosts.includes(host)) return `${req.protocol}://${host}`;
  return `${req.protocol}://${allowedHosts[0] || 'localhost:5173'}`;
};

const router = express.Router();

// POST /api/auth/send-verification — send verification email to existing unverified user
router.post(
  '/send-verification',
  emailLimiter,
  [body('email').isEmail().normalizeEmail()],
  validate,
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.json({ message: 'If that email exists, a verification link has been sent' });
      if (user.emailVerified) return res.json({ message: 'Email already verified' });

      const token = crypto.randomBytes(32).toString('hex');
      user.verificationToken = token;
      user.verificationExpiry = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      const sent = await sendEmail({ to: email, subject: 'Verify your email', html: verificationEmailHtml(token, safeBaseUrl(req)) });
      if (!sent) return res.status(500).json({ message: 'Failed to send verification email.' });

      res.json({ message: 'If that email exists, a verification link has been sent' });
    } catch (err) {
      logger.error({ err }, 'send-verification failed');
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST /api/auth/verify-email — verify email with token
router.post(
  '/verify-email',
  emailLimiter,
  [body('token').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { token } = req.body;
      const user = await User.findOne({
        verificationToken: token,
        verificationExpiry: { $gt: new Date() },
      });
      if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

      user.emailVerified = true;
      user.verificationToken = null;
      user.verificationExpiry = null;
      await user.save();

      res.json({ message: 'Email verified successfully' });
    } catch (err) {
      logger.error({ err }, 'verify-email failed');
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST /api/auth/forgot-password — send reset email
router.post(
  '/forgot-password',
  emailLimiter,
  [body('email').isEmail().normalizeEmail()],
  validate,
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.json({ message: 'If that email exists, a reset link has been sent' });

      const token = crypto.randomBytes(32).toString('hex');
      user.resetToken = token;
      user.resetExpiry = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      const sent = await sendEmail({ to: email, subject: 'Reset your password', html: resetPasswordHtml(token, safeBaseUrl(req)) });
      if (!sent) {
        return res.status(500).json({ message: 'Failed to send reset email.' });
      }

      res.json({ message: 'If that email exists, a reset link has been sent' });
    } catch (err) {
      logger.error({ err }, 'forgot-password failed');
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST /api/auth/reset-password — reset password with token
router.post(
  '/reset-password',
  emailLimiter,
  [
    body('token').notEmpty(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
      .matches(/[a-z]/).withMessage('Must contain a lowercase letter')
      .matches(/\d/).withMessage('Must contain a number')
      .matches(/[^A-Za-z0-9]/).withMessage('Must contain a special character'),
  ],
  validate,
  async (req, res) => {
    try {
      const { token, password } = req.body;
      const user = await User.findOne({
        resetToken: token,
        resetExpiry: { $gt: new Date() },
      });
      if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

      user.password = password;
      user.resetToken = null;
      user.resetExpiry = null;
      await user.save();

      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      logger.error({ err }, 'reset-password failed');
      res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;
