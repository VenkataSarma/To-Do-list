import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, isToday, parseISO, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search, CheckCircle2, Trash2, Edit2, X } from 'lucide-react';
import { api } from '../api/client';
import type { Category, Task } from '../types';
import { useToast } from '../context/ToastContext';
import { TaskFormModal } from '../components/TaskFormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getDeadlineState, isCompletedLate, priorityColors } from '../utils/deadline';
import clsx from 'clsx';

type View = 'month' | 'week' | 'day';

function getTaskDate(task: Task): Date | null {
  if (task.scheduledDate) return parseISO(task.scheduledDate);
  // fallback: show by deadline day if no schedule? keep separate concept; unscheduled section handles none.
  return null;
}

function taskTimeLabel(task: Task) {
  if (task.startTime && task.endTime) return `${task.startTime} - ${task.endTime}`;
  if (task.startTime) return task.startTime;
  return '';
}

function isOverdue(task: Task) {
  if (!task.deadline || task.status === 'Completed') return false;
  return isBefore(parseISO(task.deadline), new Date());
}

export function CalendarPage() {
  const [view, setView] = useState<View>('month');
  const [current, setCurrent] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [extraFilter, setExtraFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [details, setDetails] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [initialSchedule, setInitialSchedule] = useState<{ scheduledDate?: string; startTime?: string; endTime?: string } | undefined>();
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const { show } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([api.tasks.list(), api.categories.list()]);
      setTasks(t); setCategories(c);
    } catch (e: any) { show(e.message || 'Failed to load calendar data', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now); const todayEnd = new Date(todayStart); todayEnd.setHours(23,59,59,999);
    return tasks.filter(t => {
      if (search) {
        const s = search.toLowerCase();
        if (!t.title.toLowerCase().includes(s) && !(t.description || '').toLowerCase().includes(s)) return false;
      }
      if (priority && t.priority !== priority) return false;
      if (categoryId && String(t.categoryId || '') !== categoryId) return false;
      if (status && t.status !== status) return false;
      if (extraFilter === 'completed' && t.status !== 'Completed') return false;
      if (extraFilter === 'incomplete' && t.status === 'Completed') return false;
      if (extraFilter === 'overdue' && !isOverdue(t)) return false;
      if (extraFilter === 'dueToday') {
        if (!t.deadline) return false;
        const d = parseISO(t.deadline);
        if (!(d >= todayStart && d <= todayEnd) || t.status === 'Completed') return false;
      }
      if (extraFilter === 'scheduled' && !t.scheduledDate) return false;
      if (extraFilter === 'unscheduled' && t.scheduledDate) return false;
      return true;
    });
  }, [tasks, search, priority, categoryId, status, extraFilter]);

  const scheduledTasks = filteredTasks.filter(t => !!t.scheduledDate);
  const unscheduledTasks = filteredTasks.filter(t => !t.scheduledDate);

  const monthTasks = useMemo(() => scheduledTasks.filter(t => {
    const d = getTaskDate(t)!;
    return d.getMonth() === current.getMonth() && d.getFullYear() === current.getFullYear();
  }), [scheduledTasks, current]);

  const analytics = useMemo(() => {
    const inMonth = monthTasks;
    const completed = inMonth.filter(t => t.status === 'Completed').length;
    const pending = inMonth.filter(t => t.status !== 'Completed').length;
    const overdue = scheduledTasks.filter(isOverdue).length;
    const now = new Date();
    const upcoming = scheduledTasks.filter(t => t.deadline && isAfter(parseISO(t.deadline), now) && t.status !== 'Completed' && isSameMonth(parseISO(t.deadline), current)).length;
    return { scheduled: inMonth.length, completed, pending, overdue, upcoming };
  }, [monthTasks, scheduledTasks, current]);

  const goToday = () => setCurrent(new Date());
  const goPrev = () => setCurrent(c => view === 'month' ? subMonths(c,1) : view === 'week' ? subWeeks(c,1) : subDays(c,1));
  const goNext = () => setCurrent(c => view === 'month' ? addMonths(c,1) : view === 'week' ? addWeeks(c,1) : addDays(c,1));

  const openCreate = (date: Date, startTime?: string) => {
    const ymd = format(date, 'yyyy-MM-dd');
    setEditing(null);
    setInitialSchedule({ scheduledDate: ymd, startTime, endTime: startTime ? undefined : undefined });
    setModalOpen(true);
  };

  const saveTask = async (data: any) => {
    try {
      if (editing) { await api.tasks.update(editing.id, data); show('Task updated', 'success'); }
      else { await api.tasks.create(data); show('Task created', 'success'); }
      setEditing(null); setInitialSchedule(undefined); await load();
    } catch (e: any) { show(e.message || 'Save failed', 'error'); throw e; }
  };

  const doDelete = async () => {
    if (!deleting) return;
    try { await api.tasks.delete(deleting.id); show('Task deleted', 'success'); setDeleting(null); setDetails(null); await load(); }
    catch (e: any) { show(e.message || 'Delete failed', 'error'); }
  };
  const markComplete = async (task: Task) => {
    try { await api.tasks.updateStatus(task.id, task.status === 'Completed' ? 'Pending' : 'Completed'); show(task.status === 'Completed' ? 'Task reopened' : 'Task completed', 'success'); setDetails(null); await load(); }
    catch (e: any) { show(e.message || 'Update failed', 'error'); }
  };

  const reschedule = async (taskId: number, date: Date, startTime?: string | null) => {
    const prev = tasks.find(t => t.id === taskId);
    if (!prev) return;
    const scheduledDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).toISOString();
    // optimistic
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, scheduledDate, startTime: startTime !== undefined ? startTime : t.startTime } : t));
    try {
      await api.tasks.updateSchedule(taskId, { scheduledDate, startTime: startTime !== undefined ? startTime : prev.startTime, endTime: prev.endTime, estimatedDuration: prev.estimatedDuration ?? null });
      show('Task rescheduled', 'success');
      await load();
    } catch (e: any) {
      show(e.message || 'Failed to reschedule', 'error');
      setTasks(ts => ts.map(t => t.id === taskId ? prev : t)); // revert
    }
  };

  const onDropToDay = (e: React.DragEvent, date: Date, startTime?: string) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/task-id') || draggingId);
    if (!id) return;
    reschedule(id, date, startTime);
    setDraggingId(null);
  };

  const TaskChip = ({ task, compact = false }: { task: Task; compact?: boolean }) => {
    const completedLate = isCompletedLate(task);
    const state = task.status === 'Completed' ? (completedLate ? 'completed-late' : 'completed') : isOverdue(task) ? 'overdue' : task.status === 'In Progress' ? 'progress' : 'pending';
    return (
      <button
        draggable
        onDragStart={(e) => { setDraggingId(task.id); e.dataTransfer.setData('text/task-id', String(task.id)); e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => setDraggingId(null)}
        onClick={(e) => { e.stopPropagation(); setDetails(task); }}
        className={clsx('w-full text-left rounded-md border px-2 py-1 mb-1 text-xs transition-colors',
          state === 'completed' && 'bg-slate-100 text-slate-500 border-slate-200 line-through dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
          state === 'completed-late' && 'bg-amber-50 text-amber-700 border-amber-200 line-through dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900',
          state === 'overdue' && 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900',
          state === 'progress' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900',
          state === 'pending' && 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800',
          task.priority === 'Critical' && !String(state).startsWith('completed') && 'ring-1 ring-red-400'
        )}
        title={completedLate ? `${task.title} (Completed late)` : task.title}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span className={clsx('h-2 w-2 rounded-full shrink-0',
            completedLate ? 'bg-amber-500' : task.priority === 'Critical' ? 'bg-red-500' : task.priority === 'High' ? 'bg-orange-500' : task.priority === 'Medium' ? 'bg-blue-500' : 'bg-slate-400'
          )} />
          {!compact && taskTimeLabel(task) && <span className="shrink-0 text-[10px] opacity-80">{taskTimeLabel(task)}</span>}
          <span className="truncate font-medium">{task.title}</span>
          {completedLate && <span className="shrink-0 text-[10px] font-medium">(Late)</span>}
        </div>
      </button>
    );
  };

  const monthStart = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const weekStart = startOfWeek(current, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6..23

  const headerLabel = view === 'month' ? format(current, 'MMMM yyyy') : view === 'week' ? `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart,6), 'MMM d, yyyy')}` : format(current, 'EEEE, MMMM d, yyyy');

  const clearFilters = () => { setSearch(''); setPriority(''); setCategoryId(''); setStatus(''); setExtraFilter(''); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-blue-600" /> Calendar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Schedule, view, and manage tasks by date</p>
        </div>
        <button onClick={() => openCreate(current)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Add Task</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Scheduled this month</div><div className="text-xl font-semibold">{analytics.scheduled}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Completed this month</div><div className="text-xl font-semibold">{analytics.completed}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Pending this month</div><div className="text-xl font-semibold">{analytics.pending}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Overdue</div><div className="text-xl font-semibold text-red-600 dark:text-red-400">{analytics.overdue}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Upcoming deadlines (month)</div><div className="text-xl font-semibold">{analytics.upcoming}</div></div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="rounded-md border border-slate-300 p-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={goToday} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Today</button>
            <button onClick={goNext} className="rounded-md border border-slate-300 p-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
            <div className="text-lg font-semibold ml-1">{headerLabel}</div>
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800 text-sm">
            {(['month','week','day'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)} className={clsx('px-3 py-1.5 rounded-md capitalize', view===v ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500')}>{v}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks" className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <select value={priority} onChange={e=>setPriority(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">All Priorities</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
          <select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">All Categories</option>{categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">All Statuses</option><option>Pending</option><option>In Progress</option><option>Completed</option></select>
          <select value={extraFilter} onChange={e=>setExtraFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="">More Filters</option>
            <option value="completed">Completed</option>
            <option value="incomplete">Incomplete</option>
            <option value="overdue">Overdue</option>
            <option value="dueToday">Due Today</option>
            <option value="scheduled">Scheduled</option>
            <option value="unscheduled">Unscheduled</option>
          </select>
          <button onClick={clearFilters} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Clear filters</button>
        </div>

        {loading ? <div className="text-sm text-slate-500">Loading calendar...</div> : (
          <>
            {view === 'month' && (
              <div className="overflow-x-auto">
                <div className="min-w-[700px] grid grid-cols-7 border-t border-l border-slate-200 dark:border-slate-700">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2 text-xs font-semibold text-slate-500">{d}</div>)}
                  {monthDays.map(day => {
                    const dayTasks = scheduledTasks.filter(t => isSameDay(getTaskDate(t)!, day)).sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||''));
                    const shown = dayTasks.slice(0,3);
                    const more = dayTasks.length - shown.length;
                    return (
                      <div key={day.toISOString()} onClick={() => { setCurrent(day); setView('day'); }}
                        onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>onDropToDay(e, day)}
                        className={clsx('min-h-[120px] border-r border-b border-slate-200 dark:border-slate-700 p-2 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40', !isSameMonth(day, current) && 'bg-slate-50/50 dark:bg-slate-900/30 text-slate-400')}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={clsx('text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full', isToday(day) && 'bg-blue-600 text-white')}>{format(day,'d')}</span>
                          <button onClick={(e)=>{e.stopPropagation(); openCreate(day);}} className="text-slate-400 hover:text-blue-600 p-0.5"><Plus className="h-3.5 w-3.5"/></button>
                        </div>
                        <div onClick={(e)=>e.stopPropagation()}>
                          {shown.map(t => <TaskChip key={t.id} task={t} compact />)}
                          {more > 0 && <div className="text-[11px] text-slate-500 px-1">+{more} more</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {view === 'week' && (
              <div className="overflow-x-auto">
                <div className="min-w-[900px] grid grid-cols-7 border-t border-l border-slate-200 dark:border-slate-700">
                  {weekDays.map(day => {
                    const dayTasks = scheduledTasks.filter(t => isSameDay(getTaskDate(t)!, day)).sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||''));
                    return (
                      <div key={day.toISOString()} className={clsx('min-h-[420px] border-r border-b border-slate-200 dark:border-slate-700', isToday(day) && 'bg-blue-50/30 dark:bg-blue-950/10')}
                        onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>onDropToDay(e, day)}>
                        <div className={clsx('p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between', isToday(day) && 'font-semibold text-blue-700 dark:text-blue-300')}>
                          <div><div className="text-xs text-slate-500">{format(day,'EEE')}</div><div>{format(day,'MMM d')}</div></div>
                          <button onClick={()=>openCreate(day)} className="text-slate-400 hover:text-blue-600"><Plus className="h-4 w-4"/></button>
                        </div>
                        <div className="p-2 space-y-1">
                          {dayTasks.length === 0 ? <div className="text-xs text-slate-400">No tasks</div> : dayTasks.map(t => <TaskChip key={t.id} task={t} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {view === 'day' && (
              <div className="grid lg:grid-cols-[1fr_280px] gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium flex items-center justify-between">
                    <span>{isToday(current) ? 'Today' : format(current,'EEEE')} schedule (6 AM - 11 PM)</span>
                    <button onClick={()=>openCreate(current)} className="text-sm text-blue-600 hover:underline">Add task</button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-auto">
                    {hours.map(h => {
                      const slotTasks = scheduledTasks.filter(t => isSameDay(getTaskDate(t)!, current) && t.startTime && Number(t.startTime.split(':')[0]) === h);
                      const label = format(new Date().setHours(h,0,0,0), 'h:00 a');
                      const now = new Date();
                      const isCurrentHour = isToday(current) && now.getHours() === h;
                      return (
                        <div key={h} className={clsx('flex min-h-[56px]', isCurrentHour && 'bg-blue-50/40 dark:bg-blue-950/20')}
                          onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>onDropToDay(e, current, `${String(h).padStart(2,'0')}:00`)}
                          onClick={(e)=>{ if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.slot) openCreate(current, `${String(h).padStart(2,'0')}:00`); }}>
                          <div data-slot="1" className="w-24 shrink-0 p-2 text-xs text-slate-500 border-r border-slate-100 dark:border-slate-800">{label}</div>
                          <div data-slot="1" className="flex-1 p-2 space-y-1 cursor-pointer">
                            {slotTasks.map(t => <TaskChip key={t.id} task={t} />)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <h3 className="font-medium mb-2">Unscheduled / no time</h3>
                    <div className="space-y-1">
                      {scheduledTasks.filter(t => isSameDay(getTaskDate(t)!, current) && !t.startTime).map(t => <TaskChip key={t.id} task={t} />)}
                      {scheduledTasks.filter(t => isSameDay(getTaskDate(t)!, current) && !t.startTime).length === 0 && <p className="text-xs text-slate-500">No unscheduled-time tasks for this day.</p>}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <h3 className="font-medium mb-2">Unscheduled Tasks</h3>
                    <p className="text-xs text-slate-500 mb-2">Tasks without a scheduled date. Drag onto a day in Month/Week view to schedule.</p>
                    <div className="space-y-1 max-h-72 overflow-auto">
                      {unscheduledTasks.map(t => <TaskChip key={t.id} task={t} />)}
                      {unscheduledTasks.length === 0 && <p className="text-xs text-slate-500">No unscheduled tasks.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold mb-2">Unscheduled Tasks</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Tasks without a scheduled date. Open them to schedule, or drag to a calendar date (Month/Week view).</p>
        {unscheduledTasks.length === 0 ? <p className="text-sm text-slate-500">All filtered tasks are scheduled.</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {unscheduledTasks.map(t => <TaskChip key={t.id} task={t} />)}
          </div>
        )}
      </div>

      <TaskFormModal open={modalOpen} onClose={()=>{setModalOpen(false); setEditing(null); setInitialSchedule(undefined);}} onSave={saveTask} initial={editing} categories={categories} initialSchedule={initialSchedule} />
      <ConfirmDialog open={!!deleting} title="Delete task" message={`Are you sure you want to delete "${deleting?.title}"?`} onCancel={()=>setDeleting(null)} onConfirm={doDelete} />

      {details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setDetails(null)} />
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{details.title}</h3>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${priorityColors[details.priority]}`}>{details.priority}</span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${isCompletedLate(details) ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700'}`}>{isCompletedLate(details) ? 'Completed Late' : details.status}</span>
                  {details.category && <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{details.category.name}</span>}
                </div>
              </div>
              <button onClick={()=>setDetails(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5"/></button>
            </div>
            {details.description && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{details.description}</p>}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-slate-500 text-xs">Scheduled date</div><div>{details.scheduledDate ? format(parseISO(details.scheduledDate), 'MMM d, yyyy') : 'Not scheduled'}</div></div>
              <div><div className="text-slate-500 text-xs">Time</div><div>{taskTimeLabel(details) || 'Not set'}</div></div>
              <div><div className="text-slate-500 text-xs">Deadline</div><div>{details.deadline ? format(parseISO(details.deadline), 'MMM d, yyyy h:mm a') : 'No deadline'}</div></div>
              <div><div className="text-slate-500 text-xs">Estimated duration</div><div>{details.estimatedDuration ? `${details.estimatedDuration} min` : 'Not set'}</div></div>
              <div><div className="text-slate-500 text-xs">Progress</div><div>{details.progress}%</div></div>
              <div><div className="text-slate-500 text-xs">Deadline status</div><div>{getDeadlineState(details)}</div></div>
            </div>
            <div className="mt-3"><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-blue-600" style={{width:`${details.progress}%`}}/></div></div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button onClick={()=>markComplete(details)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><CheckCircle2 className="h-4 w-4"/>{details.status==='Completed' ? 'Reopen' : 'Mark completed'}</button>
              <button onClick={()=>{ setEditing(details); setInitialSchedule(undefined); setDetails(null); setModalOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Edit2 className="h-4 w-4"/>Edit</button>
              <button onClick={()=>setDeleting(details)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"><Trash2 className="h-4 w-4"/>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
