import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

async function getOrCreateSettings(userId: number) {
  return prisma.applicationSettings.upsert({
    where: { userId },
    update: {},
    create: { userId, theme: 'light', preferences: '{}' },
  });
}

router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    res.json(await getOrCreateSettings(userId));
  } catch {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { theme, preferences } = req.body as { theme?: string; preferences?: any };
    await getOrCreateSettings(userId);
    const s = await prisma.applicationSettings.update({
      where: { userId },
      data: { theme: theme ?? undefined, preferences: preferences !== undefined ? JSON.stringify(preferences) : undefined },
    });
    res.json(s);
  } catch {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
