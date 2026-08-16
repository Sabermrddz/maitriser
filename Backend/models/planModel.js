import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  discipline: { type: String, enum: ['medicine', 'pharmacy'], required: true },
  year: { type: Number, required: true, min: 1, max: 7 },
  price: { type: Number, default: 0, min: 0 },
  included: {
    quizzes: { type: Boolean, default: true },
    voiceExams: { type: Boolean, default: false },
  },
  interval: { type: String, enum: ['day', 'week', 'month', 'bimonth', 'semester', 'year'], default: 'month' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

planSchema.pre('save', function (next) {
  if (!this.slug) {
    const d = this.discipline?.slice(0, 3) || 'gen';
    this.slug = `${this.name?.toLowerCase().replace(/\s+/g, '-')}-${d}-y${this.year}`;
  }
  next();
});

planSchema.index({ discipline: 1, year: 1, isActive: 1 });

const Plan = mongoose.model('Plan', planSchema);
export default Plan;
