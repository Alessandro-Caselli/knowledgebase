'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Users, Shield, Mail, Clock, ChevronDown } from 'lucide-react';
import { RoleBadge } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/toast';
import { formatDistanceToNow } from 'date-fns';

const ROLES = ['viewer', 'editor', 'admin'];

export default function UsersAdminPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => {
      setUsers(d.users || []);
      setLoading(false);
    });
  }, []);

  const changeRole = async (userId: string, role: string) => {
    if (userId === session?.user?.id && role !== 'admin') {
      toast("You can't demote yourself", 'error'); return;
    }
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, role }),
    });
    if (res.ok) {
      setUsers(u => u.map(user => user.id === userId ? { ...user, role } : user));
      toast('Role updated', 'success');
    } else {
      toast('Failed to update role', 'error');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <Users size={16} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        </div>
        <p className="text-gray-500 ml-10">Manage team members and their global roles</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500 capitalize mt-0.5">{role}s</p>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-800">All Users ({users.length})</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map((user: any) => (
              <div key={user.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user.image
                    ? <img src={user.image} alt="" className="w-full h-full object-cover" />
                    : (user.name?.[0] || user.email?.[0] || '?').toUpperCase()
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name || '—'}</p>
                    {user.id === session?.user?.id && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">You</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Mail size={11} /> {user.email}
                  </p>
                </div>

                {/* Last login */}
                <div className="hidden md:block text-right">
                  <p className="text-xs text-gray-400">Last login</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {user.last_login
                      ? formatDistanceToNow(new Date(user.last_login + 'Z'), { addSuffix: true })
                      : 'Never'}
                  </p>
                </div>

                {/* Role selector */}
                <div className="relative">
                  <select
                    value={user.role}
                    onChange={e => changeRole(user.id, e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                    style={{ color: user.role === 'admin' ? '#b91c1c' : user.role === 'editor' ? '#1d4ed8' : '#4b5563' }}
                  >
                    {ROLES.map(r => <option key={r} value={r} className="text-gray-900">{r}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Users are automatically created on first SSO login via Azure AD.
          Role changes take effect on the user's next page load.
        </p>
      </div>
    </div>
  );
}
