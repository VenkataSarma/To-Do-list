import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, CalendarDays, CalendarClock, CheckCircle2, History, Settings, FolderKanban, Menu, Moon, Sun, Plus, LogOut, Users } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const nav = [
  { to: '/', label: 'My Tasks', icon: CheckSquare, section: 'Personal' },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Personal' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, section: 'Personal' },
  { to: '/today', label: 'Today', icon: CalendarDays, section: 'Personal' },
  { to: '/upcoming', label: 'Upcoming', icon: CalendarClock, section: 'Personal' },
  { to: '/completed', label: 'Completed', icon: CheckCircle2, section: 'Personal' },
  { to: '/team-tasks', label: 'Team Tasks', icon: Users, section: 'Team' },
  { to: '/teams', label: 'Teams', icon: Users, section: 'Team' },
  { to: '/history', label: 'History', icon: History, section: 'Other' },
  { to: '/categories', label: 'Categories', icon: FolderKanban, section: 'Other' },
  { to: '/settings', label: 'Settings', icon: Settings, section: 'Other' },
];

export function AppLayout({ onQuickAdd }: { onQuickAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside className={clsx('fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 transform transition-transform md:sticky md:top-0 md:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
          <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 font-semibold tracking-tight"><CheckSquare className="h-5 w-5 text-blue-600" /> TaskFlow</div>
            <button className="md:hidden text-slate-500" onClick={() => setOpen(false)} aria-label="Close menu">Close</button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-3">
            {['Personal', 'Team', 'Other'].map(section => (
              <div key={section}>
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{section}</div>
                <div className="space-y-1">
                  {nav.filter(n => n.section === section).map(item => {
                    const Icon = item.icon;
                    return (
                      <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setOpen(false)}
                        className={({ isActive }) => clsx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white')}>
                        <Icon className="h-4 w-4" /> {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="shrink-0 p-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 space-y-2">
            <button onClick={onQuickAdd} className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"><Plus className="h-4 w-4" /> Quick Add Task</button>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">Signed in as</div>
              <div className="text-sm font-medium truncate" title={user?.email}>{user?.name || user?.email}</div>
              {user?.name && <div className="text-xs text-slate-500 truncate">{user.email}</div>}
            </div>
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"><LogOut className="h-4 w-4" /> Logout</button>
          </div>
        </aside>
        {open && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}

        <div className="flex-1 md:ml-0 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 md:px-8">
            <div className="flex items-center gap-3">
              <button className="md:hidden rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
              <div className="text-sm text-slate-500 dark:text-slate-400">{nav.find(n => n.to === location.pathname)?.label || 'TaskFlow'}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 max-w-[180px] truncate">{user?.email}</span>
              <button onClick={toggle} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Toggle theme">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8"><Outlet /></main>
        </div>
      </div>
    </div>
  );
}
