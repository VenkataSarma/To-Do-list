import { Link } from 'react-router-dom';
import { CheckSquare, Users, CalendarDays, BarChart3 } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-xl font-semibold"><CheckSquare className="h-6 w-6 text-blue-600" /> TaskFlow</div>
        <div className="flex items-center gap-3">
          <Link to="/auth?mode=login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Login</Link>
          <Link to="/auth?mode=register" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Register</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12 md:py-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Organize your work, personally and with your team</h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Track tasks, deadlines, progress, and schedules in one place. Keep personal tasks private and collaborate on team tasks where everyone can stay aligned.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth?mode=register" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">Get started</Link>
            <Link to="/auth?mode=login" className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">Sign in</Link>
          </div>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={<CheckSquare className="h-5 w-5 text-blue-600" />} title="Personal tasks" desc="Plan and track your own work with priorities, deadlines, and progress." />
          <Feature icon={<Users className="h-5 w-5 text-blue-600" />} title="Team collaboration" desc="Work together on shared team tasks and keep everyone in sync." />
          <Feature icon={<CalendarDays className="h-5 w-5 text-blue-600" />} title="Calendar & scheduling" desc="Schedule tasks, reschedule easily, and manage your time." />
          <Feature icon={<BarChart3 className="h-5 w-5 text-blue-600" />} title="Insights" desc="See progress, history, and productivity at a glance." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2">{icon}</div>
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</div>
    </div>
  );
}
