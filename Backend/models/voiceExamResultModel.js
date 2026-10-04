import mongoose from 'mongoose';

const criterionResultSchema = new mongoose.Schema({
  label:  { type: String, required: true },
  passed: { type: Boolean, required: true },
  matchedKeyword: { type: String, default: null },
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  text:          { type: String, default: '' },
  criteriaResults: [criterionResultSchema],
  allPassed:     { type: Boolean, required: true },
  passedCount:   { type: Number, default: 0 },
  criteriaTotal: { type: Number, default: 0 },
}, { _id: false });

const voiceExamResultSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceExam', required: true },
  answers: [answerSchema],
  overallPassed: { type: Number, required: true },
  overallTotal:  { type: Number, required: true },
  overallMax:    { type: Number, required: true },
  criteriaPassed: { type: Number, default: 0 },
  criteriaTotal:  { type: Number, default: 0 },
}, { timestamps: true });

voiceExamResultSchema.index({ userId: 1, createdAt: -1 });
voiceExamResultSchema.index({ examId: 1 });

const VoiceExamResult = mongoose.model('VoiceExamResult', voiceExamResultSchema);
export default VoiceExamResult;