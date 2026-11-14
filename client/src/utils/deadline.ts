import { differenceInCalendarDays, differenceInHours, isAfter, isPast, isToday, parseISO } from 'date-fns';
import type { DeadlineState, Task } from '../types';

export function isCompletedLate(task: Pick<Task, 'deadline' | 'status' | 'completedAt'>): boolean {
  if (task.status !== 'Completed' || !task.deadline || !task.completedAt) return false;
  return isAfter(parseISO(task.completedAt), parseISO(task.deadline));
}

export function getDeadlineState(task: Pick<Task, 'deadline' | 'status' | 'completedAt'>): DeadlineState {
  if (task.status === 'Completed') return isCompletedLate(task) ? 'Completed Late' : 'Completed';
  if (!task.deadline) return 'No Deadline';
  const d = parseISO(task.deadline);
  const now = new Date();
  if (isPast(d) && !isToday(d)) return 'Overdue';
  if (isToday(d)) return 'Due Today';
  const hours = differenceInHours(d, now);
  if (hours <= 24) return 'Due Soon';
  return 'Upcoming';
}

export function deadlineLabel(task: Pick<Task, 'deadline' | 'status' | 'completedAt'>): string {
  const state = getDeadlineState(task);
  if (state === 'No Deadline') return 'No deadline';
  if (state === 'Completed') return 'Completed';
  if (state === 'Completed Late') return 'Completed late';
  const d = parseISO(task.deadline!);
  const now = new Date();
  const days = differenceInCalendarDays(d, now);
  if (state === 'Overdue') {
    const overdueDays = Math.abs(days);
    return overdueDays === 0 ? 'Overdue today' : `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
  }
  if (state === 'Due Today') return 'Due today';
  if (days === 1) return 'Due in 1 day';
  return `Due in ${days} days`;
}

export const priorityColors: Record<string, string> = {
  Critical: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900',
  High: 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-900',
  Medium: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900',
  Low: 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700',
};

export const deadlineColors: Record<DeadlineState, string> = {
  'No Deadline': 'text-slate-600 dark:text-slate-400',
  Upcoming: 'text-emerald-700 dark:text-emerald-400',
  'Due Soon': 'text-amber-700 dark:text-amber-400',
  'Due Today': 'text-orange-700 dark:text-orange-400',
  Overdue: 'text-red-700 dark:text-red-400 font-medium',
  Completed: 'text-emerald-700 dark:text-emerald-400',
  'Completed Late': 'text-amber-700 dark:text-amber-400 font-medium',
};
