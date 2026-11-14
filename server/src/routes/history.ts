import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { actionType, search } = req.query as Record<string, string | undefined>;
    const where: any = { userId };
    if (actionType) where.actionType = actionType;
    if (search) {
      where.OR = [
        { taskTitleSnapshot: { contains: search } },
        { actionType: { contains: search } },
      ];
    }
    const logs = await prisma.activityLog.findMany({ where, orderBy: { timestamp: 'desc' }, take: 500 });
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.get('/:taskId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const taskId = Number(req.params.taskId);
    const logs = await prisma.activityLog.findMany({ where: { userId, taskId }, orderBy: { timestamp: 'desc' } });
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch task history' });
  }
});

export default router;
