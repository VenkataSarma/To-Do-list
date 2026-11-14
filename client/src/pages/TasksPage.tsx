import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Category, Task, Team } from '../types';
import { TaskCard } from '../components/TaskCard';
import { TaskFormModal } from '../components/TaskFormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { Plus, Search } from 'lucide-react';

interface Props { quickAddSignal?: number; mode?: 'all' | 'today' | 'upcoming' | 'completed'; scope?: 'all' | 'personal' | 'team'; teamId?: number; }

export function TasksPage({ quickAddSignal, mode = 'all', scope = 'personal', teamId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const { show } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { scope };
      if (teamId) params.teamId = teamId;
      const [t, c, tm] = await Promise.all([api.tasks.list(params), api.categories.list(), api.teams.list()]);
      setTasks(t); setCategories(c); setTeams(tm);
    } catch (e: any) { show(e.message || 'Failed to load tasks', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [scope, teamId]);
  useEffect(() => { if (quickAddSignal) { setEditing(null); setModalOpen(true); } }, [quickAddSignal]);

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
    let list = [...tasks];
    if (mode === 'completed') list = list.filter(t => t.status === 'Completed');
    if (mode === 'today') list = list.filter(t => t.deadline && new Date(t.deadline) >= startOfToday && new Date(t.deadline) <= endOfToday && t.status !== 'Completed');
    if (mode === 'upcoming') list = list.filter(t => t.deadline && new Date(t.deadline) > endOfToday && t.status !== 'Completed');
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(s) || (t.description || '').toLowerCase().includes(s));
    }
    if (priority) list = list.filter(t => t.priority === priority);
    if (categoryId) list = list.filter(t => String(t.categoryId || '') === categoryId);
    if (status && mode === 'all') list = list.filter(t => t.status === status);
    const prioRank: any = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    list.sort((a,b) => {
      if (sortBy === 'deadline') return (a.deadline ? new Date(a.deadline).getTime() : Infinity) - (b.deadline ? new Date(b.deadline).getTime() : Infinity);
      if (sortBy === 'priority') return (prioRank[b.priority]||0) - (prioRank[a.priority]||0);
      if (sortBy === 'progress') return b.progress - a.progress;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [tasks, search, priority, categoryId, status, sortBy, mode]);

  const save = async (data: any) => {
    try {
      if (editing) { await api.tasks.update(editing.id, data); show('Task updated', 'success'); }
      else { await api.tasks.create(data); show('Task created', 'success'); }
      await load();
    } catch (e: any) { show(e.message || 'Save failed', 'error'); throw e; }
  };
  const doDelete = async () => {
    if (!deleting) return;
    try { await api.tasks.delete(deleting.id); show('Task deleted', 'success'); setDeleting(null); await load(); }
    catch (e: any) { show(e.message || 'Delete failed', 'error'); }
  };
  const toggleComplete = async (task: Task) => {
    try {
      const next = task.status === 'Completed' ? 'Pending' : 'Completed';
      await api.tasks.updateStatus(task.id, next);
      show(next === 'Completed' ? 'Task completed' : 'Task reopened', 'success');
      await load();
    } catch (e: any) { show(e.message || 'Update failed', 'error'); }
  };
  const changeStatus = async (task: Task, s: Task['status']) => {
    try { await api.tasks.updateStatus(task.id, s); await load(); } catch (e: any) { show(e.message || 'Failed', 'error'); }
  };
  const changeProgress = async (task: Task, p: number) => {
    try { await api.tasks.updateProgress(task.id, p); await load(); } catch (e: any) { show(e.message || 'Failed', 'error'); }
  };

  const title = mode === 'today' ? 'Today' : mode === 'upcoming' ? 'Upcoming' : mode === 'completed' ? 'Completed Tasks'
    : scope === 'team' ? 'Team Tasks' : scope === 'personal' ? 'My Tasks' : 'Tasks';
  const subtitle = scope === 'team' ? 'View and collaborate on team tasks. Team members can monitor each other’s team tasks.' : 'Manage and organize your personal tasks';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <button onClick={()=>{setEditing(null); setModalOpen(true);}} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4"/> New Task</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title or description" className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <select value={priority} onChange={e=>setPriority(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="">All Priorities</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
          </select>
          {scope !== 'team' && (
            <select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {mode === 'all' && (
            <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="">All Statuses</option><option>Pending</option><option>In Progress</option><option>Completed</option>
            </select>
          )}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="createdAt">Sort: Created</option>
            <option value="deadline">Sort: Deadline</option>
            <option value="priority">Sort: Priority</option>
            <option value="progress">Sort: Progress</option>
          </select>
        </div>
      </div>

      {loading ? <div className="text-sm text-slate-500">Loading tasks...</div> : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">
          <p className="font-medium">No tasks found</p>
          <p className="text-sm mt-1">{scope === 'team' ? 'Create a team task or ask your host to add you to a team.' : 'Try adjusting filters or create a new task.'}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(task => (
            <TaskCard key={task.id} task={task}
              onEdit={(t)=>{setEditing(t); setModalOpen(true);}}
              onDelete={(t)=>setDeleting(t)}
              onToggleComplete={toggleComplete}
              onStatusChange={changeStatus}
              onProgressChange={changeProgress}
            />
          ))}
        </div>
      )}

      <TaskFormModal open={modalOpen} onClose={()=>{setModalOpen(false); setEditing(null);}} onSave={save} initial={editing} categories={categories} teams={teams} defaultTeamId={scope === 'team' ? (teamId ?? null) : null} />
      <ConfirmDialog open={!!deleting} title="Delete task" message={`Are you sure you want to delete "${deleting?.title}"? This action cannot be undone. Activity history will be preserved.`} onCancel={()=>setDeleting(null)} onConfirm={doDelete} />
    </div>
  );
}
