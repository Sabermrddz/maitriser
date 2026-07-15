import Feedback from '../models/feedbackModel.js';
import logger from '../utils/logger.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { paginatedResponse } from '../utils/paginate.js';
import { broadcast } from '../ws.js';

const stripHtml = (s) => s.replace(/<[^>]*>/g, '');

export const submitFeedback = catchAsync(async (req, res) => {
  const { message, pageUrl } = req.body;
  const userId = req.user?.id || req.user?.userId;

  if (!message || message.trim().length < 10) {
    return res.status(400).json({ message: 'Message must be at least 10 characters' });
  }

  const feedback = await Feedback.create({
    userId,
    message: stripHtml(message.trim()),
    pageUrl: pageUrl ? stripHtml(pageUrl.slice(0, 500)) : '',
  });

  broadcast('feedback:new', { feedbackId: feedback._id });
  return res.status(201).json({ message: 'Feedback submitted', feedback });
});

export const getAllFeedback = catchAsync(async (req, res) => {
  const { skip, limit, page } = req.pagination || {};
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);

  const [feedbackList, total] = await Promise.all([
    Feedback.find(filter)
      .populate('userId', 'name email userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Feedback.countDocuments(filter),
  ]);

  res.status(200).json(
    skip !== undefined
      ? paginatedResponse(feedbackList, total, page, limit)
      : feedbackList
  );
});

export const updateFeedbackStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  if (!['read', 'resolved'].includes(status)) {
    return res.status(400).json({ message: 'Status must be "read" or "resolved"' });
  }

  const feedback = await Feedback.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

  res.json({ message: 'Feedback updated', feedback });
});
