import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import store from '../db/index.js';

const router = express.Router();
router.use(authenticate);

const needLists = (res) => {
  if (typeof store.getBoard !== 'function') {
    res.status(501).json({ success: false, message: 'Lists require DB_ADAPTER=postgres' });
    return true;
  }
  return false;
};

// Whole board: lists with ordered tasks (single fetch for the UI)
router.get('/', async (req, res, next) => {
  try {
    if (needLists(res)) return;
    res.json({ success: true, lists: await store.getBoard(req.user.id) });
  } catch (e) { next(e); }
});

router.post('/', validate(schemas.listCreate), async (req, res, next) => {
  try {
    if (needLists(res)) return;
    const list = await store.createList({ userId: req.user.id, title: req.body.title });
    res.status(201).json({ success: true, list });
  } catch (e) { next(e); }
});

router.patch('/order', validate(schemas.listOrder), async (req, res, next) => {
  try {
    if (needLists(res)) return;
    const lists = await store.reorderLists(req.user.id, req.body.orderedIds);
    res.json({ success: true, lists });
  } catch (e) { next(e); }
});

router.patch('/:id', validate(schemas.listRename), async (req, res, next) => {
  try {
    if (needLists(res)) return;
    const list = await store.renameList(req.user.id, req.params.id, req.body.title);
    res.json({ success: true, list });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (needLists(res)) return;
    const list = await store.deleteList(req.user.id, req.params.id);
    res.json({ success: true, list });
  } catch (e) { next(e); }
});

export default router;
