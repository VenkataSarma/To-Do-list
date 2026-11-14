import { useEffect, useState } from 'react';
import { format, isAfter, parseISO, startOfDay, endOfDay } from 'date-fns';
import { api } from '../api/client';
import type { ActivityLog, DashboardStats, ProductivityData, Task } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CheckCircle2, Clock3, ListTodo, AlertTriangle, CalendarDays, TrendingUp } from 'lucide-react';
import { getDeadlineState, deadlineLabel } from '../utils/deadline';

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prod, setProd] = useState<ProductivityData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<ActivityLog[]>([]);
  const [chart, setChart] = useState<'daily'|'weekly'|'monthly'>('daily');

  useEffect(() => {
    Promise.all([api.dashboard.stats(), api.dashboard.productivity(), api.tasks.list(), api.history.list()]).then(([s,p,t,h]) => {
      setStats(s); setProd(p); setTasks(t); setHistory(h.slice(0,8));
    }).catch(()=>{});
  }, []);

  const now = new Date();
  const start = startOfDay(now); const end = endOfDay(now);
  const todayTasks = tasks.filter(t => t.deadline && new Date(t.deadline) >= start && new Date(t.deadline) <= end && t.status !== 'Completed').slice(0,5);
  const upcoming = tasks.filter(t => t.deadline && isAfter(parseISO(t.deadline), end) && t.status !== 'Completed')
    .sort((a,b)=> new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()).slice(0,5);
  const chartData = prod ? (chart === 'daily' ? prod.daily : chart === 'weekly' ? prod.weekly : prod.monthly) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Good to see you</h1>
        <p className="text-slate-500 dark:text-slate-400">{format(now, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <StatCard label="Total Tasks" value={stats.total} icon={ListTodo} />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} />
          <StatCard label="Pending" value={stats.pending} icon={Clock3} />
          <StatCard label="In Progress" value={stats.inProgress} icon={TrendingUp} />
          <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} />
          <StatCard label="Due Today" value={stats.dueToday} icon={CalendarDays} />
          <StatCard label="Completion" value={`${stats.completionRate}%`} icon={CheckCircle2} />
        </div>
      )}

      {stats && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-2"><h2 className="font-semibold">Overall Progress</h2><span className="text-sm text-slate-500">{stats.completionRate}%</span></div>
          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${stats.completionRate}%` }} /></div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{stats.completed} of {stats.total} tasks completed</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Productivity Chart</h2>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 text-xs">
              {(['daily','weekly','monthly'] as const).map(k => (
                <button key={k} onClick={()=>setChart(k)} className={`px-3 py-1 rounded-md capitalize ${chart===k ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'}`}>{k}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="completed" fill="#2563eb" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold mb-3">Recent Activity</h2>
          <div className="space-y-3">
            {history.length === 0 ? <p className="text-sm text-slate-500">No activity yet.</p> : history.map(h => (
              <div key={h.id} className="text-sm border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                <div className="font-medium">{h.actionType.replaceAll('_',' ')}</div>
                <div className="text-slate-600 dark:text-slate-400">{h.taskTitleSnapshot}</div>
                <div className="text-xs text-slate-400">{format(parseISO(h.timestamp), 'MMM d, h:mm a')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold mb-3">Today's Tasks</h2>
          {todayTasks.length === 0 ? <p className="text-sm text-slate-500">No tasks due today.</p> : (
            <ul className="space-y-3">{todayTasks.map(t => (
              <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <div><div className="font-medium">{t.title}</div><div className="text-xs text-slate-500">{t.category?.name || 'No category'} · {t.priority}</div></div>
                <span className="text-xs text-orange-600 dark:text-orange-400">{deadlineLabel(t)}</span>
              </li>
            ))}</ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold mb-3">Upcoming Deadlines</h2>
          {upcoming.length === 0 ? <p className="text-sm text-slate-500">No upcoming deadlines.</p> : (
            <ul className="space-y-3">{upcoming.map(t => (
              <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <div><div className="font-medium">{t.title}</div><div className="text-xs text-slate-500">{t.deadline ? format(parseISO(t.deadline), 'MMM d, h:mm a') : ''}</div></div>
                <span className={`text-xs ${getDeadlineState(t)==='Due Soon' ? 'text-amber-600' : 'text-emerald-600'}`}>{deadlineLabel(t)}</span>
              </li>
            ))}</ul>
          )}
        </div>
      </div>
    </div>
  );
}
