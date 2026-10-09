// Realistic demo analytics data — same row shapes as live traffic, plus request.seeded=true.
// Dev-only: refuses on NODE_ENV=production.
// Usage: npm run seed:analytics -- --email=<user-email> [--clear] [--tasks=120] [--logs=200] [--days=30]
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

if ((process.env.NODE_ENV || '') === 'production') {
  console.error('seed:analytics refuses to run in production');
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(=(.*))?$/);
    return [m[1], m[3] ?? true];
  }),
);
const EMAIL = String(args.email || '');
const CLEAR = Boolean(args.clear);
const N_TASKS = Number(args.tasks || 120);
const N_LOGS = Number(args.logs || 200);
const DAYS = Number(args.days || 30);
if (!EMAIL) { console.error('usage: npm run seed:analytics -- --email=<user-email> [--clear]'); process.exit(1); }

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickW = (pairs) => {
  const tot = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * tot;
  for (const [v, w] of pairs) { r -= w; if (r <= 0) return v; }
  return pairs[0][0];
};
// Weekday-weighted timestamp within last N days (people work less on weekends)
function randTime(days) {
  const d = Math.floor(rand(0, days));
  const date = new Date(Date.now() - d * 24 * 3600 * 1000);
  if ([0, 6].includes(date.getDay()) && Math.random() < 0.6) date.setDate(date.getDate() - (date.getDay() === 0 ? 2 : 1));
  date.setHours(Math.floor(rand(8, 19)), Math.floor(rand(0, 59)), 0, 0);
  return date.toISOString();
}

const TASK_TOPICS = [
  ['Fix login redirect loop', 'Users land on /login after OAuth callback instead of dashboard. Repro: fresh Chrome profile.'],
  ['Write API docs for tasks endpoints', 'Cover CRUD, filters, error codes with curl examples for the frontend team.'],
  ['Design analytics dashboard mockup', 'KPI cards, status bar chart, AI usage area chart. Match MUI theme.'],
  ['Refactor aiService retry logic', 'Exponential backoff + model rotation is tangled; extract a provider pool.'],
  ['Set up staging deploy', 'Compose file for postgres+redis+backend on the staging VM with backups.'],
  ['Review PR: refresh rotation', 'Check reuse-detection edge case when two tabs refresh simultaneously.'],
  ['Prepare demo script', 'Five-minute flow: register, create tasks, ask AI, show analytics.'],
  ['Gym: push day', 'Bench 4x8, overhead press 3x10, dips 3x12.'],
  ['Read Postgres indexing chapter', 'B-tree vs GIN for JSONB request column in ai_logs.'],
  ['Plan weekend trip', 'Compare train times, book stay near the venue, pack checklist.'],
  ['Fix flaky pg test', 'Cache init race in CI without redis; make client lazy.'],
  ['Update onboarding README', 'Add OAuth setup steps with screenshots for new joiners.'],
  ['Triage support inbox', 'Answer 5 tickets about expired sessions; link refresh-token docs.'],
  ['Optimize task list query', 'Add covering index on (user_id, created_at) — measure before/after.'],
  ['Write release notes v0.4', 'Analytics page, OAuth login, refresh rotation.'],
];

const CHAT_Q = [
  'Break this goal into 3 tasks: launch analytics page',
  'Prioritize my week: 5 deadlines, 2 code reviews, 1 demo',
  'Draft a standup update from my done tasks',
  'Summarize this thread for my manager in 3 bullets',
  'What should I work on first today?',
];
const GEN_TOPICS = ['sprint retro template', 'release announcement', 'onboarding checklist', 'incident postmortem'];
const SUM_SRC = [
  'Quarterly planning doc with roadmap tradeoffs and staffing notes.',
  'Long support thread about session expiry across 40 messages.',
  'Design review notes covering dashboard layout and chart choices.',
];
const MODELS = [
  'liquid/lfm-2.5-2.6b:free',
  'cohere/north-mini-code:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
];
const RESPONSES = {
  chat: 'Here is a focused plan:\n1. Ship the smallest working slice\n2. Add tests around the risky part\n3. Demo early and adjust.',
  generate: 'Draft content ready for review — structured with headings, key points, and next steps.',
  summarize: 'Summary: scope agreed, owners assigned, deadline Friday; open risks flagged for follow-up.',
  recommendations: '1. Finish the analytics page\n2. Fix the flaky test\n3. Write release notes',
};

