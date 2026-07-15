import mongoose from 'mongoose';

const pdfDocumentSchema = new mongoose.Schema({
  pdfId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  filename: { type: String, required: true },
  originalName: { type: String, default: '' },
  size: { type: Number, default: 0 },
}, { timestamps: true });

const PdfDocument = mongoose.model('PdfDocument', pdfDocumentSchema);
export default PdfDocument;
