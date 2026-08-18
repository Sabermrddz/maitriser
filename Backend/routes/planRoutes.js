import express from 'express';
import { body, param } from 'express-validator';
import path from 'path';
import multer from 'multer';
import Plan from '../models/planModel.js';
import SubscriptionCode from '../models/subscriptionCodeModel.js';
import User from '../models/userModel.js';
import ContactMessage from '../models/contactModel.js';
import AppConfig from '../models/appConfigModel.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import { broadcast } from '../ws.js';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getBucket, getPresignedExpiry } from '../config/r2.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

const router = express.Router();

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = '.' + file.originalname.toLowerCase().split('.').pop();
    const allowedMime = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (allowed.includes(ext) && allowedMime.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed (png, jpg, jpeg, gif, webp)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

function generateCode(prefix) {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${rand}`;
}

// ── Public: list active plans ──────────────────────────────────────────────
router.get('/plans', catchAsync(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.discipline) filter.discipline = String(req.query.discipline);
  if (req.query.year) filter.year = Number(req.query.year);
  const plans = await Plan.find(filter).sort({ sortOrder: 1, name: 1 });
  res.json(plans);
}));

// ── Authenticated: check subscription ──────────────────────────────────────
router.get('/payments/subscription', verifyToken, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('subscription discipline year');
  if (!user) return res.status(404).json({ message: 'User not found' });
  const sub = user.subscription || { status: 'none' };
  if (sub.status === 'active' && sub.endDate && new Date(sub.endDate) < new Date()) {
    sub.status = 'expired';
    await User.findByIdAndUpdate(req.user.id, { 'subscription.status': 'expired' });
  }
  if (sub.status === 'active' && sub.planId) {
    const plan = await Plan.findById(sub.planId);
    if (!plan || plan.year !== user.year || plan.discipline !== user.discipline) {
      sub.status = 'expired';
      await User.findByIdAndUpdate(req.user.id, { 'subscription.status': 'expired' });
    }
  }
  res.json({ subscription: { planId: sub.planId, planName: sub.planName, status: sub.status, startDate: sub.startDate, endDate: sub.endDate } });
}));

// ── Authenticated: redeem a subscription code ──────────────────────────────
router.post('/payments/redeem-code', verifyToken, [
  body('code').trim().notEmpty().withMessage('Code is required'),
], validate, catchAsync(async (req, res) => {
  const codeStr = req.body.code.toUpperCase().trim();
  const doc = await SubscriptionCode.findOneAndUpdate(
    { code: codeStr, status: 'active', $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
    { $set: { status: 'used', usedBy: req.user.id, usedAt: new Date() } },
    { new: true }
  );
  if (!doc) return res.status(400).json({ message: 'Invalid or expired code' });

  const plan = await Plan.findById(doc.planId);
  if (!plan || !plan.isActive) {
    await SubscriptionCode.findByIdAndUpdate(doc._id, { $set: { status: 'active', usedBy: null, usedAt: null } });
    return res.status(400).json({ message: 'Associated plan no longer available' });
  }

  const startDate = new Date();
  const endDate = new Date();
  switch (plan.interval) {
    case 'day': endDate.setDate(endDate.getDate() + 1); break;
    case 'week': endDate.setDate(endDate.getDate() + 7); break;
    case 'month': endDate.setMonth(endDate.getMonth() + 1); break;
    case 'bimonth': endDate.setMonth(endDate.getMonth() + 2); break;
    case 'semester': endDate.setMonth(endDate.getMonth() + 6); break;
    case 'year': endDate.setFullYear(endDate.getFullYear() + 1); break;
    default: endDate.setMonth(endDate.getMonth() + 1);
  }

  const updated = await User.findByIdAndUpdate(req.user.id, {
    subscription: {
      planId: plan._id,
      planName: plan.name,
      status: 'active',
      startDate,
      endDate,
    },
  });

  if (!updated) {
    await SubscriptionCode.findByIdAndUpdate(doc._id, { $set: { status: 'active', usedBy: null, usedAt: null } });
    return res.status(404).json({ message: 'User not found, code restored' });
  }

  res.json({ message: 'Subscription activated', planName: plan.name, endDate });
}));

// ── Authenticated: subscribe to a free plan ────────────────────────────────
router.post('/plans/:id/subscribe', verifyToken, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan || !plan.isActive) return res.status(404).json({ message: 'Plan not found' });
  if (plan.price !== 0) return res.status(400).json({ message: 'This plan requires a payment code' });

  const startDate = new Date();
  const endDate = new Date();
  switch (plan.interval) {
    case 'day': endDate.setDate(endDate.getDate() + 1); break;
    case 'week': endDate.setDate(endDate.getDate() + 7); break;
    case 'month': endDate.setMonth(endDate.getMonth() + 1); break;
    case 'bimonth': endDate.setMonth(endDate.getMonth() + 2); break;
    case 'semester': endDate.setMonth(endDate.getMonth() + 6); break;
    case 'year': endDate.setFullYear(endDate.getFullYear() + 1); break;
    default: endDate.setMonth(endDate.getMonth() + 1);
  }

  await User.findByIdAndUpdate(req.user.id, {
    subscription: {
      planId: plan._id,
      planName: plan.name,
      status: 'active',
      startDate,
      endDate,
    },
  });

  res.json({ message: 'Free subscription activated', planName: plan.name, endDate });
}));

// ── Admin: plan CRUD ───────────────────────────────────────────────────────
router.get('/admin/plans', verifyToken, requireAdmin, catchAsync(async (req, res) => {
  const plans = await Plan.find().sort({ sortOrder: 1, name: 1 });
  res.json(plans);
}));

router.post('/admin/plans', verifyToken, requireAdmin, [
  body('name').trim().notEmpty(),
  body('discipline').isIn(['medicine', 'pharmacy']),
  body('year').isInt({ min: 1, max: 7 }),
  body('included').optional().isObject(),
  body('price').optional().isFloat({ min: 0 }),
  body('interval').optional().isIn(['day', 'week', 'month', 'bimonth', 'semester', 'year']),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt(),
], validate, catchAsync(async (req, res) => {
  const plan = await Plan.create(req.body);
  res.status(201).json(plan);
}));

router.put('/admin/plans/:id', verifyToken, requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const allowed = ['name', 'discipline', 'year', 'price', 'included', 'interval', 'isActive', 'sortOrder'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const plan = await Plan.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  res.json(plan);
}));

router.delete('/admin/plans/:id', verifyToken, requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const plan = await Plan.findByIdAndDelete(req.params.id);
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  res.json({ message: 'Plan deleted' });
}));

// ── Admin: subscription code management ────────────────────────────────────
router.get('/admin/subscription-codes', verifyToken, requireAdmin, catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.planId) filter.planId = String(req.query.planId);
  const codes = await SubscriptionCode.find(filter)
    .populate('planId', 'name discipline year')
    .populate('usedBy', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
  res.json(codes);
}));

router.post('/admin/subscription-codes/generate', verifyToken, requireAdmin, [
  body('planId').isMongoId(),
  body('count').isInt({ min: 1, max: 100 }),
  body('expiresAt').optional({ values: 'null' }).isISO8601(),
  body('notes').optional().trim(),
], validate, catchAsync(async (req, res) => {
  const { planId, count, expiresAt, notes } = req.body;
  const plan = await Plan.findById(planId);
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  const prefix = `${plan.discipline.slice(0, 3).toUpperCase()}${plan.year}`;
  const codes = [];
  for (let i = 0; i < count; i++) {
    let code;
    let attempts = 0;
    do {
      code = generateCode(prefix);
      attempts++;
    } while (attempts < 20 && await SubscriptionCode.findOne({ code }));
    codes.push(code);
  }

  const docs = codes.map((code) => ({
    code,
    planId,
    createdBy: req.user.id,
    expiresAt: expiresAt || null,
    notes: notes || '',
  }));
  await SubscriptionCode.insertMany(docs);

  res.status(201).json({ message: `${codes.length} codes generated`, codes });
}));

router.delete('/admin/subscription-codes/:id', verifyToken, requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const code = await SubscriptionCode.findByIdAndUpdate(req.params.id, { status: 'expired' }, { new: true });
  if (!code) return res.status(404).json({ message: 'Code not found' });
  res.json({ message: 'Code revoked' });
}));

// ── Admin: set user subscription manually ──────────────────────────────────
router.put('/users/:id/subscription', verifyToken, requireAdmin, [
  param('id').isMongoId(),
  body('status').optional().isIn(['none', 'active', 'expired', 'cancelled']),
  body('planId').optional({ values: 'null' }).isMongoId(),
  body('planName').optional().trim(),
  body('startDate').optional({ values: 'null' }).isISO8601(),
  body('endDate').optional({ values: 'null' }).isISO8601(),
], validate, catchAsync(async (req, res) => {
  const { status, planId, planName, startDate, endDate } = req.body;
  if (planId) {
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(400).json({ message: 'Plan not found' });
  }
  const subscription = {};
  if (status !== undefined) subscription['subscription.status'] = status;
  if (planId !== undefined) subscription['subscription.planId'] = planId || null;
  if (planName !== undefined) subscription['subscription.planName'] = planName || '';
  if (startDate !== undefined) subscription['subscription.startDate'] = startDate || null;
  if (endDate !== undefined) subscription['subscription.endDate'] = endDate || null;

  const user = await User.findByIdAndUpdate(req.params.id, { $set: subscription }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'Subscription updated', user });
}));

// ── Payment info (public) ───────────────────────────────────────────────────
router.get('/payments/payment-info', catchAsync(async (req, res) => {
  const instructions = await AppConfig.findOne({ key: 'paymentInstructions' });
  const imageUrl = await AppConfig.findOne({ key: 'paymentImageUrl' });
  res.json({
    instructions: instructions?.value || '',
    imageUrl: imageUrl?.value || '',
  });
}));

// ── Submit a payment intent (authenticated, with receipt image) ─────────────
router.post('/payments/payment-intent', verifyToken, receiptUpload.single('receiptImage'), catchAsync(async (req, res) => {
  const { planId, message } = req.body;
  if (!planId || !message) return res.status(400).json({ message: 'planId and message are required' });

  const plan = await Plan.findById(planId);
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  let imageUrl = null;
  if (req.file) {
    const s3 = getR2Client();
    const ext = req.file.originalname.toLowerCase().split('.').pop();
    const key = `payment-receipts/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    if (s3) {
      await s3.send(new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }));
      imageUrl = key;
    }
  }

  const contactMessage = await ContactMessage.create({
    name: user.name || user.email || 'Unknown',
    email: user.email || '',
    message: `[Payment Intent] Plan: ${plan.name}\nAmount: ${plan.price} €\nMessage: ${message}`,
    imageUrl,
    planName: plan.name,
    userId: user._id,
  });

  broadcast('contact:new', { name: contactMessage.name, email: contactMessage.email, plan: plan.name });
  res.status(201).json({ message: 'Payment request submitted successfully' });
}));

