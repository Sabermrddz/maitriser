import jwt from 'jsonwebtoken';
import { verifyToken as clerkVerify } from '@clerk/backend';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';
import { isBlacklisted } from '../middleware/jwtBlacklist.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

export const setTokenCookie = (res, token) => {
  res.cookie('token', token, COOKIE_OPTIONS);
};

export const clearTokenCookie = (res) => {
  res.clearCookie('token', { path: '/' });
};

export const verifyToken = async (req, res, next) => {
  if (req.user) return next();

  const authHeader = req.headers['authorization'];
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  if (process.env.CLERK_SECRET_KEY) {
    try {
      const payload = await clerkVerify(token, { secretKey: process.env.CLERK_SECRET_KEY });
      const user = await User.findOne({ clerkId: payload.sub });
      if (!user) return res.status(401).json({ message: 'User not found. Sync your account first.' });
      req.user = { id: user._id, userId: user.userId, clerkId: payload.sub, role: user.role, discipline: user.discipline || '', year: user.year || null };
      logger.debug({ userId: user.userId }, 'Clerk token verified');
      return next();
    } catch (err) {
      if (process.env.DISABLE_JWT_FALLBACK === 'true') {
        return res.status(401).json({ message: 'Invalid or expired token.' });
      }
      logger.warn({ err }, 'Clerk verification failed, falling back to JWT');
    }
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (await isBlacklisted(token)) return res.status(401).json({ message: 'Token revoked.' });
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found.' });
    if (user.activeTokenId && decoded.tokenId && decoded.tokenId !== user.activeTokenId) {
      return res.status(409).json({ message: 'Session expired. You have been logged in from another device.' });
    }
    req.user = { id: user._id, userId: user.userId, role: user.role, email: user.email, name: user.name, discipline: user.discipline || '', year: user.year || null };
    logger.debug({ userId: user.userId }, 'JWT token verified');
    return next();
  } catch (err) {
    logger.debug({ err }, 'JWT token verification failed');
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};
