import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/http.js';
import { ZodError } from 'zod';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Duplicate key (e.g. unique email / file path)
  if (typeof err === 'object' && err && (err as { code?: number }).code === 11000) {
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
