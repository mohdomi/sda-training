// Imports file-store JSON (data/users.json, data/tasks.json) into Postgres.
// Usage: DB_ADAPTER=file DATA_DIR=... npm run seed  (writes into POSTGRES_URL)
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const url = process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/sda_capstone';
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', '..', 'data');
const pool = new pg.Pool({ connectionString: url });

const load = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8')); } catch { return []; } };
const users = load('users.json');
const tasks = load('tasks.json');
console.log(`seed: ${users.length} users, ${tasks.length} tasks from ${dataDir}`);

const idMap = new Map();
for (const u of users) {
  const r = await pool.query(
    `INSERT INTO users(name,email,password_hash,role,provider,provider_id,avatar,is_active)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
    [u.name, u.email, u.passwordHash || null, u.role || 'user', u.provider || 'local', u.providerId || null, u.avatar || null, u.isActive !== false],
  );
  idMap.set(u.id, r.rows[0].id);
}
let n = 0;
for (const t of tasks) {
  const userId = idMap.get(t.userId) || t.userId;
  await pool.query(
    `INSERT INTO tasks(user_id,title,description,priority,status) VALUES($1,$2,$3,$4,$5)`,
    [userId, t.title, t.description || '', t.priority || 'medium', t.status || 'todo'],
  );
  n++;
}
await pool.end();
console.log(`seeded ${idMap.size} users, ${n} tasks`);
