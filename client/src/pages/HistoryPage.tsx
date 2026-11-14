import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { api } from '../api/client';
import type { ActivityLog } from '../types';
import { Search } from 'lucide-react';

export function HistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('');

  useEffect(() => { api.history.list().then(setLogs).catch(()=>{}); }, []);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (actionType && l.actionType !== actionType) return false;
      if (search) {
        const s = search.toLowerCase();
        return l.taskTitleSnapshot.toLowerCase().includes(s) || l.actionType.toLowerCase().includes(s);
      }
      return true;
    });
  }, [logs, search, actionType]);

  const groups = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    for (const l of filtered) {
      const day = format(parseISO(l.timestamp), 'yyyy-MM-dd');
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(l);
    }
    return Array.from(map.entries()).sort((a,b)=> b[0].localeCompare(a[0]));
  }, [filtered]);

  const actionTypes = Array.from(new Set(logs.map(l => l.actionType))).sort();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Permanent activity timeline for all task changes</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search activity" className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </div>
        <select value={actionType} onChange={e=>setActionType(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
          <option value="">All Actions</option>
          {actionTypes.map(a => <option key={a} value={a}>{a.replaceAll('_',' ')}</option>)}
        </select>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">No history records found.</div>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <div key={day}>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">{format(parseISO(day), 'EEEE, MMMM d, yyyy')}</h2>
              <div className="space-y-3">
                {items.map(l => (
                  <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{l.actionType.replaceAll('_',' ')}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">{l.taskTitleSnapshot}{l.taskId ? ` (Task #${l.taskId})` : ' (Task removed)'}</div>
                      </div>
                      <div className="text-xs text-slate-500">{format(parseISO(l.timestamp), 'h:mm:ss a')}</div>
                    </div>
                    {(l.previousValue || l.newValue) && (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 grid gap-1">
                        {l.previousValue && <div><span className="font-medium">Previous:</span> {l.previousValue}</div>}
                        {l.newValue && <div><span className="font-medium">New:</span> {l.newValue}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
