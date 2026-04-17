'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { BookOpen, Search, LayoutDashboard, FolderOpen, Shield, Users, LogOut, ChevronRight, Plus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/dashboard/search', label: 'Search', icon: <Search size={18} /> },
  { href: '/dashboard/documents', label: 'Documents', icon: <FileText size={18} /> },
  { href: '/dashboard/categories', label: 'Categories', icon: <FolderOpen size={18} /> },
];

const adminItems = [
  { href: '/dashboard/admin/users', label: 'Users', icon: <Users size={18} /> },
  { href: '/dashboard/admin/groups', label: 'Groups', icon: <Users size={18} /> },
  { href: '/dashboard/admin/permissions', label: 'Permissions', icon: <Shield size={18} /> },
];

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  return (
    <Link href={href} className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
      active ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    )}>
      {icon}
      <span>{label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
    </Link>
  );
}

export function Sidebar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const isEditor = session?.user?.role === 'editor' || isAdmin;

  return (
    <aside className="sidebar">
      <div className="px-5 py-5 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">KnowledgeBase</p>
            <p className="text-slate-500 text-xs mt-0.5">Team Wiki</p>
          </div>
        </Link>
      </div>

      {isEditor && (
        <div className="px-4 pt-4">
          <Link href="/dashboard/documents/new"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
            <Plus size={16} /> New Document
          </Link>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(item => <NavLink key={item.href} {...item} />)}
        {isAdmin && (
          <>
            <div className="my-3 border-t border-slate-800" />
            <p className="text-xs text-slate-600 font-medium uppercase tracking-wider px-3 mb-2">Admin</p>
            {adminItems.map(item => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {session?.user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{session?.user?.name || 'User'}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{session?.user?.role || 'member'}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
