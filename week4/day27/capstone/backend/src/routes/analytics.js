import express from 'express';
import { authenticate } from '../middleware/auth.js';
import store from '../db/index.js';

const router = express.Router();
router.use(authenticate);

// GET /api/analytics/overview?range=7d|30d — user-scoped, empty-safe
router.get('/overview', async (req, res, next) => {
  try {
    const range = req.query.range === '7d' ? 7 : 30;
    if (typeof store.getAnalytics !== 'function') {
      return res.status(501).json({ success: false, message: 'Analytics requires a supporting store' });
    }
    const data = await store.getAnalytics(req.user.id, range);
    res.json({ success: true, range: `${range}d`, ...data });
  } catch (e) { next(e); }
});

export default router;
