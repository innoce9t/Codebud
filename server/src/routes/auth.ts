import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { File } from '../models/File.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { ProviderKey } from '../models/ProviderKey.js';
import { signToken, COOKIE_NAME } from '../utils/jwt.js';
import { asyncHandler, unauthorized, HttpError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = Router();

const credsSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const cookieOpts = {
  httpOnly: true,
  secure: env.cookieSecure,
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

const prefsSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  subscriptionTier: z.enum(['free', 'pro', 'team']).optional(),
  billing: z
    .object({
      cardBrand: z.string().max(20),
      cardLast4: z.string().max(4),
    })
    .optional(),
  preferences: z
    .object({
      language: z.string().max(10).optional(),
      timezone: z.string().max(64).optional(),
      theme: z
        .object({
          mode: z.enum(['light', 'dark', 'system']).optional(),
          accent: z.string().max(20).optional(),
        })
        .optional(),
      editor: z
        .object({
          fontSize: z.number().int().min(10).max(24).optional(),
          tabSize: z.number().int().min(2).max(8).optional(),
          wordWrap: z.boolean().optional(),
          minimap: z.boolean().optional(),
          aiCompletions: z.boolean().optional(),
        })
        .optional(),
      keybindings: z
        .object({
          run: z.string().max(40).optional(),
          save: z.string().max(40).optional(),
          toggleOutput: z.string().max(40).optional(),
          focusChat: z.string().max(40).optional(),
          nextFile: z.string().max(40).optional(),
          prevFile: z.string().max(40).optional(),
        })
        .optional(),
      notifications: z
        .object({
          productUpdates: z.boolean().optional(),
          projectActivity: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

// Update profile / preferences (deep-merges nested preference objects).
router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const patch = prefsSchema.parse(req.body);
    const user = await User.findById(req.userId);
    if (!user) throw unauthorized();

    if (patch.name !== undefined) user.name = patch.name;
    if (patch.subscriptionTier !== undefined) user.subscriptionTier = patch.subscriptionTier;
    if (patch.billing) {
      user.billing.cardBrand = patch.billing.cardBrand;
      user.billing.cardLast4 = patch.billing.cardLast4;
    }
    if (patch.preferences) {
      const p = patch.preferences;
      if (p.language !== undefined) user.preferences.language = p.language;
      if (p.timezone !== undefined) user.preferences.timezone = p.timezone;
      if (p.theme) Object.assign(user.preferences.theme, p.theme);
      if (p.editor) Object.assign(user.preferences.editor, p.editor);
      if (p.keybindings) Object.assign(user.preferences.keybindings, p.keybindings);
      if (p.notifications) Object.assign(user.preferences.notifications, p.notifications);
    }
    await user.save();
    res.json({ user });
  }),
);

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// Change password (verifies the current one first).
router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = passwordSchema.parse(req.body);
    const user = await User.findById(req.userId);
    if (!user) throw unauthorized();
    if (!(await user.comparePassword(currentPassword))) {
      throw new HttpError(400, 'Current password is incorrect');
    }
    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();
    res.json({ ok: true });
  }),
);

// Export all of the user's projects (files + chat) as JSON.
router.get(
  '/export',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projects = await Project.find({ owner: req.userId }).sort({ createdAt: 1 });
    const data = await Promise.all(
      projects.map(async (p) => {
        const [files, chat] = await Promise.all([
          File.find({ project: p._id }).sort({ path: 1 }),
          ChatMessage.find({ project: p._id }).sort({ createdAt: 1 }),
        ]);
        return {
          name: p.name,
          type: p.type,
          description: p.description,
          createdAt: p.get('createdAt'),
          files: files.map((f) => ({ path: f.path, content: f.content })),
          chat: chat.map((c) => ({ role: c.role, content: c.content, createdAt: c.get('createdAt') })),
        };
      }),
    );
    res.json({
      exportedAt: new Date().toISOString(),
      email: req.userEmail,
      projectCount: data.length,
      projects: data,
    });
  }),
);

// Delete the account and all of its data.
router.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projects = await Project.find({ owner: req.userId }).select('_id');
    const projectIds = projects.map((p) => p._id);
    await Promise.all([
      File.deleteMany({ project: { $in: projectIds } }),
      ChatMessage.deleteMany({ project: { $in: projectIds } }),
      Project.deleteMany({ owner: req.userId }),
      ProviderKey.deleteMany({ user: req.userId }),
      User.deleteOne({ _id: req.userId }),
    ]);
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
  }),
);

export default router;
