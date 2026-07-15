import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/QuizApp';
await mongoose.connect(uri);
const db = mongoose.connection.db;

// 1. Add discipline to all quizzes missing it
const r1 = await db.collection('quizzes').updateMany(
  { discipline: { $exists: false } },
  { $set: { discipline: 'medicine' } }
);
console.log('Quizzes updated:', r1.modifiedCount, 'matched:', r1.matchedCount);

// 2. Publish unpublished quizzes (case quizzes were hardcoded unpublished)
const r2 = await db.collection('quizzes').updateMany(
  { published: false },
  { $set: { published: true } }
);
console.log('Quizzes published:', r2.modifiedCount);

// Verify
const quizzes = await db.collection('quizzes').find({}).toArray();
console.log('\nAfter fix:');
quizzes.forEach(q => console.log(
  (q.quizName || '(no name)').slice(0, 40),
  '| published:', q.published,
  '| discipline:', q.discipline
));

// Also check modules have discipline
const mods = await db.collection('modules').find({ discipline: { $exists: false } }).toArray();
console.log('\nModules still missing discipline:', mods.length);

await mongoose.disconnect();
