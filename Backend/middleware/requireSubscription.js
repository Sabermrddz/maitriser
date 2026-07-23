import User from '../models/userModel.js';
import Plan from '../models/planModel.js';

export async function checkSubscription(userId) {
  const user = await User.findById(userId).select('subscription discipline year');
  if (!user) return false;
  if (!user.subscription || user.subscription.status !== 'active') return false;
  if (user.subscription.endDate && new Date(user.subscription.endDate) < new Date()) return false;

  if (user.subscription.planId) {
    const plan = await Plan.findById(user.subscription.planId);
    if (!plan || plan.discipline !== user.discipline) return false;
  }

  return true;
}
