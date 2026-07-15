import mongoose from 'mongoose';

const quizMockExamSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  year: { type: Number, required: true, min: 1, max: 7 },
  discipline: { type: String, enum: ['medicine', 'pharmacy'], default: 'medicine' },
  quizIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
  duration: { type: Number, default: 30, min: 1 },
  published: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

quizMockExamSchema.index({ moduleId: 1, published: 1 });

const QuizMockExam = mongoose.model('QuizMockExam', quizMockExamSchema);
export default QuizMockExam;
