import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

type Theme = 'light' | 'dark';
interface ThemeCtx { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void; }
const Ctx = createContext<ThemeCtx | null>(null);

const THEME_KEY = 'taskflow_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const initial = saved === 'dark' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', initial === 'dark');
    return initial;
  });

  useEffect(() => {
    api.settings.get().then(s => {
      const t = (s.theme === 'dark' ? 'dark' : 'light') as Theme;
      setThemeState(t);
      localStorage.setItem(THEME_KEY, t);
      document.documentElement.classList.toggle('dark', t === 'dark');
    }).catch(() => {
      // keep local/default (light) when not authenticated or unavailable
      const saved = localStorage.getItem(THEME_KEY);
      const t: Theme = saved === 'dark' ? 'dark' : 'light';
      setThemeState(t);
      document.documentElement.classList.toggle('dark', t === 'dark');
    });
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    api.settings.update({ theme: t }).catch(() => {});
  };
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return <Ctx.Provider value={{ theme, toggle, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
}
