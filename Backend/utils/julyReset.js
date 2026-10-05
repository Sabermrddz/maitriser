import User from '../models/userModel.js';
import AppConfig from '../models/appConfigModel.js';
import { logger } from './logger.js';

const RESET_MONTH = 6; // July (0-indexed)
const RESET_DAY = 20;

// July 20 of the current year, or of the previous year if July 20 has already passed
export const getMostRecentJuly20 = (now = new Date()) => {
  const year = now.getMonth() > RESET_MONTH || (now.getMonth() === RESET_MONTH && now.getDate() >= RESET_DAY)
    ? now.getFullYear()
    : now.getFullYear() - 1;
  return new Date(year, RESET_MONTH, RESET_DAY);
};

// July 20 of this year if still upcoming, otherwise July 20 of next year
export const getNextJuly20 = (now = new Date()) => {
  const thisYear = new Date(now.getFullYear(), RESET_MONTH, RESET_DAY);
  return now < thisYear ? thisYear : new Date(now.getFullYear() + 1, RESET_MONTH, RESET_DAY);
};

// Expires every active subscription once per year, on July 20.
// Guarded by the AppConfig flag `subsResetYear` so it runs exactly once per year.
export const runJulyResetIfNeeded = async (now = new Date()) => {
  const targetYear = getMostRecentJuly20(now).getFullYear();

  const cfg = await AppConfig.findOne({ key: 'subsResetYear' });
  if (cfg && typeof cfg.value === 'number' && cfg.value >= targetYear) return 0;

  const result = await User.updateMany(
    { 'subscription.status': 'active' },
    { $set: { 'subscription.status': 'expired' } },
  );

  await AppConfig.findOneAndUpdate(
    { key: 'subsResetYear' },
    { $set: { value: targetYear } },
    { upsert: true },
  );

  logger.info({ year: targetYear, count: result.modifiedCount }, 'July 20 reset: active subscriptions expired');
  return result.modifiedCount;
};
