import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { logger } from './utils/logger.js';
import app from './app.js';
import { initWS } from './ws.js';
import { generateId } from './utils/idGenerator.js';
import VoiceExam from './models/voiceExamModel.js';
import Counter from './models/counterModel.js';

dotenv.config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.fatal('JWT_SECRET must be at least 32 characters'); process.exit(1);
}
if (!process.env.MONGODB_URI) {
  logger.fatal('MONGODB_URI is not set'); process.exit(1);
}
if (!process.env.CLERK_SECRET_KEY) {
  logger.warn('CLERK_SECRET_KEY is not set — Clerk auth will fail');
}
if (!process.env.ADMIN_SECRET_CODE || process.env.ADMIN_SECRET_CODE.length < 16) {
  logger.warn('ADMIN_SECRET_CODE must be at least 16 characters — admin claim will reject weak codes');
}

const migrateIds = async () => {
  const examsWithoutId = await VoiceExam.find({ examId: { $exists: false } }).cursor();
  let examCount = 0;
  for await (const exam of examsWithoutId) {
    exam.examId = await generateId('VE');
    await exam.save();
    examCount++;
  }
  if (examCount) logger.info({ count: examCount }, 'Migrated voice exams with auto-generated examId');
};

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
})
  .then(async () => {
    logger.info('Database connected');
    await Counter.init();
    await migrateIds();
  })
  .catch((err) => { logger.fatal({ err }, 'Database connection failed'); process.exit(1); });

const PORT = process.env.PORT || 4000;
let server;

const gracefulShutdown = (exitCode = 0) => {
  if (server) {
    server.close(() => {
      mongoose.connection.close(false).then(() => {
        logger.info('Server and DB connections closed');
        process.exit(exitCode);
      });
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(exitCode);
    }, 10000);
  } else {
    process.exit(exitCode);
  }
};

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  gracefulShutdown(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason instanceof Error ? reason : new Error(String(reason)) }, 'Unhandled rejection — shutting down');
  gracefulShutdown(1);
});

process.on('SIGTERM', () => { logger.info('SIGTERM received — shutting down'); gracefulShutdown(0); });
process.on('SIGINT', () => { logger.info('SIGINT received — shutting down'); gracefulShutdown(0); });

server = app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, `Server running at http://0.0.0.0:${PORT}`);
  initWS(server);
});
