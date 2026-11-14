import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            createdBy: { select: { id: true, email: true, name: true } },
            members: { include: { user: { select: { id: true, email: true, name: true } } } },
            _count: { select: { tasks: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
    res.json(memberships.map(m => ({ ...m.team, myRole: m.role })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        createdById: userId,
        members: { create: { userId, role: 'host' } },
      },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
        _count: { select: { tasks: true } },
      },
    });
    res.status(201).json({ ...team, myRole: 'host' });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to create team' });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const userId = req.user!.id;
    const teamId = Number(req.params.id);
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (team.createdById !== userId) return res.status(403).json({ error: 'Only the host can add members' });
    const target = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!target) return res.status(404).json({ error: 'User not found. Only existing registered users can be added by email.' });
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId: target.id } },
      update: {},
      create: { teamId, userId: target.id, role: target.id === team.createdById ? 'host' : 'member' },
    });
    const updated = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
        _count: { select: { tasks: true } },
      },
    });
    res.json({ ...updated, myRole: 'host' });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to add member' });
  }
});

router.get('/:id/tasks', async (req, res) => {
  try {
    const userId = req.user!.id;
    const teamId = Number(req.params.id);
    const member = await prisma.teamMember.findFirst({ where: { teamId, userId } });
    if (!member) return res.status(403).json({ error: 'Not a team member' });
    const tasks = await prisma.task.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      include: { category: true, team: true, user: { select: { id: true, email: true, name: true } } },
    });
    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch team tasks' });
  }
});

export default router;
