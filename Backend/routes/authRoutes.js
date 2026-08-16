import express from 'express';
import { verifyToken, clearTokenCookie } from '../controllers/authController.js';
import { addToBlacklist } from '../middleware/jwtBlacklist.js';
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
  clearTokenCookie(res);
  res.json({ message: 'Logged out successfully' });
});

export default router;
