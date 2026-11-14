import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  teamId: z.number().int().optional().nullable(),
  categoryId: z.number().int().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
  startDate: z.string().datetime().optional().nullable(),
  scheduledDate: z.string().datetime().optional().nullable(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  estimatedDuration: z.number().int().min(0).optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  progress: z.number().int().min(0).max(100).optional(),
});

function parseDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function ensureCategoryOwned(userId: number, categoryId?: number | null) {
  if (categoryId == null) return;
  const cat = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!cat) throw new Error('Invalid category');
}

async function ensureTeamMember(userId: number, teamId: number) {
  const m = await prisma.teamMember.findFirst({ where: { teamId, userId } });
  if (!m) throw new Error('Not a team member');
}

async function getAccessibleTask(userId: number, id: number) {
  const task = await prisma.task.findUnique({ where: { id }, include: { category: true, team: true, user: { select: { id: true, email: true, name: true } } } });
  if (!task) return null;
  if (task.teamId) {
    const member = await prisma.teamMember.findFirst({ where: { teamId: task.teamId, userId } });
    if (!member) return null;
  } else if (task.userId !== userId) {
    return null;
  }
  return task;
}

const taskInclude = { category: true, team: true, user: { select: { id: true, email: true, name: true } } };

router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { search, priority, categoryId, status, sortBy, scope, teamId } = req.query as Record<string, string | undefined>;
    const teamIds = (await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } })).map(m => m.teamId);

    const accessOr: any[] = [{ userId, teamId: null }];
    if (teamIds.length) accessOr.push({ teamId: { in: teamIds } });

    const where: any = { AND: [{ OR: accessOr }] };
    if (scope === 'personal') where.AND.push({ teamId: null, userId });
    if (scope === 'team') where.AND.push({ teamId: teamIds.length ? { in: teamIds } : -1 });
    if (teamId) {
      const tid = Number(teamId);
      if (!teamIds.includes(tid)) return res.status(403).json({ error: 'Not a team member' });
      where.AND.push({ teamId: tid });
    }
    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      });
    }
    if (priority) where.AND.push({ priority });
    if (categoryId) where.AND.push({ categoryId: Number(categoryId) });
    if (status) where.AND.push({ status });

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'deadline') orderBy = { deadline: 'asc' };
    if (sortBy === 'priority') orderBy = { priority: 'desc' };
    if (sortBy === 'progress') orderBy = { progress: 'desc' };
    if (sortBy === 'createdAt') orderBy = { createdAt: 'desc' };

    const tasks = await prisma.task.findMany({ where, orderBy, include: taskInclude });
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const task = await getAccessibleTask(userId, id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = taskSchema.parse(req.body);
    const teamId = data.teamId ?? null;
    if (teamId) await ensureTeamMember(userId, teamId);
    // categories are personal; only apply for personal tasks
    if (!teamId) await ensureCategoryOwned(userId, data.categoryId ?? null);
    const progress = data.progress ?? (data.status === 'Completed' ? 100 : 0);
    const status = data.status ?? 'Pending';
    const task = await prisma.task.create({
      data: {
        userId,
        teamId,
        title: data.title,
        description: data.description ?? null,
        categoryId: teamId ? null : (data.categoryId ?? null),
        priority: data.priority,
        status,
        startDate: parseDate(data.startDate),
        scheduledDate: parseDate(data.scheduledDate),
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        estimatedDuration: data.estimatedDuration ?? null,
        deadline: parseDate(data.deadline),
        progress: status === 'Completed' ? 100 : progress,
        completedAt: status === 'Completed' ? new Date() : null,
      },
      include: taskInclude,
    });
    await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'CREATED', newValue: JSON.stringify({ title: task.title, teamId }) });
    if (task.scheduledDate) {
      await logActivity({
        userId,
        taskId: task.id,
        taskTitleSnapshot: task.title,
        actionType: 'TASK_SCHEDULED',
        newValue: task.scheduledDate.toISOString().slice(0, 10),
      });
    }
    res.status(201).json(task);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Invalid task data' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const existing = await getAccessibleTask(userId, id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    const data = taskSchema.partial().parse(req.body);
    // personal task: can keep personal or move to team if member; team task stays in same team for now
    let targetTeamId = existing.teamId;
    if (data.teamId !== undefined) {
      targetTeamId = data.teamId ?? null;
      if (targetTeamId) await ensureTeamMember(userId, targetTeamId);
    }
    if (!targetTeamId && data.categoryId !== undefined) await ensureCategoryOwned(userId, data.categoryId ?? null);

    const updates: any = {};
    const changes: Array<{ field: string; prev: any; next: any }> = [];
    const set = (field: string, prev: any, next: any) => {
      if (next !== undefined && String(prev ?? '') !== String(next ?? '')) {
        updates[field] = next;
        changes.push({ field, prev, next });
      } else if (next !== undefined) {
        updates[field] = next;
      }
    };
    set('title', existing.title, data.title ?? existing.title);
    set('description', existing.description, data.description !== undefined ? data.description : existing.description);
    set('teamId', existing.teamId, targetTeamId);
    set('categoryId', existing.categoryId, targetTeamId ? null : (data.categoryId !== undefined ? data.categoryId : existing.categoryId));
    set('priority', existing.priority, data.priority ?? existing.priority);
    set('status', existing.status, data.status ?? existing.status);
    set('startDate', existing.startDate?.toISOString() ?? null, data.startDate !== undefined ? parseDate(data.startDate)?.toISOString() ?? null : existing.startDate);
    set('scheduledDate', existing.scheduledDate?.toISOString() ?? null, data.scheduledDate !== undefined ? parseDate(data.scheduledDate)?.toISOString() ?? null : existing.scheduledDate);
    set('startTime', existing.startTime, data.startTime !== undefined ? data.startTime : existing.startTime);
    set('endTime', existing.endTime, data.endTime !== undefined ? data.endTime : existing.endTime);
    set('estimatedDuration', existing.estimatedDuration, data.estimatedDuration !== undefined ? data.estimatedDuration : existing.estimatedDuration);
    set('deadline', existing.deadline?.toISOString() ?? null, data.deadline !== undefined ? parseDate(data.deadline)?.toISOString() ?? null : existing.deadline);
    let newProgress = data.progress ?? existing.progress;
    const newStatus = updates.status ?? existing.status;
    if (newStatus === 'Completed') newProgress = 100;
    updates.progress = newProgress;
    const completionTime = new Date();
    if (newStatus === 'Completed' && existing.status !== 'Completed') updates.completedAt = completionTime;
    if (newStatus !== 'Completed' && existing.status === 'Completed') updates.completedAt = null;

    // normalize date fields to Date/null for prisma
    if (data.startDate !== undefined) updates.startDate = parseDate(data.startDate);
    if (data.scheduledDate !== undefined) updates.scheduledDate = parseDate(data.scheduledDate);
    if (data.deadline !== undefined) updates.deadline = parseDate(data.deadline);
    if (data.startTime !== undefined) updates.startTime = data.startTime;
    if (data.endTime !== undefined) updates.endTime = data.endTime;
    if (data.estimatedDuration !== undefined) updates.estimatedDuration = data.estimatedDuration;

    const task = await prisma.task.update({ where: { id }, data: updates, include: taskInclude });

    const schedChanged = (existing.scheduledDate?.toISOString().slice(0,10) || null) !== (task.scheduledDate?.toISOString().slice(0,10) || null);
    const timeChanged = (existing.startTime || null) !== (task.startTime || null) || (existing.endTime || null) !== (task.endTime || null);
    for (const c of changes) {
      if (['priority','status','deadline','progress','title','description','categoryId','startDate','estimatedDuration','teamId'].includes(c.field)) {
        const action = c.field === 'priority' ? 'PRIORITY_CHANGED'
          : c.field === 'status' ? 'STATUS_CHANGED'
          : c.field === 'deadline' ? 'DEADLINE_CHANGED'
          : c.field === 'progress' ? 'PROGRESS_UPDATED'
          : 'EDITED';
        await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: action, previousValue: c.prev == null ? null : String(c.prev), newValue: c.next == null ? null : String(c.next) });
      }
    }
    if (schedChanged) {
      if (!existing.scheduledDate && task.scheduledDate) {
        await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'TASK_SCHEDULED', newValue: task.scheduledDate.toISOString().slice(0,10) });
      } else if (existing.scheduledDate && !task.scheduledDate) {
        await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'TASK_UNSCHEDULED', previousValue: existing.scheduledDate.toISOString().slice(0,10) });
      } else {
        await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'TASK_RESCHEDULED', previousValue: existing.scheduledDate?.toISOString().slice(0,10) || null, newValue: task.scheduledDate?.toISOString().slice(0,10) || null });
      }
    }
    if (timeChanged) {
      await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'TASK_TIME_CHANGED', previousValue: `${existing.startTime || ''}-${existing.endTime || ''}`, newValue: `${task.startTime || ''}-${task.endTime || ''}` });
    }
    if (existing.status !== 'Completed' && task.status === 'Completed') {
      const late = task.deadline && task.completedAt && task.completedAt.getTime() > task.deadline.getTime();
      await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: late ? 'COMPLETED_LATE' : 'COMPLETED' });
    }
    if (existing.status === 'Completed' && task.status !== 'Completed') {
      await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'REOPENED' });
    }

    res.json(task);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to update task' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const { status } = req.body as { status: string };
    if (!['Pending', 'In Progress', 'Completed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const existing = await getAccessibleTask(userId, id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    const data: any = { status };
    const completionTime = new Date();
    if (status === 'Completed') { data.progress = 100; data.completedAt = completionTime; }
    else if (existing.status === 'Completed') { data.completedAt = null; }
    const task = await prisma.task.update({ where: { id }, data, include: taskInclude });
    await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'STATUS_CHANGED', previousValue: existing.status, newValue: status });
    if (existing.status !== 'Completed' && status === 'Completed') {
      const late = task.deadline && task.completedAt && task.completedAt.getTime() > task.deadline.getTime();
      await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: late ? 'COMPLETED_LATE' : 'COMPLETED' });
    }
    if (existing.status === 'Completed' && status !== 'Completed') await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'REOPENED' });
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.patch('/:id/progress', async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const { progress } = req.body as { progress: number };
    if (typeof progress !== 'number' || progress < 0 || progress > 100) return res.status(400).json({ error: 'Invalid progress' });
    const existing = await getAccessibleTask(userId, id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    const data: any = { progress };
    if (progress === 100 && existing.status !== 'Completed') { data.status = 'Completed'; data.completedAt = new Date(); }
    const task = await prisma.task.update({ where: { id }, data, include: taskInclude });
    await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'PROGRESS_UPDATED', previousValue: String(existing.progress), newValue: String(progress) });
    if (existing.status !== 'Completed' && task.status === 'Completed') {
      const late = task.deadline && task.completedAt && task.completedAt.getTime() > task.deadline.getTime();
      await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: late ? 'COMPLETED_LATE' : 'COMPLETED' });
    }
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

