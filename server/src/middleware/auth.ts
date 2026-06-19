import type { Request, Response, NextFunction } from 'express';
import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';
import { unauthorized } from '../utils/http.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const fromCookie = req.cookies?.[COOKIE_NAME];
  const fromHeader = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = fromCookie || fromHeader;

  if (!token) return next(unauthorized('Authentication required'));

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    next(unauthorized('Invalid or expired session'));
  }
}
