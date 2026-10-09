import './env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import aiRoutes from './routes/ai.js';
import analyticsRoutes from './routes/analytics.js';
import store from './db/index.js';
import passport from 'passport';
import { initOAuth, oauthRouter } from './oauth.js';

initOAuth();

export const app = express();
export const server = createServer(app);
export const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173' } });
app.set('io', io);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get('/health', async (req, res) => {
  // Deep check: actually touches PG + Redis so outages show up here first.
  let pg = 'unknown';
  let redisState = 'unknown';
  try {
    if (typeof store.ping === 'function') { await store.ping(); pg = 'up'; }
    else pg = 'n/a';
  } catch { pg = 'down'; }
  try {
    const { ready } = await import('./cache.js');
    redisState = (await ready()).redis ? 'up' : 'down';
  } catch { redisState = 'down'; }
  const degraded = pg === 'down' || redisState === 'down';
  res.status(degraded ? 503 : 200).json({
    status: degraded ? 'degraded' : 'healthy',
    time: new Date().toISOString(), uptime: process.uptime(),
    db: process.env.DB_ADAPTER || 'file',
    store: store.constructor.name,
    pg, redis: redisState,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/auth', passport.initialize(), oauthRouter);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);

io.on('connection', (socket) => {
  socket.on('join', (userId) => userId && socket.join(`user:${userId}`));
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use(errorHandler);
