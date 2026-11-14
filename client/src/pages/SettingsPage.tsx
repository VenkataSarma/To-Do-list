import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage application preferences</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div>
          <h2 className="font-medium">Appearance</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Theme preference is saved persistently.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={()=>setTheme('light')} className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${theme==='light' ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' : 'border-slate-300 dark:border-slate-700'}`}><Sun className="h-4 w-4"/> Light</button>
          <button onClick={()=>setTheme('dark')} className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${theme==='dark' ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' : 'border-slate-300 dark:border-slate-700'}`}><Moon className="h-4 w-4"/> Dark</button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-medium">Data and persistence</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tasks, categories, activity history, and settings are stored in a local SQLite database managed by the backend API. Data persists across refreshes and restarts.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-medium">Keyboard shortcuts</h2>
        <ul className="mt-2 text-sm text-slate-600 dark:text-slate-300 space-y-1">
          <li><span className="font-medium">N</span> - Open Quick Add Task (when not typing in a field)</li>
          <li><span className="font-medium">Esc</span> - Close open dialogs and menus</li>
        </ul>
      </div>
    </div>
  );
}
