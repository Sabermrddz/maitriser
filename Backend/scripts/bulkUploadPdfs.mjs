import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import PdfDocument from '../models/pdfDocumentModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDFS_DIR = path.resolve(process.argv[2] || './pdfs');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/QuizApp';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'quizapp-assets';

const generatePdfId = async () => {
  const last = await PdfDocument.findOne().sort({ createdAt: -1 }).select('pdfId').lean();
  const num = last ? parseInt(last.pdfId.replace('PDF-', ''), 10) + 1 : 1;
  return `PDF-${String(num).padStart(3, '0')}`;
};

const run = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const files = fs.readdirSync(PDFS_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (files.length === 0) {
    console.log('No PDF files found in', PDFS_DIR);
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${files.length} PDF(s) in ${PDFS_DIR}`);

  let success = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const name = path.basename(file, '.pdf').replace(/[-_]/g, ' ');
      const filePath = path.join(PDFS_DIR, file);
      const buffer = fs.readFileSync(filePath);
      const key = `course-pdfs/${Date.now()}-${Math.round(Math.random() * 1e6)}.pdf`;

      await r2Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
      }));

      const pdfId = await generatePdfId();
      await PdfDocument.create({
        pdfId,
        name,
        filename: key,
        originalName: file,
        size: buffer.length,
      });

      console.log(`  ✓ ${file} → ${pdfId} (${(buffer.length / 1024).toFixed(1)} KB)`);
      success++;
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone: ${success} uploaded, ${errors} failed`);
  await mongoose.disconnect();
};

run().catch((err) => { console.error(err); process.exit(1); });
