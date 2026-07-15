import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  userId:   { type: String, required: true, unique: true, trim: true },
  clerkId:  { type: String, unique: true, sparse: true },
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: null },
  role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  discipline: { type: String, enum: ['medicine', 'pharmacy', ''], default: '' },
  year:   { type: Number, default: null },
  subscription: {
    planId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
    planName: { type: String, default: '' },
    status:   { type: String, enum: ['none', 'active', 'expired', 'cancelled'], default: 'none' },
    startDate: { type: Date, default: null },
    endDate:   { type: Date, default: null },
  },
  deletedAt:          { type: Date, default: null },
  emailVerified:      { type: Boolean, default: false },
  verificationToken:  { type: String, default: null },
  verificationExpiry: { type: Date, default: null },
  resetToken:         { type: String, default: null },
  resetExpiry:        { type: Date, default: null },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (inputPassword) {
  if (!this.password) return false;
  return bcrypt.compare(inputPassword, this.password);
};

userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ discipline: 1, year: 1 });
userSchema.index({ verificationToken: 1 }, { sparse: true });
userSchema.index({ resetToken: 1 }, { sparse: true });

const User = mongoose.model('User', userSchema);
export default User;
