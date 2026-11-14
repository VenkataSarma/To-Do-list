import type { ActivityLog, Category, DashboardStats, ProductivityData, Task, Team, User } from '../types';

const TOKEN_KEY = 'taskflow_token';
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try { const data = await res.json(); msg = data.error || msg; } catch {}
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('taskflow:unauthorized'));
    }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  tasks: {
    list: (params?: Record<string, string | number | undefined>) => {
      const q = new URLSearchParams();
      Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
      const qs = q.toString();
      return request<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`);
    },
    get: (id: number) => request<Task>(`/api/tasks/${id}`),
    create: (data: Partial<Task>) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Task>) => request<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id: number, status: string) => request<Task>(`/api/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    updateProgress: (id: number, progress: number) => request<Task>(`/api/tasks/${id}/progress`, { method: 'PATCH', body: JSON.stringify({ progress }) }),
    updateSchedule: (id: number, data: { scheduledDate?: string | null; startTime?: string | null; endTime?: string | null; estimatedDuration?: number | null }) => request<Task>(`/api/tasks/${id}/schedule`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => request<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),
  },
  categories: {
    list: () => request<Category[]>('/api/categories'),
    create: (name: string) => request<Category>('/api/categories', { method: 'POST', body: JSON.stringify({ name }) }),
    update: (id: number, name: string) => request<Category>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
    delete: (id: number) => request<{ success: boolean }>(`/api/categories/${id}`, { method: 'DELETE' }),
  },
  history: {
    list: (params?: Record<string, string | undefined>) => {
      const q = new URLSearchParams();
      Object.entries(params || {}).forEach(([k, v]) => { if (v) q.set(k, v); });
      const qs = q.toString();
      return request<ActivityLog[]>(`/api/history${qs ? `?${qs}` : ''}`);
    },
  },
  dashboard: {
    stats: () => request<DashboardStats>('/api/dashboard/stats'),
    productivity: () => request<ProductivityData>('/api/dashboard/productivity'),
  },
  settings: {
    get: () => request<{ id: number; theme: string; preferences: string }>('/api/settings'),
    update: (data: { theme?: string; preferences?: any }) => request<any>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
  auth: {
    login: (data: { email: string; password: string }) => request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: { email: string; password: string; name?: string }) => request<{ token: string; user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request<{ user: User }>('/api/auth/me'),
  },
  teams: {
    list: () => request<Team[]>('/api/teams'),
    create: (data: { name: string }) => request<Team>('/api/teams', { method: 'POST', body: JSON.stringify(data) }),
    addMember: (teamId: number, data: { email: string }) => request<Team>(`/api/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(data) }),
    tasks: (teamId: number) => request<Task[]>(`/api/teams/${teamId}/tasks`),
  },
};
