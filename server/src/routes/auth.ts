import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { hashPassword, requireAuth, signToken, verifyPassword } from '../auth.js';

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

async function ensureUserDefaults(userId: number) {
  const defaults = ['Personal', 'Work', 'Learning', 'Health', 'Finance', 'Other'];
  for (const name of defaults) {
    await prisma.category.upsert({
      where: { userId_name: { userId, name } },
      update: { isDefault: true },
      create: { userId, name, isDefault: true },
    });
  }
  await prisma.applicationSettings.upsert({
    where: { userId },
    update: {},
    create: { userId, theme: 'light', preferences: '{}' },
  });
}

router.post('/register', async (req, res) => {
  try {
    const data = credentialsSchema.parse(req.body);
    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email is already registered' });
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({ data: { email, passwordHash, name: data.name?.trim() || null } });
    await ensureUserDefaults(user.id);
    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = credentialsSchema.pick({ email: true, password: true }).parse(req.body);
    const email = data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, email: true, name: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export { ensureUserDefaults };
export default router;
