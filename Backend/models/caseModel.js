import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  moduleId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  year:        { type: Number, required: true, min: 1, max: 7 },
  discipline:  { type: String, default: 'medicine' },
  course:      { type: String, default: '' },
}, { timestamps: true });

caseSchema.index({ moduleId: 1, year: 1 });
caseSchema.index({ discipline: 1 });

const Case = mongoose.model('Case', caseSchema);
export default Case;
