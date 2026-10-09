// Postgres integration: runs against POSTGRES_URL, skips cleanly if unreachable.
// Covers the 7 store methods + refresh family + AI log on the real schema.
import { test, describe } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const url = process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/sda_capstone';

describe('postgres store', () => {
  test('CRUD + refresh + ai_log (skip if no PG)', async (t) => {
    let pg;
    try {
      pg = await import('pg');
    } catch {
      t.skip('pg module missing');
      return;
    }
    const probe = new pg.default.Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
    try {
      await probe.query('SELECT 1 FROM users LIMIT 1');
    } catch (e) {
      await probe.end().catch(() => {});
      t.skip(`no postgres/migrations: ${e.message}`);
      return;
    }
    await probe.end().catch(() => {});

    const { default: PostgresStore } = await import('../src/db/postgres.js');
    const s = new PostgresStore(url);
    const email = `pgtest-${Date.now()}@capstone.dev`;
    const u = await s.createUser({ name: 'PG', email, passwordHash: 'x' });
    assert.ok(u.id);
    assert.equal((await s.findUserByEmail(email)).id, u.id);
    const task = await s.createTask({ userId: u.id, title: 'pg hello' });
    assert.equal((await s.listTasks(u.id)).length, 1);
    await s.updateTask(u.id, task.id, { status: 'done' });
    await s.saveRefreshToken({ userId: u.id, familyId: u.id, tokenHash: `h-${Date.now()}`, expiresAt: new Date(Date.now() + 60000) });
    await s.logAI({ userId: u.id, model: 'test', request: { q: 1 }, response: 'ok', latencyMs: 1 });
    await s.deleteTask(u.id, task.id);
    assert.equal((await s.listTasks(u.id)).length, 0);
    await s.pool.query('DELETE FROM refresh_tokens WHERE user_id=$1', [u.id]);
    await s.pool.query('DELETE FROM ai_logs WHERE user_id=$1', [u.id]);
    await s.pool.query('DELETE FROM users WHERE id=$1', [u.id]);
    await s.close();
  });

  test('getAnalytics shape (skip if no PG)', async (t) => {
    let pg;
    try {
      pg = await import('pg');
    } catch {
      t.skip('pg module missing');
      return;
    }
    const probe = new pg.default.Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
    try {
      await probe.query('SELECT 1 FROM ai_logs LIMIT 1');
    } catch (e) {
      await probe.end().catch(() => {});
      t.skip(`no postgres/migrations: ${e.message}`);
      return;
    }
    await probe.end().catch(() => {});

    const { default: PostgresStore } = await import('../src/db/postgres.js');
    const s = new PostgresStore(url);
    const email = `pgana-${Date.now()}@capstone.dev`;
    const u = await s.createUser({ name: 'ANA', email, passwordHash: 'x' });
    await s.createTask({ userId: u.id, title: 't1', status: 'done', priority: 'high' });
    await s.createTask({ userId: u.id, title: 't2', status: 'todo', priority: 'low' });
    await s.logAI({ userId: u.id, endpoint: 'chat', model: 'm1', request: {}, response: 'r', latencyMs: 100, mocked: false });
    await s.logAI({ userId: u.id, endpoint: 'summarize', model: 'm1', request: {}, response: 'r', latencyMs: 300, mocked: true });
    const a = await s.getAnalytics(u.id, 30);
    assert.equal(a.tasks.total, 2);
    assert.equal(a.tasks.by_status.done, 1);
    assert.equal(a.tasks.completion_rate, 50);
    assert.equal(a.ai.total, 2);
    assert.equal(a.ai.mocked_ratio, 50);
    assert.equal(a.ai.by_endpoint.length, 2);
    assert.equal(a.ai.per_day.length, 30);
    assert.equal(a.tasks.per_day.length, 30);
    await s.pool.query('DELETE FROM ai_logs WHERE user_id=$1', [u.id]);
    await s.pool.query('DELETE FROM tasks WHERE user_id=$1', [u.id]);
    await s.pool.query('DELETE FROM users WHERE id=$1', [u.id]);
    await s.close();
  });

  test('lists + move + reorder (skip if no PG)', async (t) => {
    let pg;
    try {
      pg = await import('pg');
    } catch {
      t.skip('pg module missing');
      return;
    }
    const probe = new pg.default.Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
    try {
      await probe.query('SELECT 1 FROM task_lists LIMIT 1');
    } catch (e) {
      await probe.end().catch(() => {});
      t.skip(`no postgres/migrations: ${e.message}`);
      return;
    }
    await probe.end().catch(() => {});

    const { default: PostgresStore } = await import('../src/db/postgres.js');
    const s = new PostgresStore(url);
    const email = `pglist-${Date.now()}@capstone.dev`;
    const u = await s.createUser({ name: 'LST', email, passwordHash: 'x' });
    // fresh user gets a default list via getBoard
    let board = await s.getBoard(u.id);
    assert.equal(board.length, 1);
    assert.equal(board[0].title, 'My Tasks');
    const other = await s.createList({ userId: u.id, title: 'Today' });
    const t1 = await s.createTask({ userId: u.id, title: 'moveme' });
    assert.equal(t1.listId, board[0].id); // defaults to first list
    const explicit = await s.createTask({ userId: u.id, listId: other.id, title: 'explicit-list' });
    assert.equal(explicit.listId, other.id); // explicit listId honored
    await s.deleteTask(u.id, explicit.id);
    // move across lists with explicit rank
    const moved = await s.updateTask(u.id, t1.id, { listId: other.id, position: 512 });
    assert.equal(moved.listId, other.id);
    assert.equal(moved.position, 512);
    board = await s.getBoard(u.id);
    assert.equal(board.find((l) => l.id === board[0].id)?.tasks.length, 0);
    assert.equal(board.find((l) => l.id === other.id)?.tasks.length, 1);
    // reorder lists
    const reordered = await s.reorderLists(u.id, [other.id, board[0].id]);
    assert.deepEqual(reordered.map((l) => l.id), [other.id, board[0].id]);
    // rename + last-list guard
    await s.renameList(u.id, other.id, 'Renamed');
    await assert.rejects(() => s.reorderLists(u.id, [other.id]), /exactly your lists/);
    await s.deleteList(u.id, other.id);
    await assert.rejects(() => s.deleteList(u.id, board[0].id), /last list/);
    // foreign list isolation
    const u2 = await s.createUser({ name: 'L2', email: `pglist2-${Date.now()}@capstone.dev`, passwordHash: 'x' });
    await assert.rejects(() => s.updateTask(u2.id, t1.id, { listId: other.id }), /Task not found|List not found/);
    await s.pool.query('DELETE FROM tasks WHERE user_id IN ($1,$2)', [u.id, u2.id]);
    await s.pool.query('DELETE FROM task_lists WHERE user_id IN ($1,$2)', [u.id, u2.id]);
    await s.pool.query('DELETE FROM users WHERE id IN ($1,$2)', [u.id, u2.id]);
    await s.close();
  });

  test('redis get/set (+memory fallback)', async () => {
    const cache = await import('../src/cache.js');
    await cache.set('cap:test', { a: 1 }, 10);
    assert.deepEqual(await cache.get('cap:test'), { a: 1 });
    await cache.del('cap:test');
    await cache.close();
  });
});
