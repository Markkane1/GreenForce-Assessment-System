import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import errorMiddleware from './middlewares/errorMiddleware.js';
import antiCheatRoutes from './modules/antiCheat/antiCheat.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import examEngineRoutes from './modules/examEngine/examEngine.routes.js';
import gradingRoutes from './modules/grading/grading.routes.js';
import groupsRoutes from './modules/groups/groups.routes.js';
import questionDirectRoutes from './modules/questions/questions.direct.routes.js';
import questionsRoutes from './modules/questions/questions.routes.js';
import schedulesRoutes from './modules/schedules/schedules.routes.js';
import sectionDirectRoutes from './modules/sections/sections.direct.routes.js';
import sectionsRoutes from './modules/sections/sections.routes.js';
import testsRoutes from './modules/tests/tests.routes.js';
import usersRoutes from './modules/users/users.routes.js';

const app = express();

const buildAllowedOrigins = () => {
  const configuredOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
  const origins = new Set([configuredOrigin]);

  if (configuredOrigin.includes('localhost')) {
    origins.add(configuredOrigin.replace('localhost', '127.0.0.1'));
  }

  if (configuredOrigin.includes('127.0.0.1')) {
    origins.add(configuredOrigin.replace('127.0.0.1', 'localhost'));
  }

  return [...origins];
};

const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests',
  });
};

const corsOptions = {
  origin: buildAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  handler: rateLimitHandler,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  handler: rateLimitHandler,
});

const saveAnswerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  handler: rateLimitHandler,
});

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(globalLimiter);
app.use('/api/exam/save-answer', express.json({ limit: '50kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  }),
);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/tests', testsRoutes);
app.use('/api', sectionsRoutes);
app.use('/api', questionsRoutes);
app.use('/api/sections', sectionDirectRoutes);
app.use('/api/questions', questionDirectRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/exam/save-answer', saveAnswerLimiter);
app.use('/api/exam', examEngineRoutes);
app.use('/api/grading', gradingRoutes);
app.use('/api/proctor', antiCheatRoutes);

app.use(errorMiddleware);

export default app;
