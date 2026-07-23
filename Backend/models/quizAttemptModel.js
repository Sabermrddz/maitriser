import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

quizAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
quizAttemptSchema.index({ userId: 1, quizId: 1 });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
export default QuizAttempt;
