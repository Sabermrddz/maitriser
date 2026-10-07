import express from 'express';
import { verifyToken, clearTokenCookie } from '../controllers/authController.js';
import { addToBlacklist } from '../middleware/jwtBlacklist.js';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/auth/verify — clients poll this to check if their token is still valid
router.get('/verify', verifyToken, (req, res) => {
  res.json({ message: 'Token valid', user: req.user });
});

// POST /api/auth/logout — server-side logout: blacklist token + clear cookie
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        await addToBlacklist(token, decoded.exp * 1000);
      } catch { /* token already invalid */ }
    }
  } catch (err) {
    logger.warn({ err }, 'Logout blacklist failed');
  }
  // Release the device lock when the logging-out device owns it, so the next
  // sign-in from anywhere is immediate. A displaced device never reaches this
  // point (verifyToken answers 409 first) so it cannot free someone else's.
  if (req.clerkSid && req.user?.clerkId) {
    try {
      const user = await User.findOne({ clerkId: req.user.clerkId });
      if (user && user.activeClerkSid === req.clerkSid) {
        user.activeClerkSid = null;
        user.isOnline = false;
        await user.save();
      }
    } catch (err) {
      logger.warn({ err }, 'Logout device-lock release failed');
    }
  }
  clearTokenCookie(res);
  res.json({ message: 'Logged out successfully' });
});

export default router;
