import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken as clerkVerify } from '@clerk/backend';
import { TokenVerificationError, ClerkAPIResponseError } from '@clerk/backend/errors';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';
import { getClerkClient } from '../utils/clerkClient.js';
import { COOKIE_OPTIONS } from '../controllers/authController.js';

const router = express.Router();

router.post('/clerk-sync', async (req, res) => {
  try {
    const clerkClient = getClerkClient();
    if (!clerkClient) return res.status(500).json({ message: 'Clerk not configured' });

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const payload = await clerkVerify(authHeader.split(' ')[1], { secretKey: process.env.CLERK_SECRET_KEY });
    const clerkUser = await clerkClient.users.getUser(payload.sub);
    if (!clerkUser) return res.status(404).json({ message: 'Clerk user not found' });

    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email?.split('@')[0] || 'User';
    const baseUserId = email?.split('@')[0] || `user_${payload.sub.slice(-8)}`;

    let user = await User.findOne({ clerkId: payload.sub });
    if (user) {
      user.name = name;
      user.email = email || user.email;
      user.emailVerified = !!clerkUser.emailAddresses?.[0]?.verification?.status;
      await user.save();
    } else {
      user = await User.findOne({ email });
      if (user) {
        user.clerkId = payload.sub;
        user.name = name;
        user.emailVerified = !!clerkUser.emailAddresses?.[0]?.verification?.status;
        await user.save();
      } else {
        user = await User.findOne({ userId: baseUserId });
        let userId = baseUserId;
        if (user) {
          userId = `${baseUserId}_${payload.sub.slice(-4)}`;
        }
        user = new User({
          userId,
          clerkId: payload.sub,
          name,
          email: email || `${payload.sub}@placeholder.maitrisez.com`,
          emailVerified: !!clerkUser.emailAddresses?.[0]?.verification?.status,
          role: 'user',
        });
        await user.save();
      }
    }

    user.activeTokenId = crypto.randomBytes(32).toString('hex');
    await user.save();

    const appToken = jwt.sign(
      { id: user._id, userId: user.userId, role: user.role, tokenId: user.activeTokenId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', appToken, COOKIE_OPTIONS);

    logger.info({ userId: user.userId, role: user.role }, 'Account synced via Clerk');
    return res.json({ message: 'Account synced', userId: user.userId, role: user.role, name: user.name || '', discipline: user.discipline || '', year: user.year || null });
  } catch (err) {
    logger.error({ err, message: err?.message, reason: err?.reason, status: err?.status }, 'clerk-sync failed');
    if (err instanceof TokenVerificationError) {
      return res.status(401).json({ message: 'Authentication failed' });
    }
    if (err instanceof ClerkAPIResponseError) {
      return res.status(err.status || 502).json({ message: 'Authentication service unavailable' });
    }
    res.status(500).json({ message: 'Failed to sync account' });
  }
});

export default router;
