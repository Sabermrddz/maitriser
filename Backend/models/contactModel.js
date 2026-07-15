import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  status: { type: String, enum: ['unread', 'read', 'replied', 'resolved'], default: 'unread' },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

contactSchema.index({ createdAt: -1 });
contactSchema.index({ status: 1, createdAt: -1 });

const ContactMessage = mongoose.model('ContactMessage', contactSchema);
export default ContactMessage;
