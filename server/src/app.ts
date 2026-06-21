import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import fileRoutes from './routes/files.js';
import chatRoutes from './routes/chat.js';
import completeRoutes from './routes/complete.js';
import catalogRoutes from './routes/catalog.js';
import aiRoutes from './routes/ai.js';
import sessionRoutes from './routes/sessions.js';

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
  app.use('/api/sessions', sessionRoutes);

  // Unknown /api routes return a JSON 404 (handled before the SPA fallback below).
  app.use('/api', notFoundHandler);

  // In production (single-container / Cloud Run) the server also serves the built
  // client. CLIENT_DIST can override the location; otherwise default to ../../client/dist
  // relative to this compiled file (server/dist/app.js → repo/client/dist).
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = process.env.CLIENT_DIST ?? path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist));
    // SPA fallback: any non-API GET serves index.html so client-side routing works.
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
