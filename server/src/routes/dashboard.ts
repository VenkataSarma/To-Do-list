import { Router } from 'express';
import prisma from '../prisma.js';
import { startOfDay, endOfDay, subDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import type { Task } from '@prisma/client';

const router = Router();

function isOverdue(task: any, now: Date) {
  if (!task.deadline) return false;
  if (task.status === 'Completed') return false;
  return new Date(task.deadline).getTime() < now.getTime();
}
function isDueToday(task: any, now: Date) {
  if (!task.deadline) return false;
  const d = new Date(task.deadline);
  return d >= startOfDay(now) && d <= endOfDay(now);
}

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user!.id;
    const tasks = await prisma.task.findMany({ where: { userId } });
    const now = new Date();
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const overdue = tasks.filter(t => isOverdue(t, now)).length;
    const dueToday = tasks.filter(t => isDueToday(t, now) && t.status !== 'Completed').length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    res.json({ total, completed, pending, inProgress, overdue, dueToday, completionRate });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/productivity', async (req, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const completedTasks = await prisma.task.findMany({ where: { userId, completedAt: { not: null } }, select: { completedAt: true } });
    // daily last 7 days
    const days = eachDayOfInterval({ start: subDays(startOfDay(now), 6), end: endOfDay(now) });
    const daily = days.map((day: Date) => {
      const count = completedTasks.filter((t: { completedAt: Date | null }) => t.completedAt && t.completedAt >= startOfDay(day) && t.completedAt <= endOfDay(day)).length;
      return { label: format(day, 'EEE'), date: format(day, 'yyyy-MM-dd'), completed: count };
    });
    // weekly last 6 weeks
    const weekStart = startOfWeek(subDays(now, 7 * 5), { weekStartsOn: 1 });
    const weeks = eachWeekOfInterval({ start: weekStart, end: now }, { weekStartsOn: 1 });
    const weekly = weeks.map((w: Date) => {
      const s = startOfWeek(w, { weekStartsOn: 1 });
      const e = endOfWeek(w, { weekStartsOn: 1 });
      const count = completedTasks.filter((t: { completedAt: Date | null }) => t.completedAt && t.completedAt >= s && t.completedAt <= e).length;
      return { label: format(s, 'MMM d'), completed: count };
    });
    // monthly last 6 months
    const monthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1));
    const months = eachMonthOfInterval({ start: monthStart, end: now });
    const monthly = months.map((m: Date) => {
      const s = startOfMonth(m);
      const e = endOfMonth(m);
      const count = completedTasks.filter((t: { completedAt: Date | null }) => t.completedAt && t.completedAt >= s && t.completedAt <= e).length;
      return { label: format(m, 'MMM yyyy'), completed: count };
    });
    res.json({ daily, weekly, monthly });
  } catch {
    res.status(500).json({ error: 'Failed to fetch productivity' });
  }
});

export default router;
