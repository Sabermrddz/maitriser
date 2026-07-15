import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  selectedAnswers: [String],
  correct: { type: Boolean, required: true },
  correctAnswers: [String],
  explanation: { type: String, default: '' },
}, { _id: false });

const quizMockAttemptSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  mockExamId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizMockExam', required: true },
  quizIds: [{ type: mongoose.Schema.Types.ObjectId }],
  answers: [answerSchema],
  totalScore: { type: Number, default: 0 },
  totalPossible: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
}, { timestamps: true });

quizMockAttemptSchema.index({ userId: 1, status: 1, completedAt: -1 });
quizMockAttemptSchema.index({ mockExamId: 1 });

const QuizMockAttempt = mongoose.model('QuizMockAttempt', quizMockAttemptSchema);
export default QuizMockAttempt;
