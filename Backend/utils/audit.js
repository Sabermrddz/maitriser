import AuditLog from '../models/auditLogModel.js';
import { logger } from './logger.js';

export async function recordAudit({
  userId, email, action, target, details, method, path, ip, userAgent,
}) {
  try {
    await AuditLog.create({
      userId, email, action, target, details, method, path, ip, userAgent,
    });
  } catch (err) {
    logger.error({ err }, 'recordAudit failed');
  }
}

// Logs admin create/update/delete mutations. Intended to sit behind verifyToken + requireAdmin.
export const auditMutations = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  recordAudit({
    userId: req.user?.userId || req.user?.id,
    email: req.user?.email,
    action: `${req.method} ${req.originalUrl}`,
    target: req.originalUrl,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get?.('user-agent'),
  });
  next();
};
