import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import store from '../db/index.js';

const router = express.Router();
router.use(authenticate);

function publicProfile(user) {
  return {
    id: user.id, name: user.name, email: user.email, role: user.role,
    provider: user.provider, avatar: user.avatar, preferences: user.preferences || {},
    createdAt: user.createdAt || user.created_at,
  };
}

// Full profile (heavier than /api/auth/me)
router.get('/me', async (req, res, next) => {
  try {
    const user = await store.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: publicProfile(user) });
  } catch (e) { next(e); }
});

// Partial preferences update (deep-merges notifications server-side)
router.patch('/me/preferences', validate(schemas.preferences), async (req, res, next) => {
  try {
    if (typeof store.updatePreferences !== 'function') {
      return res.status(501).json({ success: false, message: 'Preferences require a supporting store' });
    }
    const user = await store.updatePreferences(req.user.id, req.body);
    res.json({ success: true, preferences: user.preferences || {} });
  } catch (e) { next(e); }
});

export default router;
