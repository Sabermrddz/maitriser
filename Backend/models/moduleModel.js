import mongoose from 'mongoose';

const courseSubdoc = new mongoose.Schema({
  name: { type: String, required: true },
  pdfId: { type: String, default: '' },
}, { _id: false });

const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  year: { type: Number, required: true, min: 1, max: 7 },
  courses: [courseSubdoc],
  discipline: { type: String, enum: ['medicine', 'pharmacy'], default: 'medicine' },
}, { timestamps: true });

moduleSchema.index({ year: 1, name: 1 }, { unique: true });
moduleSchema.index({ discipline: 1 });

const Module = mongoose.model('Module', moduleSchema);
export default Module;
