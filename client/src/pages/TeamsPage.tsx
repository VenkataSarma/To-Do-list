import { useEffect, useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { api } from '../api/client';
import type { Team } from '../types';
import { useToast } from '../context/ToastContext';

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [emails, setEmails] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const { show } = useToast();

  const load = async () => {
    setLoading(true);
    try { setTeams(await api.teams.list()); }
    catch (e: any) { show(e.message || 'Failed to load teams', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.teams.create({ name: name.trim() });
      setName('');
      show('Team created', 'success');
      await load();
    } catch (e: any) { show(e.message || 'Failed to create team', 'error'); }
  };

  const addMember = async (teamId: number) => {
    const email = (emails[teamId] || '').trim();
    if (!email) return;
    try {
      await api.teams.addMember(teamId, { email });
      setEmails(prev => ({ ...prev, [teamId]: '' }));
      show('Member added', 'success');
      await load();
    } catch (e: any) { show(e.message || 'Failed to add member', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Teams</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Create teams and collaborate on shared team tasks. Add members by the email they used to register in TaskFlow.</p>
      </div>

      <form onSubmit={create} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row gap-3">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="New team name" className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Create Team</button>
      </form>

      {loading ? <div className="text-sm text-slate-500">Loading teams...</div> : teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">
          <p className="font-medium">No teams yet</p>
          <p className="text-sm mt-1">Create a team to start collaborating. Team tasks are visible to all members.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {teams.map(team => (
            <div key={team.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h2 className="font-semibold">{team.name}</h2>
                  <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{team.myRole === 'host' ? 'Host' : 'Member'}</span>
                </div>
                <div className="text-xs text-slate-500">{team._count?.tasks ?? 0} team task(s)</div>
              </div>
              <div className="mb-3">
                <div className="text-sm font-medium mb-1">Members</div>
                <div className="flex flex-wrap gap-2">
                  {(team.members || []).map(m => (
                    <span key={m.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-xs dark:border-slate-700">
                      {m.user?.name || m.user?.email} {m.role === 'host' ? '(host)' : ''}
                    </span>
                  ))}
                </div>
              </div>
              {team.myRole === 'host' && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={emails[team.id] || ''} onChange={e=>setEmails(prev=>({ ...prev, [team.id]: e.target.value }))} placeholder="Add member by registered email" className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                  <button onClick={() => addMember(team.id)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">Add member</button>
                </div>
              )}
              {team.myRole !== 'host' && <p className="text-xs text-slate-500">Only the host can add members by email.</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
