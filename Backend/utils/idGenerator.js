import Counter from '../models/counterModel.js';
import User from '../models/userModel.js';

const pad = (num, len = 3) => String(num).padStart(len, '0');

export const generateId = async (prefix) => {
  const seq = await Counter.getNextSequence(prefix);
  return `${prefix}${pad(seq)}`;
};

export const genQuizId = () => generateId('Q');
export const genExamId = () => generateId('VE');
export const genUserId = async () => {
  for (let i = 0; i < 100; i++) {
    const id = await generateId('USR');
    const exists = await User.findOne({ userId: id });
    if (!exists) return id;
  }
  throw new Error('Failed to generate unique userId after 100 attempts');
};
