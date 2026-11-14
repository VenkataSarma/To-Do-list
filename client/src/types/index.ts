export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Status = 'Pending' | 'In Progress' | 'Completed';

export interface User {
  id: number;
  email: string;
  name?: string | null;
}

export interface Category {
  id: number;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberUser {
  id: number;
  email: string;
  name?: string | null;
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: 'host' | 'member' | string;
  joinedAt: string;
  user?: TeamMemberUser;
}

export interface Team {
  id: number;
  name: string;
  createdById: number;
  createdAt: string;
  updatedAt?: string;
  myRole?: string;
  members?: TeamMember[];
  _count?: { tasks: number };
  createdBy?: TeamMemberUser;
}

export interface Task {
  id: number;
  userId: number;
  teamId?: number | null;
  team?: { id: number; name: string } | null;
  user?: TeamMemberUser;
  title: string;
  description?: string | null;
  categoryId?: number | null;
  category?: Category | null;
  priority: Priority;
  status: Status;
  startDate?: string | null;
  scheduledDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  estimatedDuration?: number | null;
  deadline?: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface ActivityLog {
  id: number;
  taskId?: number | null;
  taskTitleSnapshot: string;
  actionType: string;
  previousValue?: string | null;
  newValue?: string | null;
  timestamp: string;
}

export interface DashboardStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  dueToday: number;
  completionRate: number;
}

export interface ProductivityData {
  daily: { label: string; date: string; completed: number }[];
  weekly: { label: string; completed: number }[];
  monthly: { label: string; completed: number }[];
}

export type DeadlineState = 'No Deadline' | 'Upcoming' | 'Due Soon' | 'Due Today' | 'Overdue' | 'Completed' | 'Completed Late';
