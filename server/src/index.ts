import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import prisma from './prisma.js';
import tasksRouter from './routes/tasks.js';
import categoriesRouter from './routes/categories.js';
import historyRouter from './routes/history.js';
import dashboardRouter from './routes/dashboard.js';
import settingsRouter from './routes/settings.js';
import teamsRouter from './routes/teams.js';
import authRouter, { ensureUserDefaults } from './routes/auth.js';
import { requireAuth } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/tasks', requireAuth, tasksRouter);
app.use('/api/categories', requireAuth, categoriesRouter);
app.use('/api/history', requireAuth, historyRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/teams', requireAuth, teamsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

async function seedDefaults() {
  // Ensure existing users (including legacy migrated user) have defaults/settings
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const u of users) {
    await ensureUserDefaults(u.id);
  }
}

seedDefaults().then(() => {
  app.listen(PORT, () => console.log(`TaskFlow server running on http://localhost:${PORT}`));
}).catch((e) => { console.error('Failed to start', e); process.exit(1); });
