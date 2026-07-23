import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { httpLogger, logger } from './utils/logger.js';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import userRoutes from './routes/userRoutes.js';
import moduleRoutes from './routes/moduleRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import signupRoute from './routes/signupRoute.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import quizResultRoutes from './routes/quizResultRoutes.js';
import authRoutes from './routes/authRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import voiceExamRoutes from './routes/voiceExamRoutes.js';
import bookmarkRoutes from './routes/bookmarkRoutes.js';
import userAuthRoutes from './routes/userAuthRoutes.js';
import emailAuthRoutes from './routes/emailAuthRoutes.js';
import clerkRoutes from './routes/clerkRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import pdfDocumentRoutes from './routes/pdfDocumentRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import planRoutes from './routes/planRoutes.js';
import dailyQuizRoutes from './routes/dailyQuizRoutes.js';

import { verifyToken, requireAdmin } from './controllers/authController.js';
import { auditMutations } from './utils/audit.js';

const app = express();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',').map((o) => o.trim());

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
}));
app.use(compression());
app.use(httpLogger);

// Block non-browser (no Origin) unsafe methods before CORS + Private Network Access header
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (!req.headers.origin && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return res.status(403).json({ message: 'Origin header required for this method' });
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));

// Catch-all OPTIONS: handle preflight for rejected origins (cors ends response for allowed origins, rejected origins fall through)
app.options('*', (req, res) => res.status(204).end());

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 60 * 1000, max: 1000,
  message: { message: 'Too many requests, slow down.' },
  standardHeaders: true, legacyHeaders: false,
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  message: { message: 'Too many attempts, please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
const submitLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20,
  message: { message: 'Too many submissions, slow down.' },
});
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { message: 'Too many messages, please try again later.' },
});
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { message: 'Too many feedback submissions, please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

app.use(['/api/users/login', '/api/users/register', '/api/user/logging', '/api/user/register', '/api/admin/claim'], authLimiter);
app.use(['/api/quizzes', '/api/voice-exams'], (req, res, next) => {
  if (req.method === 'POST' && /\/(submit|submit-station)$/.test(req.path)) return submitLimiter(req, res, next);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const userLimiter = rateLimit({
  windowMs: 60 * 1000, max: 300,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { message: 'Too many requests, slow down.' },
});

app.use('/api/user', signupRoute);
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api', userAuthRoutes);
app.use('/api', planRoutes);
app.use('/api', dailyQuizRoutes);
app.use('/api/auth', emailAuthRoutes);
app.use('/api/auth', clerkRoutes);
app.use('/api', adminRoutes);

app.use('/api', verifyToken, userLimiter, quizRoutes);
app.use('/api', verifyToken, userLimiter, quizResultRoutes);
app.use('/api', verifyToken, userLimiter, voiceExamRoutes);
app.use('/api', verifyToken, userLimiter, moduleRoutes);
app.use('/api', verifyToken, userLimiter, bookmarkRoutes);
app.use('/api/feedback', verifyToken, userLimiter, feedbackLimiter, feedbackRoutes);

app.use('/api', verifyToken, auditMutations, userRoutes);
app.use('/api', verifyToken, auditMutations, dashboardRoutes);
app.use('/api', pdfDocumentRoutes);
app.use('/api', imageRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((err, req, res, next) => {
  logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled error');
  const status = err.status || err.statusCode || 500;
  const message = status >= 500 ? 'Internal server error' : err.message || 'Error';
  res.status(status).json({ message });
});

export default app;
