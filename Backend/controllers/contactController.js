import ContactMessage from '../models/contactModel.js';
import logger from '../utils/logger.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { paginatedResponse } from '../utils/paginate.js';
import { broadcast } from '../ws.js';

// Add a new contact message
export const addContactMessage = catchAsync(async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }
    if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
    }
    if (message.length < 10 || message.length > 5000) {
        return res.status(400).json({ message: 'Message must be between 10 and 5000 characters' });
    }

    const stripHtml = (s) => s.replace(/<[^>]*>/g, '');
    const newContactMessage = new ContactMessage({
        name: stripHtml(name),
        email,
        message: stripHtml(message),
    });

    await newContactMessage.save();
    broadcast('contact:new', { name: newContactMessage.name, email: newContactMessage.email });
    return res.status(201).json({ 
        message: 'Message submitted successfully', 
        contactMessage: newContactMessage 
    });
});

// Get all contact messages (for administrative purposes)
export const getAllContactMessages = catchAsync(async (req, res) => {
    const { skip, limit, page } = req.pagination || {};
    const [contactMessages, total] = await Promise.all([
      ContactMessage.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      ContactMessage.countDocuments(),
    ]);
    res.status(200).json(
      skip !== undefined
        ? paginatedResponse(contactMessages, total, page, limit)
        : contactMessages
    );
});
