import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Category, Priority, Status, Task, Team } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: Task | null;
  categories: Category[];
  teams?: Team[];
  defaultTeamId?: number | null;
  initialSchedule?: { scheduledDate?: string; startTime?: string; endTime?: string };
}

const priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
const statuses: Status[] = ['Pending', 'In Progress', 'Completed'];

function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toDateInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export function TaskFormModal({ open, onClose, onSave, initial, categories, teams = [], defaultTeamId = null, initialSchedule }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<Status>('Pending');
  const [startDate, setStartDate] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initial) {
      setTitle(initial.title); setDescription(initial.description || '');
      setTeamId(initial.teamId ?? '');
      setCategoryId(initial.categoryId ?? '');
      setPriority(initial.priority); setStatus(initial.status);
      setStartDate(toLocalInput(initial.startDate));
      setScheduledDate(toDateInput(initial.scheduledDate));
      setStartTime(initial.startTime || '');
      setEndTime(initial.endTime || '');
      setEstimatedDuration(initial.estimatedDuration ?? '');
      setDeadline(toLocalInput(initial.deadline));
      setProgress(initial.progress ?? 0);
    } else {
      setTitle(''); setDescription(''); setTeamId(defaultTeamId ?? ''); setCategoryId(''); setPriority('Medium'); setStatus('Pending');
      setStartDate(''); setScheduledDate(initialSchedule?.scheduledDate || ''); setStartTime(initialSchedule?.startTime || ''); setEndTime(initialSchedule?.endTime || '');
      setEstimatedDuration(''); setDeadline(''); setProgress(0);
    }
  }, [open, initial, initialSchedule, defaultTeamId]);

  if (!open) return null;

  const isTeamTask = teamId !== '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const scheduledISO = scheduledDate ? new Date(`${scheduledDate}T12:00:00`).toISOString() : null;
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        teamId: teamId === '' ? null : Number(teamId),
        categoryId: (teamId === '' && categoryId !== '') ? Number(categoryId) : null,
        priority, status,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        scheduledDate: scheduledISO,
        startTime: startTime || null,
        endTime: endTime || null,
        estimatedDuration: estimatedDuration === '' ? null : Number(estimatedDuration),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        progress: status === 'Completed' ? 100 : progress,
      });
      onClose();
    } catch (err: any) { setError(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{initial ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Task title" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Optional details" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Task type</label>
                <select value={teamId} onChange={e=>setTeamId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                  <option value="">Personal task (only you)</option>
                  {teams.map(t => <option key={t.id} value={t.id}>Team task - {t.name}</option>)}
                </select>
                {isTeamTask && <p className="mt-1 text-xs text-slate-500">Team tasks are visible to all members of the selected team.</p>}
              </div>
            )}
            {!isTeamTask && (
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={categoryId} onChange={e=>setCategoryId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                  <option value="">None</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select value={priority} onChange={e=>setPriority(e.target.value as Priority)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                {priorities.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value as Status)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Progress ({status === 'Completed' ? 100 : progress}%)</label>
              <input type="range" min={0} max={100} value={status === 'Completed' ? 100 : progress} disabled={status==='Completed'} onChange={e=>setProgress(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled date</label>
              <input type="date" value={scheduledDate} onChange={e=>setScheduledDate(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estimated duration (minutes)</label>
              <input type="number" min={0} value={estimatedDuration} onChange={e=>setEstimatedDuration(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start time</label>
              <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End time</label>
              <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start date (legacy)</label>
              <input type="datetime-local" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deadline</label>
              <input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
