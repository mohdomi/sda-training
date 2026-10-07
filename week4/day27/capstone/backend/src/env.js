// Load env FIRST. ESM hoists all `import`s above module code, so a
// `dotenv.config()` call inside app.js would run AFTER db/cache/aiService
// modules already read process.env at import time. Importing this module
// first (side-effect) guarantees env is ready before anything else evaluates.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