// ── Serve payment receipt images (authenticated) ────────────────────────────
router.get('/payment-images/:filename', verifyToken, requireAdmin, catchAsync(async (req, res) => {
  const s3 = getR2Client();
  if (!s3) return res.status(500).json({ message: 'Storage not configured' });
  const key = `payment-receipts/${path.basename(req.params.filename)}`;
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: getBucket(), Key: key }), {
    expiresIn: getPresignedExpiry(),
  });
  res.redirect(url);
}));

// ── Admin: update payment config ────────────────────────────────────────────
router.put('/admin/payment-config', verifyToken, requireAdmin, [
  body('instructions').optional().isString(),
  body('imageUrl').optional().isString(),
], validate, catchAsync(async (req, res) => {
  if (req.body.instructions !== undefined) {
    await AppConfig.findOneAndUpdate(
      { key: 'paymentInstructions' },
      { key: 'paymentInstructions', value: String(req.body.instructions) },
      { upsert: true, new: true }
    );
  }
  if (req.body.imageUrl !== undefined) {
    await AppConfig.findOneAndUpdate(
      { key: 'paymentImageUrl' },
      { key: 'paymentImageUrl', value: String(req.body.imageUrl) },
      { upsert: true, new: true }
    );
  }
  res.json({ message: 'Payment config updated' });
}));

// ── Admin: list payment intents ─────────────────────────────────────────────
router.get('/admin/payment-intents', verifyToken, requireAdmin, catchAsync(async (req, res) => {
  const filter = { imageUrl: { $ne: null } };
  const { skip, limit, page } = getPagination(req.query);
  const [items, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ContactMessage.countDocuments(filter),
  ]);
  res.json(paginatedResponse(items, total, page, limit));
}));

// ── Admin: delete a payment intent + its image ──────────────────────────────
router.delete('/admin/payment-intents/:id', verifyToken, requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const doc = await ContactMessage.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Payment intent not found' });
  if (doc.imageUrl) {
    const s3 = getR2Client();
    if (s3) {
      try { await s3.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: doc.imageUrl })); }
      catch { logger.warn('Failed to delete payment receipt image from R2'); }
    }
  }
  await ContactMessage.findByIdAndDelete(req.params.id);
  res.json({ message: 'Payment intent deleted' });
}));

export default router;
