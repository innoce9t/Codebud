import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken, COOKIE_NAME } from '../utils/jwt.js';
import { asyncHandler, unauthorized } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { isProd } from '../config/env.js';

const router = Router();

const credsSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { name, email, password } = credsSchema.parse(req.body);
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ name: name || email.split('@')[0], email, passwordHash });
    const token = signToken({ sub: user.id, email: user.email });
    res.cookie(COOKIE_NAME, token, cookieOpts);
    res.status(201).json({ user, token });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = credsSchema.parse(req.body);
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw unauthorized('Invalid email or password');
    }
    const token = signToken({ sub: user.id, email: user.email });
    res.cookie(COOKIE_NAME, token, cookieOpts);
    res.json({ user, token });
  }),
);

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) throw unauthorized();
    res.json({ user });
  }),
);

export default router;
