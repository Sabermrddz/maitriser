import express from 'express';
import { body, param } from 'express-validator';
import Bookmark from '../models/bookmarkModel.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

router.get('/bookmarks', verifyToken, catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(400).json({ message: 'userId required' });
  const bookmarks = await Bookmark.find({ userId }).populate('quizId', 'quizId question questionText');
  res.json(bookmarks);
}));

router.post('/bookmarks/toggle', verifyToken, [
  body('quizId').isString().notEmpty(),
], validate, catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const { quizId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });

  const existing = await Bookmark.findOne({ userId, quizId });
  if (existing) {
    await Bookmark.deleteOne({ _id: existing._id });
    return res.json({ bookmarked: false });
  }
  await Bookmark.create({ userId, quizId });
  res.json({ bookmarked: true });
}));

router.get('/bookmarks/:quizId', verifyToken, [
  param('quizId').isString().notEmpty(),
], validate, catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(400).json({ message: 'userId required' });
  const bookmark = await Bookmark.findOne({ userId, quizId: req.params.quizId });
  res.json({ bookmarked: !!bookmark });
}));

export default router;
