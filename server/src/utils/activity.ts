import prisma from '../prisma.js';

export async function logActivity(params: {
  userId: number;
  taskId?: number | null;
  taskTitleSnapshot: string;
  actionType: string;
  previousValue?: string | null;
  newValue?: string | null;
}) {
  return prisma.activityLog.create({
    data: {
      userId: params.userId,
      taskId: params.taskId ?? null,
      taskTitleSnapshot: params.taskTitleSnapshot,
      actionType: params.actionType,
      previousValue: params.previousValue ?? null,
      newValue: params.newValue ?? null,
    },
  });
}