router.patch('/:id/schedule', async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const existing = await getAccessibleTask(userId, id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    const body = req.body as { scheduledDate?: string | null; startTime?: string | null; endTime?: string | null; estimatedDuration?: number | null };
    const updates: any = {};
    if (body.scheduledDate !== undefined) updates.scheduledDate = parseDate(body.scheduledDate);
    if (body.startTime !== undefined) updates.startTime = body.startTime || null;
    if (body.endTime !== undefined) updates.endTime = body.endTime || null;
    if (body.estimatedDuration !== undefined) updates.estimatedDuration = body.estimatedDuration ?? null;
    const task = await prisma.task.update({ where: { id }, data: updates, include: taskInclude });

    const prevDate = existing.scheduledDate?.toISOString().slice(0,10) || null;
    const nextDate = task.scheduledDate?.toISOString().slice(0,10) || null;
    if (prevDate !== nextDate) {
      if (!prevDate && nextDate) await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'TASK_SCHEDULED', newValue: nextDate });
      else if (prevDate && !nextDate) await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'TASK_UNSCHEDULED', previousValue: prevDate });
      else await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'TASK_RESCHEDULED', previousValue: prevDate, newValue: nextDate });
    }
    const prevTime = `${existing.startTime || ''}-${existing.endTime || ''}`;
    const nextTime = `${task.startTime || ''}-${task.endTime || ''}`;
    if (prevTime !== nextTime) {
      await logActivity({ userId, taskId: task.id, taskTitleSnapshot: task.title, actionType: 'TASK_TIME_CHANGED', previousValue: prevTime, newValue: nextTime });
    }
    res.json(task);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to reschedule task' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const existing = await getAccessibleTask(userId, id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    await logActivity({ userId, taskId: existing.id, taskTitleSnapshot: existing.title, actionType: 'DELETED', previousValue: existing.title });
    await prisma.task.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
