'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FolderOpen, Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/inputs';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const ICONS = ['folder', 'book-open', 'code-2', 'users', 'bar-chart-2', 'shield', 'settings', 'globe', 'database', 'briefcase'];

export default function CategoriesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const isAdmin = session?.user?.role === 'admin';

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [form, setForm] = useState({ name: '', description: '', icon: 'folder', color: '#6366f1', parent_id: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = () => {
    fetch('/api/categories').then(r => r.json()).then(d => {
      setCategories(d.categories || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', description: '', icon: 'folder', color: '#6366f1', parent_id: '' });
    setModalOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditTarget(cat);
    setForm({ name: cat.name, description: cat.description || '', icon: cat.icon, color: cat.color, parent_id: cat.parent_id || '' });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast('Name required', 'error'); return; }
    const url = editTarget ? `/api/categories/${editTarget.id}` : '/api/categories';
    const method = editTarget ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) {
      toast(editTarget ? 'Category updated' : 'Category created', 'success');
      setModalOpen(false);
      load();
    } else {
      const e = await res.json();
      toast(e.error || 'Failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) { toast('Category deleted', 'success'); load(); }
    else toast('Failed to delete', 'error');
    setDeleteTarget(null);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">Organize your documents into categories</p>
        </div>
        {isAdmin && <Button onClick={openCreate}><Plus size={16} /> New Category</Button>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-20" />
          <p>No categories yet</p>
          {isAdmin && <Button className="mt-4" onClick={openCreate}><Plus size={14} /> Create Category</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat: any) => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <div className="h-2 w-full" style={{ background: cat.color }} />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cat.color + '20' }}>
                    <FolderOpen size={18} style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{cat.name}</p>
                    {cat.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{cat.description}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Link href={`/dashboard/documents?category=${cat.id}`}
                    className="text-sm text-gray-500 flex items-center gap-1 hover:text-blue-600 transition-colors">
                    <FileText size={13} />
                    {cat.document_count || 0} documents
                  </Link>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(cat)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Category' : 'New Category'}>
        <div className="flex flex-col gap-4">
          <Input label="Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Category name" />
          <Textarea label="Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional description" rows={2} />

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Color</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          {categories.filter(c => !editTarget || c.id !== editTarget.id).length > 0 && (
            <Select label="Parent Category (optional)" value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
              <option value="">None (top-level)</option>
              {categories.filter(c => !editTarget || c.id !== editTarget.id).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          )}

          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editTarget ? 'Save Changes' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? Documents in this category will become uncategorized.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
