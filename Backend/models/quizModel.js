import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  quizId:   { type: String, required: true, unique: true, trim: true }, // e.g. "Q001"
  quizName: { type: String, default: '' },
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  moduleName: { type: String, default: '' },
  year:     { type: Number, required: true, min: 1, max: 7 },
  discipline: { type: String, enum: ['medicine', 'pharmacy'], required: true },
  course:   { type: String, default: '' },
  published: { type: Boolean, default: false },
  explanation: { type: String, default: '' },
  optionExplanations: [{
    letter: { type: String, required: true },
    whyTrue: { type: String, default: '' },
    whyFalse: { type: String, default: '' },
  }],
  keyConcepts: { type: [String], default: [] },
  commonTraps: { type: [String], default: [] },
  timer:    { type: Number, default: null },
  caseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null },
  question: {
    questionText:   { type: String, required: true },
    questionImage:  { type: String, default: null },
    options:        { type: [String], required: true },
    correctAnswers: { type: [String], required: true },
  },
  }, { timestamps: true });

quizSchema.index({ published: 1, year: 1, discipline: 1, moduleId: 1, createdAt: -1 });
quizSchema.index({ year: 1, discipline: 1, moduleId: 1, course: 1 });
quizSchema.index({ moduleId: 1 });
quizSchema.index({ caseId: 1 });
quizSchema.index({ createdAt: -1 });

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
