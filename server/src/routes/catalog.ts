import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { templateCatalog } from './templates.js';

const router = Router();

// Template metadata for the "New project" picker (no file contents).
router.get('/', requireAuth, (_req, res) => {
  res.json({ templates: templateCatalog() });
});

export default router;
