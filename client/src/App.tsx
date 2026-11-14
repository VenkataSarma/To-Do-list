import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { HistoryPage } from './pages/HistoryPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { SettingsPage } from './pages/SettingsPage';
import { CalendarPage } from './pages/CalendarPage';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { TeamsPage } from './pages/TeamsPage';

function ProtectedShell() {
  const { user, loading } = useAuth();
  const [quickAdd, setQuickAdd] = useState(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (!typing && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setQuickAdd(v => v + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">Loading...</div>;
  if (!user) return <Navigate to="/" replace />;

  return (
    <Routes>
      <Route element={<AppLayout onQuickAdd={() => setQuickAdd(v => v + 1)} />}>
        <Route index element={<TasksPage quickAddSignal={quickAdd} mode="all" scope="personal" />} />
        <Route path="tasks" element={<Navigate to="/" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="today" element={<TasksPage quickAddSignal={quickAdd} mode="today" scope="personal" />} />
        <Route path="upcoming" element={<TasksPage quickAddSignal={quickAdd} mode="upcoming" scope="personal" />} />
        <Route path="completed" element={<TasksPage quickAddSignal={quickAdd} mode="completed" scope="personal" />} />
        <Route path="team-tasks" element={<TasksPage quickAddSignal={quickAdd} mode="all" scope="team" />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">Loading...</div>;
  return (
    <Routes>
      <Route path="/" element={user ? <ProtectedShell /> : <LandingPage />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/*" element={user ? <ProtectedShell /> : <Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
