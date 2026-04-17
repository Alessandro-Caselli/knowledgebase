'use client';
import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/inputs';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

const COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

export default function GroupsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = async () => {
    const [g, u] = await Promise.all([
      fetch('/api/groups').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]);
    setGroups(g.groups || []); setUsers(u.users || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openEdit = async (group: any) => {
    setEditGroup(group);
    const d = await fetch(`/api/groups/${group.id}`).then(r => r.json());
    setGroupMembers(d.members || []);
    setForm({ name: group.name, description: group.description || '', color: group.color });
  };

  const saveGroup = async () => {
    if (!form.name.trim()) { toast('Name required', 'error'); return; }
    const url = editGroup ? `/api/groups/${editGroup.id}` : '/api/groups';
    const method = editGroup ? 'PUT' : 'POST';
    const body = editGroup
      ? { ...form, member_ids: groupMembers.map((m: any) => m.id) }
      : form;
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { toast(editGroup ? 'Group updated' : 'Group created', 'success'); setCreateOpen(false); setEditGroup(null); load(); }
    else { const d = await res.json(); toast(d.error || 'Failed', 'error'); }
  };

  const deleteGroup = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/groups/${deleteTarget.id}`, { method: 'DELETE' });
    toast('Group deleted', 'success'); setDeleteTarget(null); load();
  };

  const toggleMember = (user: any) => {
    const isMember = groupMembers.some(m => m.id === user.id);
    setGroupMembers(isMember ? groupMembers.filter(m => m.id !== user.id) : [...groupMembers, user]);
  };

  const nonMembers = users.filter(u => !groupMembers.some(m => m.id === u.id));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><Users size={16} className="text-purple-600" /></div>
            <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          </div>
          <p className="text-gray-500 ml-10">Organize users into groups to assign permissions in bulk</p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setEditGroup(null); setForm({ name: '', description: '', color: '#6366f1' }); }}>
          <Plus size={15} /> New Group
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Users size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No groups yet. Create one to assign permissions to multiple users at once.</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}><Plus size={14} /> Create Group</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g: any) => (
            <div key={g.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group">
              <div className="h-1.5 w-full" style={{ background: g.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: g.color + '20' }}>
                      <Users size={16} style={{ color: g.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{g.name}</p>
                      {g.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{g.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(g)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteTarget(g)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{g.member_count || 0} member{g.member_count !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={createOpen || !!editGroup} onClose={() => { setCreateOpen(false); setEditGroup(null); }}
        title={editGroup ? `Edit: ${editGroup.name}` : 'New Group'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Group details */}
          <div className="flex flex-col gap-4">
            <Input label="Group Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Engineering Team" />
            <Textarea label="Description" value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Optional description" />
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
          </div>

          {/* Right: Members (edit mode only) */}
          {editGroup && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-gray-700">Members ({groupMembers.length})</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                {groupMembers.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No members yet</p>
                ) : groupMembers.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold shrink-0">
                      {(m.name?.[0] || m.email?.[0] || '?').toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 flex-1 truncate">{m.name || m.email}</span>
                    <button onClick={() => toggleMember(m)} className="text-gray-300 hover:text-red-500 transition-colors"><UserMinus size={14} /></button>
                  </div>
                ))}
              </div>
              {nonMembers.length > 0 && (
                <>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Add members</p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    {nonMembers.map((u: any) => (
                      <div key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-semibold shrink-0">
                          {(u.name?.[0] || u.email?.[0] || '?').toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-600 flex-1 truncate">{u.name || u.email}</span>
                        <button onClick={() => toggleMember(u)} className="text-gray-300 hover:text-blue-500 transition-colors"><UserPlus size={14} /></button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => { setCreateOpen(false); setEditGroup(null); }}>Cancel</Button>
          <Button onClick={saveGroup}>{editGroup ? 'Save Changes' : 'Create Group'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteGroup}
        title="Delete Group" message={`Delete "${deleteTarget?.name}"? This will remove all permission rules for this group.`}
        confirmLabel="Delete" danger />
    </div>
  );
}
