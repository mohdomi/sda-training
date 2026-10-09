// Minimal migration runner: applies src/db/migrations/*.sql in order.
// Usage: npm run migrate  (uses POSTGRES_URL or default day14 container)
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const url = process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/sda_capstone';
const pool = new pg.Pool({ connectionString: url });

const dir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), 'utf8');
  console.log(`applying ${f}...`);
  await pool.query(sql);
  console.log(`ok ${f}`);
}
await pool.end();
console.log('migrations done');
