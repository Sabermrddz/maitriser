import mongoose from 'mongoose';

const criterionSchema = new mongoose.Schema({
  label:    { type: String, required: true },
  keywords: [{ type: String }],
}, { _id: false });

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  idealAnswer:  { type: String, default: '' },
  criteria:     [criterionSchema],
}, { _id: false });

const voiceExamSchema = new mongoose.Schema({
  examId:   { type: String, unique: true, trim: true },
  title:    { type: String, required: true },
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  year:     { type: Number, required: true, min: 1, max: 7 },
  discipline: { type: String, enum: ['medicine', 'pharmacy'], default: 'medicine', required: true },
  clinicalCasePrompt: { type: String, required: true },
  questions: [questionSchema],
  images:    [{ type: String }],
}, { timestamps: true });

voiceExamSchema.index({ year: 1, moduleId: 1, createdAt: -1 });

const VoiceExam = mongoose.model('VoiceExam', voiceExamSchema);
export default VoiceExam;