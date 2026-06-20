import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { loadAccessibleProject } from './helpers.js';
import { resolveProviderConfig } from '../services/ai/resolve.js';
import { resolveProvider } from '../services/ai/index.js';

// Mounted at /api/projects/:projectId/complete
const router = Router({ mergeParams: true });
router.use(requireAuth);

const schema = z.object({
  language: z.string().max(40).optional(),
  prefix: z.string().max(8000),
  suffix: z.string().max(4000).optional(),
});

const SYSTEM =
  'You are an inline code completion engine inside an IDE. Given the code before ' +
  'and after the cursor, output ONLY the code that should be inserted at the cursor ' +
  'to continue it — no explanations, no markdown fences, no repetition of existing code. ' +
  'Prefer completing the current line or adding the next few lines. Keep it short.';

function stripFences(text: string): string {
  let t = text.replace(/^```[\w-]*\n?/, '').replace(/```\s*$/, '');
  // Cap to a few lines so suggestions stay inline-sized.
  const lines = t.split('\n');
  if (lines.length > 6) t = lines.slice(0, 6).join('\n');
  return t;
}

/** Tiny offline heuristic used when no real model is connected. */
function heuristic(prefix: string, language?: string): string {
  const line = prefix.split('\n').pop() ?? '';
  const trimmed = line.trimEnd();
  if (/\bconsole\.$/.test(trimmed)) return 'log()';
  if (language === 'python' && /^\s*(def |class )[^:]*$/.test(line)) return ':';
  if (trimmed.endsWith('(')) return ')';
  if (trimmed.endsWith('[')) return ']';
  return '';
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    await loadAccessibleProject(req);
    const { language, prefix, suffix = '' } = schema.parse(req.body);

    const config = await resolveProviderConfig(req.userId!);
    if (!config) {
      res.json({ completion: heuristic(prefix, language) });
      return;
    }

    const user =
      `Language: ${language ?? 'unknown'}\n` +
      `Insert code at <CURSOR>. Output only the insertion.\n\n` +
      `${prefix}<CURSOR>${suffix}`;

    let completion = '';
    try {
      completion = await resolveProvider(config).completeText({ system: SYSTEM, user, maxTokens: 96 });
    } catch {
      completion = '';
    }
    res.json({ completion: stripFences(completion) });
  }),
);

export default router;
