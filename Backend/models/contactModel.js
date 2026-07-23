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
  imageUrl: { type: String, default: null },
  planName: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['unread', 'read', 'replied', 'resolved'], default: 'unread' },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

contactSchema.index({ createdAt: -1 });
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ imageUrl: 1 });

const ContactMessage = mongoose.model('ContactMessage', contactSchema);
export default ContactMessage;