const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/sda_capstone',
});
const userR = await pool.query('SELECT id FROM users WHERE email=$1', [EMAIL.toLowerCase()]);
if (!userR.rows[0]) { console.error(`no user with email ${EMAIL}`); await pool.end(); process.exit(1); }
const userId = userR.rows[0].id;

if (CLEAR) {
  await pool.query(`DELETE FROM ai_logs WHERE user_id=$1 AND (request->>'seeded')='true'`, [userId]);
  await pool.query(`DELETE FROM tasks WHERE user_id=$1 AND description LIKE '%[seeded]%'`, [userId]);
  await pool.query(`DELETE FROM task_lists WHERE user_id=$1 AND title LIKE '%[seeded]'`, [userId]);
  console.log('cleared previous seeded rows');
}

// Three Google-Tasks-style lists; positions spaced 1024 apart (float-rank).
const LIST_DEFS = ['Important Tasks [seeded]', "Today's Tasks [seeded]", 'Science Project [seeded]'];
const listIds = [];
{
  let pos = 1024;
  for (const title of LIST_DEFS) {
    const r = await pool.query(
      `INSERT INTO task_lists(user_id,title,position) VALUES($1,$2,$3) RETURNING id`,
      [userId, title, pos],
    );
    listIds.push(r.rows[0].id);
    pos += 1024;
  }
}
const listPos = new Map(listIds.map((id) => [id, 0]));
const nextPos = (lid) => { const p = (listPos.get(lid) || 0) + 1024; listPos.set(lid, p); return p; };

// Fixed Science Project set (user's example: rich context for AI summary)
const SCIENCE = [
  ['Create project outline', 'Define scope, sections, and grading rubric for the science project.'],
  ['Make charts', 'Plot experiment results: bar chart for group A vs B, line chart over time.'],
  ['Write analysis', 'Explain what the charts show and why results differ.'],
  ['Push to prod', 'Publish the final report to the class site and submit.'],
];
for (const [title, desc] of SCIENCE) {
  const created = randTime(DAYS);
  await pool.query(
    `INSERT INTO tasks(user_id,list_id,position,title,description,priority,status,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,'high','doing',$6,$6)`,
    [userId, listIds[2], nextPos(listIds[2]), `${title} [seeded]`, `${desc} [seeded]`, created],
  );
}

let tasks = SCIENCE.length;
for (let i = 0; i < N_TASKS; i++) {
  const [title, desc] = pick(TASK_TOPICS);
  const status = pickW([['todo', 40], ['doing', 25], ['done', 35]]);
  const priority = pickW([['low', 20], ['medium', 50], ['high', 30]]);
  const created = randTime(DAYS);
  const updated = status === 'todo' ? created : new Date(Math.min(Date.now(), new Date(created).getTime() + rand(1, 72) * 3600 * 1000)).toISOString();
  // Weight random tasks toward the first two lists; Science Project keeps its curated set.
  const lid = pickW([[listIds[0], 40], [listIds[1], 45], [listIds[2], 15]]);
  await pool.query(
    `INSERT INTO tasks(user_id,list_id,position,title,description,priority,status,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [userId, lid, nextPos(lid), `${title} #${i + 1}`, `${desc} [seeded]`, priority, status, created, updated],
  );
  tasks++;
}

const EP_W = [['chat', 50], ['generate', 20], ['summarize', 20], ['recommendations', 10]];
let logs = 0;
for (let i = 0; i < N_LOGS; i++) {
  const endpoint = pickW(EP_W);
  const kind = Math.random();
  const mocked = kind > 0.85; // ~15% mock, like quota-exhausted windows
  const cached = !mocked && kind < 0.2; // ~20% served from Redis cache
  const latency = mocked ? Math.round(rand(800, 1400)) : cached ? Math.round(rand(3, 15)) : Math.round(rand(1500, 6000));
  const prompt =
    endpoint === 'chat' ? pick(CHAT_Q)
    : endpoint === 'generate' ? `Write ${pick(['short', 'medium'])} ${pick(GEN_TOPICS)}`
    : endpoint === 'summarize' ? pick(SUM_SRC)
    : 'Suggest 3 next tasks';
  await pool.query(
    `INSERT INTO ai_logs(user_id,endpoint,model,request,response,latency_ms,mocked,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      userId, endpoint, mocked ? 'mock' : pick(MODELS),
      JSON.stringify({ prompt_len: prompt.length, seeded: true, cached }),
      RESPONSES[endpoint], latency, mocked, randTime(DAYS),
    ],
  );
  logs++;
}
await pool.end();
console.log(`seeded ${tasks} tasks + ${logs} ai_logs for ${EMAIL} (request.seeded=true)`);
