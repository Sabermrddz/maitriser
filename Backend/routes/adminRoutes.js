import express from 'express';
import { body } from 'express-validator';
import crypto from 'crypto';
import { verifyToken as clerkVerify } from '@clerk/backend';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { getClerkClient } from '../utils/clerkClient.js';

const router = express.Router();

router.post('/admin/claim', verifyToken, [
  body('code').isString().notEmpty(),
], validate, async (req, res) => {
  try {
    const { code } = req.body;
    const secret = process.env.ADMIN_SECRET_CODE || '';
    const input = code || '';
    const maxLen = Math.max(secret.length, input.length || 0);
    const a = Buffer.alloc(maxLen, secret, 'utf-8');
    const b = Buffer.alloc(maxLen, input, 'utf-8');
    if (!crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ message: 'Invalid admin code' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = 'admin';
    await user.save();

    res.json({ message: 'Admin access granted', role: 'admin' });
  } catch (err) {
    logger.error({ err }, 'admin claim failed');
    res.status(500).json({ message: 'Failed to claim admin' });
  }
});

router.post('/admin/sync-all-users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const clerkClient = getClerkClient();
    if (!clerkClient) return res.status(500).json({ message: 'Clerk not configured' });

    let offset = 0;
    const limit = 100;
    let synced = 0;

    while (true) {
      const clerkUsers = await clerkClient.users.getUserList({ limit, offset });
      if (!clerkUsers.data || clerkUsers.data.length === 0) break;

      const clerkIds = clerkUsers.data.map((cu) => cu.id);
      const emails = clerkUsers.data.map((cu) => cu.emailAddresses?.[0]?.emailAddress).filter(Boolean);
      const existingUsers = await User.find({ $or: [{ clerkId: { $in: clerkIds } }, { email: { $in: emails } }] });
      const existingByClerkId = {};
      const existingByEmail = {};
      existingUsers.forEach((u) => {
        if (u.clerkId) existingByClerkId[u.clerkId] = u;
        if (u.email) existingByEmail[u.email] = u;
      });

      for (const cu of clerkUsers.data) {
        if (existingByClerkId[cu.id]) continue;

        const email = cu.emailAddresses?.[0]?.emailAddress;
        const name = `${cu.firstName || ''} ${cu.lastName || ''}`.trim() || email?.split('@')[0] || 'User';
        const userId = email?.split('@')[0] || `user_${cu.id.slice(-8)}`;

        const linkedUser = existingByEmail[email];
        if (linkedUser) {
          linkedUser.clerkId = cu.id;
          linkedUser.name = name;
          linkedUser.emailVerified = !!cu.emailAddresses?.[0]?.verification?.status;
          await linkedUser.save();
        } else {
          await new User({
            userId,
            clerkId: cu.id,
            name,
            email: email || `${cu.id}@placeholder.maitrisez.com`,
            emailVerified: !!cu.emailAddresses?.[0]?.verification?.status,
            role: 'user',
          }).save();
        }
        synced++;
      }

      offset += limit;
    }

    res.json({ message: `Synced ${synced} new users from Clerk`, synced });
  } catch (err) {
    logger.error({ err }, 'sync-all-users failed');
    res.status(500).json({ message: 'Failed to sync users from Clerk' });
  }
});

export default router;
