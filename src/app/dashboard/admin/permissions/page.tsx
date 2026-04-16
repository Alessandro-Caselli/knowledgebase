'use client';
import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Users, FolderOpen, Globe, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/inputs';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { formatDistanceToNow } from 'date-fns';

const PERM_LEVELS = ['read', 'write', 'admin'];
const RESOURCE_TYPES = ['category', 'document', 'global'];
const SUBJECT_TYPES = ['user', 'role'];
const ROLES = ['viewer', 'editor', 'admin'];

export default function PermissionsAdminPage() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [filterResource, setFilterResource] = useState('');

  const [form, setForm] = useState({
    subject_type: 'user',
    subject_id: '',
    resource_type: 'category',
    resource_id: '',
    permission: 'read',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = async () => {
    const [permsRes, usersRes, catsRes] = await Promise.all([
      fetch('/api/permissions').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]);
    setPermissions(permsRes.permissions || []);
    setUsers(usersRes.users || []);
    setCategories(catsRes.categories || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.subject_id || !form.resource_id) { toast('All fields required', 'error'); return; }
    const res = await fetch('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) { toast('Permission granted', 'success'); setModalOpen(false); load(); }
    else { const e = await res.json(); toast(e.error || 'Failed', 'error'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch('/api/permissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_type: deleteTarget.subject_type,
        subject_id: deleteTarget.subject_id,
        resource_type: deleteTarget.resource_type,
        resource_id: deleteTarget.resource_id,
      }),
    });
    toast('Permission revoked', 'success');
    setDeleteTarget(null);
    load();
  };

  const getSubjectLabel = (p: any) =>
    p.subject_type === 'user' ? (p.subject_name || p.subject_email || p.subject_id) : `Role: ${p.subject_id}`;

  const getResourceLabel = (p: any) => {
    if (p.resource_type === 'global') return 'All Resources';
    if (p.resource_type === 'category') return categories.find(c => c.id === p.resource_id)?.name || p.resource_id;
    return p.resource_id;
  };

  const permColor: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    write: 'bg-blue-100 text-blue-700',
    read: 'bg-gray-100 text-gray-600',
  };

  const filtered = filterResource
    ? permissions.filter(p => p.resource_type === filterResource)
    : permissions;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <Shield size={16} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Permissions</h1>
        </div>
        <p className="text-gray-500 ml-10">Granular access control by user, role, category, or document</p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>How permissions work:</strong> Permissions cascade — global &gt; category &gt; document.
          Admins always have full access. User-specific permissions override role-based ones.
          Default roles: <strong>viewer</strong> = read only, <strong>editor</strong> = read + write.
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={filterResource}
          onChange={e => setFilterResource(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All resource types</option>
          <option value="global">Global</option>
          <option value="category">Category</option>
          <option value="document">Document</option>
        </select>
        <div className="flex-1" />
        <Button onClick={() => { setForm({ subject_type: 'user', subject_id: '', resource_type: 'category', resource_id: '', permission: 'read' }); setModalOpen(true); }}>
          <Plus size={15} /> Grant Permission
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-sm">{filtered.length} permission{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Shield size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No custom permissions. Default role rules apply.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((p: any) => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                {/* Subject */}
                <div className="flex items-center gap-2 w-52 shrink-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.subject_type === 'user' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                    {p.subject_type === 'user' ? <Users size={13} className="text-blue-600" /> : <Shield size={13} className="text-purple-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{getSubjectLabel(p)}</p>
                    <p className="text-xs text-gray-400 capitalize">{p.subject_type}</p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="text-gray-300 text-xs">→</div>

                {/* Resource */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.resource_type === 'global' ? 'bg-green-50' : p.resource_type === 'category' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                    {p.resource_type === 'global' ? <Globe size={13} className="text-green-600" />
                      : p.resource_type === 'category' ? <FolderOpen size={13} className="text-amber-600" />
                      : <Shield size={13} className="text-gray-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{getResourceLabel(p)}</p>
                    <p className="text-xs text-gray-400 capitalize">{p.resource_type}</p>
                  </div>
                </div>

                {/* Permission */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${permColor[p.permission] || permColor.read}`}>
                  {p.permission}
                </span>

                {/* Date + delete */}
                <p className="text-xs text-gray-400 hidden lg:block w-28 text-right shrink-0">
                  {formatDistanceToNow(new Date(p.granted_at + 'Z'), { addSuffix: true })}
                </p>
                <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Grant Permission" description="Add a granular access rule for a user or role">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Subject Type" value={form.subject_type} onChange={e => set('subject_type', e.target.value)}>
              <option value="user">User</option>
              <option value="role">Role</option>
            </Select>

            {form.subject_type === 'user' ? (
              <Select label="User" value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
                <option value="">Select user…</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </Select>
            ) : (
              <Select label="Role" value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
                <option value="">Select role…</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Resource Type" value={form.resource_type} onChange={e => { set('resource_type', e.target.value); set('resource_id', ''); }}>
              <option value="global">Global (all)</option>
              <option value="category">Category</option>
            </Select>

            {form.resource_type === 'category' ? (
              <Select label="Category" value={form.resource_id} onChange={e => set('resource_id', e.target.value)}>
                <option value="">Select category…</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            ) : (
              <div className="flex items-end pb-0.5">
                <p className="text-sm text-gray-500 italic">Applies to all resources</p>
              </div>
            )}
          </div>

          {form.resource_type === 'global' && (
            <input type="hidden" value="all" onChange={() => set('resource_id', 'all')} />
          )}

          <Select label="Permission Level" value={form.permission} onChange={e => set('permission', e.target.value)}>
            <option value="read">Read — view only</option>
            <option value="write">Write — create and edit</option>
            <option value="admin">Admin — full control</option>
          </Select>

          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (form.resource_type === 'global') set('resource_id', 'all'); save(); }}>
              Grant
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Revoke Permission"
        message={`Revoke ${deleteTarget?.permission} access for ${deleteTarget ? getSubjectLabel(deleteTarget) : ''}?`}
        confirmLabel="Revoke"
        danger
      />
    </div>
  );
}
