import TokenBlacklist from '../models/tokenBlacklistModel.js';

export const addToBlacklist = async (token, expiresAt) => {
  try {
    await TokenBlacklist.create({ token, expiresAt: new Date(expiresAt) });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
};

export const isBlacklisted = async (token) => {
  const found = await TokenBlacklist.findOne({ token }).lean();
  return !!found;
};
