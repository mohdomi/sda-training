// Pluggable store: MVP = JSON file (zero-setup).
// Phase 2 = Postgres-only + Redis without changing routes.
// Set DB_ADAPTER=postgres + POSTGRES_URL to switch (see postgres.js stub).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import FileStore from './fileStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adapter = process.env.DB_ADAPTER || 'file';

let store;
if (adapter === 'postgres') {
  const { default: PostgresStore } = await import('./postgres.js');
  store = new PostgresStore();
} else {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
  store = new FileStore(dataDir);
}

export default store;
