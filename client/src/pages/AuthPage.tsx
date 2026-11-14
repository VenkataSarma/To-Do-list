import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function AuthPage() {
  const { user, login, register } = useAuth();
  const { show } = useToast();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login');
  useEffect(() => {
    const m = params.get('mode');
    if (m === 'login' || m === 'register') setMode(m);
  }, [params]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        show('Logged in successfully', 'success');
      } else {
        await register(email, password, name || undefined);
        show('Account created', 'success');
      }
    } catch (err: any) {
      show(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 text-xl font-semibold"><CheckSquare className="h-6 w-6 text-blue-600" /> TaskFlow</div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Home</Link>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{mode === 'login' ? 'Sign in to your account' : 'Create a new account'}</p>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium mb-1">Name (optional)</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            <p className="text-xs text-slate-500 mt-1">At least 6 characters.</p>
          </div>
          <button disabled={loading} type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          {mode === 'login' ? (
            <>No account? <button onClick={() => setMode('register')} className="text-blue-600 hover:underline">Register</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode('login')} className="text-blue-600 hover:underline">Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
