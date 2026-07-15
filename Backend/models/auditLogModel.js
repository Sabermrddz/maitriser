import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  email: { type: String },
  action: { type: String, required: true },
  target: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  method: { type: String },
  path: { type: String },
  ip: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
