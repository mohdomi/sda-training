// Minimal JSON-file store with the same interface the Postgres adapter will expose.
// Collections: users, tasks. Atomic enough for MVP/demo; NOT for concurrent prod use.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export default class FileStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    fs.mkdirSync(dataDir, { recursive: true });
    this.usersFile = path.join(dataDir, 'users.json');
    this.tasksFile = path.join(dataDir, 'tasks.json');
    this.aiLogsFile = path.join(dataDir, 'ai_logs.json');
    this.users = this._load(this.usersFile);
    this.tasks = this._load(this.tasksFile);
    this.aiLogs = this._load(this.aiLogsFile);
  }

  _load(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return [];
    }
  }

  _save() {
    fs.writeFileSync(this.usersFile, JSON.stringify(this.users, null, 2));
    fs.writeFileSync(this.tasksFile, JSON.stringify(this.tasks, null, 2));
    fs.writeFileSync(this.aiLogsFile, JSON.stringify(this.aiLogs, null, 2));
  }

  uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  }

  // ---- users ----
  async createUser({ name, email, passwordHash, role = 'user', provider = 'local', providerId = null, avatar = null }) {
    if (this.users.some((u) => u.email === email.toLowerCase())) {
      const err = new Error('User already exists');
      err.status = 400;
      throw err;
    }
    const user = {
      id: this.uid(), name, email: email.toLowerCase(), passwordHash,
      role, provider, providerId, avatar, isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    this._save();
    return { ...user };
  }

  async findUserByEmail(email) {
    return this.users.find((u) => u.email === String(email).toLowerCase()) || null;
  }

  async findUserById(id) {
    return this.users.find((u) => u.id === id) || null;
  }

  async linkProvider(userId, provider, providerId) {
    const u = this.users.find((x) => x.id === userId);
    if (u) { u.provider = provider; u.providerId = providerId; this._save(); }
    return u;
  }

  // ---- tasks ----
  async createTask({ userId, title, description = '', priority = 'medium', status = 'todo' }) {
    const task = {
      id: this.uid(), userId, title, description, priority, status,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.tasks.push(task);
    this._save();
    return task;
  }

  async listTasks(userId) {
    return this.tasks.filter((t) => t.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateTask(userId, id, patch) {
    const t = this.tasks.find((x) => x.id === id && x.userId === userId);
    if (!t) { const e = new Error('Task not found'); e.status = 404; throw e; }
    Object.assign(t, patch, { updatedAt: new Date().toISOString() });
    this._save();
    return t;
  }

  async deleteTask(userId, id) {
    const i = this.tasks.findIndex((x) => x.id === id && x.userId === userId);
    if (i < 0) { const e = new Error('Task not found'); e.status = 404; throw e; }
    const [t] = this.tasks.splice(i, 1);
    this._save();
    return t;
  }

  async logAI({ userId = null, endpoint = 'chat', model, request = {}, response = '', latencyMs = 0, mocked = false }) {
    this.aiLogs.push({
      id: this.uid(), userId, endpoint, model, request, response: String(response).slice(0, 8000),
      latencyMs, mocked, createdAt: new Date().toISOString(),
    });
    this._save();
  }

  async getAnalytics(userId, days = 30) {
    const since = Date.now() - days * 24 * 3600 * 1000;
    const tasks = this.tasks.filter((t) => t.userId === userId);
    const logs = this.aiLogs.filter((l) => l.userId === userId && new Date(l.createdAt).getTime() >= since);
    const byStatus = { todo: 0, doing: 0, done: 0 };
    const byPriority = { low: 0, medium: 0, high: 0 };
    for (const t of tasks) {
      if (byStatus[t.status] !== undefined) byStatus[t.status]++;
      if (byPriority[t.priority] !== undefined) byPriority[t.priority]++;
    }
    const done = byStatus.done;
    const epMap = new Map();
    const modelMap = new Map();
    let latSum = 0, mocked = 0, seeded = 0;
    for (const l of logs) {
      const e = epMap.get(l.endpoint) || { endpoint: l.endpoint, n: 0, lat: 0 };
      e.n++; e.lat += l.latencyMs || 0; epMap.set(l.endpoint, e);
      modelMap.set(l.model, (modelMap.get(l.model) || 0) + 1);
      latSum += l.latencyMs || 0;
      if (l.mocked) mocked++;
      if (l.request?.seeded) seeded++;
    }
    const dayMap = (items, key) => {
      const m = new Map();
      for (const it of items) {
        const d = new Date(it[key]).toISOString().slice(0, 10);
        m.set(d, (m.get(d) || 0) + 1);
      }
      const out = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
        out.push({ date: d, count: m.get(d) || 0 });
      }
      return out;
    };
    return {
      tasks: {
        total: tasks.length, done,
        completion_rate: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
        by_status: byStatus, by_priority: byPriority,
        per_day: dayMap(tasks, 'createdAt'),
      },
      ai: {
        total: logs.length, mocked,
        mocked_ratio: logs.length ? Math.round((mocked / logs.length) * 100) : 0,
        avg_latency_ms: logs.length ? Math.round(latSum / logs.length) : 0,
        by_endpoint: [...epMap.values()].map((e) => ({ endpoint: e.endpoint, n: e.n, avg_latency: Math.round(e.lat / e.n) })),
        by_model: [...modelMap.entries()].map(([model, n]) => ({ model, n })),
        per_day: dayMap(logs, 'createdAt'),
        seeded,
      },
    };
  }
}
