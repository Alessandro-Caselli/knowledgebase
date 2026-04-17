'use client';
import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Users, FolderOpen, Globe, Eye, EyeOff, Pencil, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/inputs';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { formatDistanceToNow } from 'date-fns';

const PERM_META: Record<string, { label: string; color: string; desc: string }> = {
  no_access: { label: 'No Access', color: 'bg-gray-100 text-gray-500', desc: 'Hidden entirely — user cannot see this exists' },
  read:       { label: 'Read',      color: 'bg-blue-100 text-blue-700',  desc: 'Can view published documents' },
  write:      { label: 'Write',     color: 'bg-green-100 text-green-700', desc: 'Can view, create and edit documents' },
  admin:      { label: 'Admin',     color: 'bg-red-100 text-red-700',    desc: 'Full control including delete' },
};

export default function PermissionsPage() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [filterResource, setFilterResource] = useState('');

  const [form, setForm] = useState({ subject_type: 'user', subject_id: '', resource_type: 'category', resource_id: '', permission: 'read' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = async () => {
    const [p, u, g, c] = await Promise.all([
      fetch('/api/permissions').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
      fetch('/api/groups').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]);
    setPermissions(p.permissions || []); setUsers(u.users || []);
    setGroups(g.groups || []); setCategories(c.categories || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const body = { ...form, resource_id: form.resource_type === 'global' ? 'all' : form.resource_id };
    if (!body.subject_id || (body.resource_type !== 'global' && !body.resource_id)) { toast('Fill all fields', 'error'); return; }
    const res = await fetch('/api/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { toast('Permission granted', 'success'); setModalOpen(false); load(); }
    else { const d = await res.json(); toast(d.error || 'Failed', 'error'); }
  };

  const revoke = async () => {
    if (!deleteTarget) return;
    await fetch('/api/permissions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_type: deleteTarget.subject_type, subject_id: deleteTarget.subject_id, resource_type: deleteTarget.resource_type, resource_id: deleteTarget.resource_id }) });
    toast('Permission revoked', 'success'); setDeleteTarget(null); load();
  };

  const getSubjectLabel = (p: any) => p.subject_name || p.subject_email || p.subject_id;
  const getResourceLabel = (p: any) => {
    if (p.resource_type === 'global') return 'All Resources';
    return categories.find(c => c.id === p.resource_id)?.name || p.resource_id;
  };

  const filtered = filterResource ? permissions.filter(p => p.resource_type === filterResource) : permissions;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Shield size={16} className="text-red-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Permissions</h1>
        </div>
        <p className="text-gray-500 ml-10">Granular access control per user, group, or role</p>
      </div>

      {/* Permission level legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(PERM_META).map(([key, meta]) => (
          <div key={key} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold mb-1.5 ${meta.color}`}>{meta.label}</span>
            <p className="text-xs text-gray-500">{meta.desc}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <select value={filterResource} onChange={e => setFilterResource(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All types</option>
          <option value="global">Global</option>
          <option value="category">Category</option>
        </select>
        <div className="flex-1" />
        <Button onClick={() => { setForm({ subject_type: 'user', subject_id: '', resource_type: 'category', resource_id: '', permission: 'read' }); setModalOpen(true); }}>
          <Plus size={15} /> Add Rule
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-sm">{filtered.length} rule{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Shield size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No rules. Default: members=read, editors=write, admins=full access.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((p: any) => {
              const meta = PERM_META[p.permission] || PERM_META.read;
              return (
                <div key={p.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                  {/* Subject */}
                  <div className="flex items-center gap-2 w-44 shrink-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.subject_type === 'user' ? 'bg-blue-50' : p.subject_type === 'group' ? 'bg-purple-50' : 'bg-gray-50'}`}>
                      <Users size={13} className={p.subject_type === 'user' ? 'text-blue-600' : p.subject_type === 'group' ? 'text-purple-600' : 'text-gray-500'} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{getSubjectLabel(p)}</p>
                      <p className="text-xs text-gray-400 capitalize">{p.subject_type}</p>
                    </div>
                  </div>
                  <div className="text-gray-300 text-xs">→</div>
                  {/* Resource */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.resource_type === 'global' ? 'bg-green-50' : 'bg-amber-50'}`}>
                      {p.resource_type === 'global' ? <Globe size={13} className="text-green-600" /> : <FolderOpen size={13} className="text-amber-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{getResourceLabel(p)}</p>
                      <p className="text-xs text-gray-400 capitalize">{p.resource_type}</p>
                    </div>
                  </div>
                  {/* Permission badge */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                  {/* Date */}
                  <p className="text-xs text-gray-400 hidden lg:block w-28 text-right shrink-0">
                    {formatDistanceToNow(new Date(p.granted_at + 'Z'), { addSuffix: true })}
                  </p>
                  <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Permission Rule" description="Set who can access what — and how much">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Subject Type" value={form.subject_type} onChange={e => set('subject_type', e.target.value)}>
              <option value="user">User</option>
              <option value="group">Group</option>
              <option value="role">Role</option>
            </Select>
            {form.subject_type === 'user' ? (
              <Select label="User" value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
                <option value="">Select user…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </Select>
            ) : form.subject_type === 'group' ? (
              <Select label="Group" value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
                <option value="">Select group…</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            ) : (
              <Select label="Role" value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
                <option value="">Select role…</option>
                {['admin','editor','member','viewer'].map(r => <option key={r} value={r}>{r}</option>)}
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
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            ) : (
              <div className="flex items-end pb-1"><p className="text-sm text-gray-400 italic">Applies to everything</p></div>
            )}
          </div>

          <Select label="Permission Level" value={form.permission} onChange={e => set('permission', e.target.value)}>
            {Object.entries(PERM_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label} — {meta.desc}</option>
            ))}
          </Select>

          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>Add Rule</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={revoke}
        title="Revoke Permission" message={`Remove ${deleteTarget?.permission} access for "${deleteTarget ? getSubjectLabel(deleteTarget) : ''}"?`}
        confirmLabel="Revoke" danger />
    </div>
  );
}
