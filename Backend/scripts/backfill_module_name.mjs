import 'dotenv/config';
import mongoose from 'mongoose';
import Quiz from '../models/quizModel.js';
import Module from '../models/moduleModel.js';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/QuizApp';
await mongoose.connect(uri);

const quizzes = await Quiz.find({ $or: [{ moduleName: '' }, { moduleName: { $exists: false } }] }).lean();
console.log(`Quizzes missing moduleName: ${quizzes.length}`);

let updated = 0;
let skipped = 0;
for (const q of quizzes) {
  if (!q.moduleId) { skipped++; continue; }
  const mod = await Module.findById(q.moduleId).select('name').lean();
  if (!mod) { skipped++; continue; }
  await Quiz.updateOne({ _id: q._id }, { $set: { moduleName: mod.name || '' } });
  updated++;
}
console.log(`Updated: ${updated}, Skipped (no module): ${skipped}`);

await mongoose.disconnect();
