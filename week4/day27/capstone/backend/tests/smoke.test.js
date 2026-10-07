import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import * as ai from '../src/services/aiService.js';
import * as cache from '../src/cache.js';
import FileStore from '../src/db/fileStore.js';

after(async () => { await cache.close(); });

describe('capstone smoke', () => {
  test('aiService exports chat fn', () => {
    assert.equal(typeof ai.chat, 'function');
  });
  test('fileStore CRUD', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-'));
    const s = new FileStore(dir);
    const u = await s.createUser({ name: 'T', email: 't@t.com', passwordHash: 'x' });
    const t = await s.createTask({ userId: u.id, title: 'hello' });
    assert.equal((await s.listTasks(u.id)).length, 1);
    await s.updateTask(u.id, t.id, { status: 'done' });
    await s.deleteTask(u.id, t.id);
    assert.equal((await s.listTasks(u.id)).length, 0);
  });
});
