'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Plus, Trash2, KeyRound, ChevronDown, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/inputs';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { RoleBadge } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/toast';
import { formatDistanceToNow } from 'date-fns';

const ROLES = ['admin', 'editor', 'member', 'viewer'];

export default function UsersAdminPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({ email: '', name: '', role: 'member', password: '' });
  const [saving, setSaving] = useState(false);

  const load = () => fetch('/api/users').then(r => r.json()).then(d => { setUsers(d.users || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const createUser = async () => {
    if (!form.email || !form.password) { toast('Email and password required', 'error'); return; }
    setSaving(true);
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { toast('User created', 'success'); setCreateOpen(false); setForm({ email: '', name: '', role: 'member', password: '' }); load(); }
    else toast(data.error || 'Failed', 'error');
    setSaving(false);
  };

  const updateUser = async (id: string, updates: any) => {
    const res = await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
    if (res.ok) { toast('Updated', 'success'); load(); }
    else { const d = await res.json(); toast(d.error || 'Failed', 'error'); }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    const res = await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) });
    if (res.ok) { toast('User deleted', 'success'); load(); }
    else toast('Failed', 'error');
    setDeleteTarget(null);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Users size={16} className="text-red-600" /></div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          </div>
          <p className="text-gray-500 ml-10">Manage team members and their roles</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus size={15} /> New User</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {ROLES.map(role => (
          <div key={role} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === role).length}</p>
            <p className="text-sm text-gray-500 capitalize mt-0.5">{role}s</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-sm">{users.length} users</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map((user: any) => (
              <div key={user.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name || '—'}</p>
                    {user.id === session?.user?.id && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">You</span>}
                    {user.is_local ? <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">local</span> : <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">SSO</span>}
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail size={11} /> {user.email}</p>
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-xs text-gray-400">Last login</p>
                  <p className="text-xs text-gray-600 mt-0.5">{user.last_login ? formatDistanceToNow(new Date(user.last_login + 'Z'), { addSuffix: true }) : 'Never'}</p>
                </div>
                {/* Role selector */}
                <div className="relative">
                  <select
                    value={user.role}
                    onChange={e => updateUser(user.id, { role: e.target.value })}
                    className="appearance-none pl-3 pr-7 py-1.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {/* Actions */}
                <div className="flex gap-1">
                  {user.is_local && (
                    <button onClick={() => setEditTarget(user)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Reset password">
                      <KeyRound size={14} />
                    </button>
                  )}
                  {user.id !== session?.user?.id && (
                    <button onClick={() => setDeleteTarget(user)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create User" description="Add a local user with email & password login">
        <div className="flex flex-col gap-4">
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
          <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
          <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createUser} loading={saving}>Create User</Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Reset password — ${editTarget?.name || editTarget?.email}`} size="sm">
        <div className="flex flex-col gap-4">
          <Input label="New Password" type="password" id="reset-pw" placeholder="Min. 6 characters" />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={async () => {
              const pw = (document.getElementById('reset-pw') as HTMLInputElement)?.value;
              if (!pw || pw.length < 6) { toast('Password too short', 'error'); return; }
              await updateUser(editTarget.id, { password: pw });
              setEditTarget(null);
            }}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteUser}
        title="Delete User" message={`Delete "${deleteTarget?.name || deleteTarget?.email}"? This cannot be undone.`}
        confirmLabel="Delete" danger />
    </div>
  );
}
