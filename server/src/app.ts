import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import fileRoutes from './routes/files.js';
import chatRoutes from './routes/chat.js';
import completeRoutes from './routes/complete.js';
import catalogRoutes from './routes/catalog.js';
import aiRoutes from './routes/ai.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, aiProvider: env.ai.provider, time: new Date().toISOString() }),
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/templates', catalogRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/projects', projectRoutes);
  // Nested resources reuse :projectId from the parent path.
  app.use('/api/projects/:projectId/files', fileRoutes);
  app.use('/api/projects/:projectId/chat', chatRoutes);
  app.use('/api/projects/:projectId/complete', completeRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
