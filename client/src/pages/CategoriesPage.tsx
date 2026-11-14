import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Category } from '../types';
import { useToast } from '../context/ToastContext';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState<Category | null>(null);
  const { show } = useToast();

  const load = () => api.categories.list().then(setCats).catch(()=>{});
  useEffect(()=>{ load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try { await api.categories.create(name.trim()); setName(''); show('Category created', 'success'); load(); }
    catch (err: any) { show(err.message, 'error'); }
  };
  const saveEdit = async () => {
    if (!editing || !editName.trim()) return;
    try { await api.categories.update(editing.id, editName.trim()); setEditing(null); show('Category updated', 'success'); load(); }
    catch (err: any) { show(err.message, 'error'); }
  };
  const doDelete = async () => {
    if (!deleting) return;
    try { await api.categories.delete(deleting.id); setDeleting(null); show('Category deleted', 'success'); load(); }
    catch (err: any) { show(err.message, 'error'); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage default and custom categories</p>
      </div>
      <form onSubmit={create} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex gap-2">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="New category name" className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4"/> Add</button>
      </form>
      <div className="grid gap-3">
        {cats.map(c => (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-slate-500">{c.isDefault ? 'Default category' : 'Custom category'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>{setEditing(c); setEditName(c.name);}} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Edit"><Pencil className="h-4 w-4"/></button>
              <button onClick={()=>setDeleting(c)} disabled={c.isDefault} className="p-2 rounded hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:hover:bg-transparent" aria-label="Delete"><Trash2 className="h-4 w-4"/></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setEditing(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold mb-3">Edit Category</h3>
            <input value={editName} onChange={e=>setEditName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setEditing(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Cancel</button>
              <button onClick={saveEdit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Save</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!deleting} title="Delete category" message={`Delete "${deleting?.name}"? Tasks in this category will be uncategorized.`} onCancel={()=>setDeleting(null)} onConfirm={doDelete} />
    </div>
  );
}
