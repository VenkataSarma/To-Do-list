import { Calendar, CheckCircle2, Circle, Clock, Edit2, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Task } from '../types';
import { deadlineColors, deadlineLabel, getDeadlineState, isCompletedLate, priorityColors } from '../utils/deadline';
import { useState } from 'react';

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onStatusChange: (task: Task, status: Task['status']) => void;
  onProgressChange: (task: Task, progress: number) => void;
}

export function TaskCard({ task, onEdit, onDelete, onToggleComplete, onStatusChange, onProgressChange }: Props) {
  const [menu, setMenu] = useState(false);
  const state = getDeadlineState(task);
  const completed = task.status === 'Completed';
  const completedLate = isCompletedLate(task);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <button onClick={() => onToggleComplete(task)} className="mt-0.5 text-slate-400 hover:text-blue-600" title={completed ? 'Reopen task' : 'Mark complete'}>
          {completed ? <CheckCircle2 className={`h-5 w-5 ${completedLate ? 'text-amber-600' : 'text-emerald-600'}`} /> : <Circle className="h-5 w-5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={`font-medium ${completed ? 'line-through text-slate-500 dark:text-slate-400' : ''}`}>{task.title}</h3>
              {task.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{task.description}</p>}
            </div>
            <div className="relative">
              <button onClick={()=>setMenu(v=>!v)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><MoreHorizontal className="h-4 w-4" /></button>
              {menu && (
                <div className="absolute right-0 mt-1 w-40 rounded-lg border border-slate-200 bg-white shadow-lg z-10 dark:border-slate-700 dark:bg-slate-900 py-1 text-sm">
                  <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={()=>{setMenu(false); onEdit(task);}}><Edit2 className="h-4 w-4" /> Edit</button>
                  <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={()=>{setMenu(false); onToggleComplete(task);}}>{completed ? <><RotateCcw className="h-4 w-4"/> Reopen</> : <><CheckCircle2 className="h-4 w-4"/> Complete</>}</button>
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={()=>{setMenu(false); onDelete(task);}}><Trash2 className="h-4 w-4" /> Delete</button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${priorityColors[task.priority]}`}>{task.priority}</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${completedLate ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700'}`}>{completedLate ? 'Completed Late' : task.status}</span>
            {task.team ? <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900">Team: {task.team.name}</span> : <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Personal</span>}
            {task.team && task.user && <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">By {task.user.name || task.user.email}</span>}
            {task.category && <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{task.category.name}</span>}
            <span className={`inline-flex items-center gap-1 ${deadlineColors[state]}`}><Clock className="h-3.5 w-3.5" /> {deadlineLabel(task)}</span>
            {task.deadline && <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400"><Calendar className="h-3.5 w-3.5" /> {format(parseISO(task.deadline), 'MMM d, yyyy h:mm a')}</span>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[180px]">
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Progress</span><span>{task.progress}%</span></div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${task.progress}%` }} /></div>
            </div>
            {!completed && (
              <select value={task.status} onChange={e=>onStatusChange(task, e.target.value as Task['status'])} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950">
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            )}
            {!completed && (
              <input type="range" min={0} max={100} value={task.progress} onChange={e=>onProgressChange(task, Number(e.target.value))} className="w-28" />
            )}
          </div>
        </div>
      </div>
      {menu && <div className="fixed inset-0 z-0" onClick={()=>setMenu(false)} />}
    </div>
  );
}
