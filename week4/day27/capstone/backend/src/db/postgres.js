// Postgres-only primary store. Same 7 methods as FileStore so routes stay untouched,
// plus refresh-token family + AI log helpers for Phase 2 auth.
import pg from 'pg';

const url = () => process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/sda_capstone';

function mapUser(r) {
  if (!r) return null;
  return {
    id: r.id, name: r.name, email: r.email, passwordHash: r.password_hash,
    role: r.role, provider: r.provider, providerId: r.provider_id, avatar: r.avatar,
    isActive: r.is_active, preferences: r.preferences, createdAt: r.created_at,
  };
}

function mapList(r) {
  if (!r) return null;
  return {
    id: r.id, userId: r.user_id, title: r.title, position: Number(r.position),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function mapTask(r) {
  if (!r) return null;
  return {
    id: r.id, userId: r.user_id, listId: r.list_id, position: Number(r.position ?? 0),
    title: r.title, description: r.description,
    priority: r.priority, status: r.status, aiSummary: r.ai_summary,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export default class PostgresStore {
  constructor(connectionString) {
    this.pool = new pg.Pool({
      connectionString: connectionString || url(),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    this.pool.on('error', (e) => console.error('pg pool error', e.message));
  }

  async ping() {
    const r = await this.pool.query('SELECT NOW() as now');
    return r.rows[0];
  }

  async close() {
    await this.pool.end();
  }

  // ---- users (same shape as FileStore) ----
  async createUser({ name, email, passwordHash, role = 'user', provider = 'local', providerId = null, avatar = null }) {
    try {
      const r = await this.pool.query(
        `INSERT INTO users(name,email,password_hash,role,provider,provider_id,avatar)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [name, String(email).toLowerCase(), passwordHash || null, role, provider, providerId, avatar],
      );
      return mapUser(r.rows[0]);
    } catch (e) {
      if (e.code === '23505') { const err = new Error('User already exists'); err.status = 400; throw err; }
      throw e;
    }
  }

  async findUserByEmail(email) {
    const r = await this.pool.query('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
    return mapUser(r.rows[0] || null);
  }

  async findUserById(id) {
    const r = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return mapUser(r.rows[0] || null);
  }

  async linkProvider(userId, provider, providerId) {
    const r = await this.pool.query(
      'UPDATE users SET provider=$2, provider_id=$3, updated_at=now() WHERE id=$1 RETURNING *',
      [userId, provider, providerId],
    );
    return mapUser(r.rows[0] || null);
  }

  async updatePreferences(userId, patch) {
    const cur = await this.pool.query('SELECT preferences FROM users WHERE id=$1', [userId]);
    if (!cur.rows[0]) { const e = new Error('User not found'); e.status = 404; throw e; }
    const merged = {
      ...cur.rows[0].preferences,
      ...patch,
      notifications: { ...(cur.rows[0].preferences?.notifications || {}), ...(patch.notifications || {}) },
    };
    const r = await this.pool.query(
      'UPDATE users SET preferences=$2, updated_at=now() WHERE id=$1 RETURNING *',
      [userId, JSON.stringify(merged)],
    );
    return mapUser(r.rows[0]);
  }

  // ---- tasks ----
  async _defaultListId(userId) {
    const r = await this.pool.query(
      'SELECT id FROM task_lists WHERE user_id=$1 ORDER BY position LIMIT 1', [userId]);
    if (r.rows[0]) return r.rows[0].id;
    const c = await this.pool.query(
      `INSERT INTO task_lists(user_id,title,position) VALUES($1,'My Tasks',1024) RETURNING id`, [userId]);
    return c.rows[0].id;
  }

  async createTask({ userId, listId = null, title, description = '', priority = 'medium', status = 'todo' }) {
    const lid = listId || await this._defaultListId(userId);
    // ensure the list belongs to the user
    const own = await this.pool.query('SELECT id FROM task_lists WHERE id=$1 AND user_id=$2', [lid, userId]);
    if (!own.rows[0]) { const e = new Error('List not found'); e.status = 404; throw e; }
    const m = await this.pool.query(
      'SELECT COALESCE(MAX(position),0) AS mx FROM tasks WHERE list_id=$1', [lid]);
    const r = await this.pool.query(
      `INSERT INTO tasks(user_id,list_id,position,title,description,priority,status)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [userId, lid, Number(m.rows[0].mx) + 1024, title, description, priority, status],
    );
    return mapTask(r.rows[0]);
  }

  // Whole board in list→task position order (single call for the UI).
  async getBoard(userId) {
    await this._defaultListId(userId); // first run: ensure "My Tasks"
    const lists = await this.pool.query(
      'SELECT * FROM task_lists WHERE user_id=$1 ORDER BY position', [userId]);
    const tasks = await this.pool.query(
      `SELECT t.* FROM tasks t
       JOIN task_lists l ON l.id = t.list_id
       WHERE t.user_id=$1 ORDER BY l.position, t.position`,
      [userId]);
    // legacy tasks with NULL list_id (pre-backfill clients): attach to first list
    const unlisted = await this.pool.query(
      'SELECT * FROM tasks WHERE user_id=$1 AND list_id IS NULL ORDER BY created_at DESC', [userId]);
    const mapped = lists.rows.map(mapList);
    const byList = new Map(mapped.map((l) => [l.id, []]));
    for (const t of tasks.rows) {
      const arr = byList.get(t.list_id);
      if (arr) arr.push(mapTask(t));
    }
    if (unlisted.rows.length && mapped.length) {
      byList.get(mapped[0].id).unshift(...unlisted.rows.map(mapTask));
    }
    return mapped.map((l) => ({ ...l, tasks: byList.get(l.id) }));
  }

  async listTasks(userId) {
    const r = await this.pool.query('SELECT * FROM tasks WHERE user_id=$1 ORDER BY created_at DESC', [userId]);
    return r.rows.map(mapTask);
  }

  async updateTask(userId, id, patch) {
    const allowed = ['title', 'description', 'priority', 'status', 'aiSummary', 'listId', 'position'];
    const sets = [];
    const vals = [];
    // moving across lists: verify destination belongs to the user
    if (patch.listId !== undefined) {
      const own = await this.pool.query('SELECT id FROM task_lists WHERE id=$1 AND user_id=$2', [patch.listId, userId]);
      if (!own.rows[0]) { const e = new Error('List not found'); e.status = 404; throw e; }
    }
    for (const k of allowed) {
      if (patch[k] !== undefined) {
        const col = k === 'aiSummary' ? 'ai_summary' : k === 'listId' ? 'list_id' : k;
        vals.push(k === 'position' ? Number(patch[k]) : patch[k]);
        sets.push(`${col}=$${vals.length}`);
      }
    }
    if (!sets.length) { const e = new Error('No fields to update'); e.status = 400; throw e; }
    vals.push(id, userId);
    const r = await this.pool.query(
      `UPDATE tasks SET ${sets.join(', ')}, updated_at=now() WHERE id=$${vals.length - 1} AND user_id=$${vals.length} RETURNING *`,
      vals,
    );
    if (!r.rows[0]) { const e = new Error('Task not found'); e.status = 404; throw e; }
    return mapTask(r.rows[0]);
  }

  async deleteTask(userId, id) {
    const r = await this.pool.query('DELETE FROM tasks WHERE id=$1 AND user_id=$2 RETURNING *', [id, userId]);
    if (!r.rows[0]) { const e = new Error('Task not found'); e.status = 404; throw e; }
    return mapTask(r.rows[0]);
  }

  // ---- task lists ----
  async createList({ userId, title }) {
    const m = await this.pool.query(
      'SELECT COALESCE(MAX(position),0) AS mx FROM task_lists WHERE user_id=$1', [userId]);
    const r = await this.pool.query(
      `INSERT INTO task_lists(user_id,title,position) VALUES($1,$2,$3) RETURNING *`,
      [userId, title, Number(m.rows[0].mx) + 1024],
    );
    return { ...mapList(r.rows[0]), tasks: [] };
  }

  async renameList(userId, id, title) {
    const r = await this.pool.query(
      `UPDATE task_lists SET title=$3, updated_at=now()
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, userId, title],
    );
    if (!r.rows[0]) { const e = new Error('List not found'); e.status = 404; throw e; }
    return mapList(r.rows[0]);
  }

  async deleteList(userId, id) {
    const left = await this.pool.query('SELECT COUNT(*)::int AS n FROM task_lists WHERE user_id=$1', [userId]);
    if (left.rows[0].n <= 1) {
      const e = new Error('Cannot delete your last list');
      e.status = 400;
      throw e;
    }
    const r = await this.pool.query(
      'DELETE FROM task_lists WHERE id=$1 AND user_id=$2 RETURNING *', [id, userId]);
    if (!r.rows[0]) { const e = new Error('List not found'); e.status = 404; throw e; }
    return mapList(r.rows[0]);
  }

  async reorderLists(userId, orderedIds) {
    if (!Array.isArray(orderedIds) || !orderedIds.length) {
      const e = new Error('orderedIds must be a non-empty array');
      e.status = 400;
      throw e;
    }
    const own = await this.pool.query('SELECT id FROM task_lists WHERE user_id=$1', [userId]);
    const ownIds = new Set(own.rows.map((r) => r.id));
    if (orderedIds.length !== ownIds.size || !orderedIds.every((id) => ownIds.has(id))) {
      const e = new Error('orderedIds must contain exactly your lists');
      e.status = 400;
      throw e;
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      let pos = 1024;
      for (const id of orderedIds) {
        await client.query('UPDATE task_lists SET position=$2 WHERE id=$1', [id, pos]);
        pos += 1024;
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    const r = await this.pool.query(
      'SELECT * FROM task_lists WHERE user_id=$1 ORDER BY position', [userId]);
    return r.rows.map(mapList);
  }

  // ---- refresh token families ----
  async saveRefreshToken({ userId, familyId, tokenHash, expiresAt }) {
    await this.pool.query(
      'INSERT INTO refresh_tokens(user_id,family_id,token_hash,expires_at) VALUES($1,$2,$3,$4)',
      [userId, familyId, tokenHash, expiresAt],
    );
  }

  async findRefreshByHash(tokenHash) {
    const r = await this.pool.query('SELECT * FROM refresh_tokens WHERE token_hash=$1', [tokenHash]);
    return r.rows[0] || null;
  }

  async revokeFamily(familyId) {
    await this.pool.query('UPDATE refresh_tokens SET revoked_at=now() WHERE family_id=$1 AND revoked_at IS NULL', [familyId]);
  }

  async revokeToken(tokenHash) {
    await this.pool.query('UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1', [tokenHash]);
  }

  async deleteExpiredRefresh() {
    const r = await this.pool.query('DELETE FROM refresh_tokens WHERE expires_at < now() OR revoked_at < now() - interval \'7 days\'');
    return r.rowCount;
  }

  // ---- AI logs ----
  async logAI({ userId = null, endpoint = 'chat', model, request = {}, response = '', latencyMs = 0, mocked = false }) {
    await this.pool.query(
      'INSERT INTO ai_logs(user_id,endpoint,model,request,response,latency_ms,mocked) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [userId, endpoint, model, JSON.stringify(request).slice(0, 8000), String(response).slice(0, 8000), latencyMs, mocked],
    );
  }

  // ---- analytics (user-scoped, last N days) ----
  async getAnalytics(userId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

    const statusR = await this.pool.query(
      `SELECT status, COUNT(*)::int AS n FROM tasks WHERE user_id=$1 GROUP BY status`, [userId]);
    const prioR = await this.pool.query(
      `SELECT priority, COUNT(*)::int AS n FROM tasks WHERE user_id=$1 GROUP BY priority`, [userId]);
    const totalR = await this.pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status='done')::int AS done
       FROM tasks WHERE user_id=$1`, [userId]);
    const taskDaysR = await this.pool.query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d, COUNT(*)::int AS n
       FROM tasks WHERE user_id=$1 AND created_at >= $2
       GROUP BY 1 ORDER BY 1`, [userId, since]);

    const aiTotalR = await this.pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE mocked)::int AS mocked,
              COALESCE(AVG(latency_ms),0)::float AS avg_latency
       FROM ai_logs WHERE user_id=$1 AND created_at >= $2`, [userId, since]);
    const aiEpR = await this.pool.query(
      `SELECT endpoint, COUNT(*)::int AS n, COALESCE(AVG(latency_ms),0)::float AS avg_latency
       FROM ai_logs WHERE user_id=$1 AND created_at >= $2 GROUP BY endpoint ORDER BY n DESC`,
      [userId, since]);
    const aiModelR = await this.pool.query(
      `SELECT model, COUNT(*)::int AS n FROM ai_logs
       WHERE user_id=$1 AND created_at >= $2 GROUP BY model ORDER BY n DESC`, [userId, since]);
    const aiDaysR = await this.pool.query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d, COUNT(*)::int AS n
       FROM ai_logs WHERE user_id=$1 AND created_at >= $2 GROUP BY 1 ORDER BY 1`, [userId, since]);
    const seededR = await this.pool.query(
      `SELECT COUNT(*)::int AS n FROM ai_logs
       WHERE user_id=$1 AND created_at >= $2 AND (request->>'seeded') = 'true'`, [userId, since]);

    const byStatus = { todo: 0, doing: 0, done: 0 };
    for (const r of statusR.rows) byStatus[r.status] = r.n;
    const byPriority = { low: 0, medium: 0, high: 0 };
    for (const r of prioR.rows) byPriority[r.priority] = r.n;
    const { total, done } = totalR.rows[0];

    const fillDays = (rows) => {
      const map = new Map(rows.map((r) => [r.d, r.n]));
      const out = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
        out.push({ date: d, count: map.get(d) || 0 });
      }
      return out;
    };

    const ai = aiTotalR.rows[0];
    return {
      tasks: {
        total, done,
        completion_rate: total ? Math.round((done / total) * 100) : 0,
        by_status: byStatus, by_priority: byPriority,
        per_day: fillDays(taskDaysR.rows),
      },
      ai: {
        total: ai.total, mocked: ai.mocked,
        mocked_ratio: ai.total ? Math.round((ai.mocked / ai.total) * 100) : 0,
        avg_latency_ms: Math.round(ai.avg_latency),
        by_endpoint: aiEpR.rows, by_model: aiModelR.rows,
        per_day: fillDays(aiDaysR.rows),
        seeded: seededR.rows[0].n,
      },
    };
  }
}
