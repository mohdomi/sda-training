import express from 'express';
import store from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try { res.json({ success: true, tasks: await store.listTasks(req.user.id) }); }
  catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description, priority, status } = req.body || {};
    if (!title) return res.status(400).json({ success: false, message: 'title required' });
    const task = await store.createTask({ userId: req.user.id, title, description, priority, status });
    req.app.get('io')?.to(`user:${req.user.id}`).emit('task:created', task);
    res.status(201).json({ success: true, task });
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const task = await store.updateTask(req.user.id, req.params.id, req.body || {});
    req.app.get('io')?.to(`user:${req.user.id}`).emit('task:updated', task);
    res.json({ success: true, task });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const task = await store.deleteTask(req.user.id, req.params.id);
    res.json({ success: true, task });
  } catch (e) { next(e); }
});

export default router;
