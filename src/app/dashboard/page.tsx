import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import { FileText, FolderOpen, Users, TrendingUp, ChevronRight, Clock, Plus } from 'lucide-react';
import { StatusBadge } from '@/components/ui/inputs';
import { formatDistanceToNow } from 'date-fns';

export default async function DashboardPage() {
  const session = await auth();
  const db = getDb();
  const isAdmin = session?.user?.role === 'admin';
  const isEditor = session?.user?.role === 'editor' || isAdmin;

  // Stats
  const docCount = (db.prepare('SELECT COUNT(*) as c FROM documents WHERE status = ?').get('published') as any).c;
  const catCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as any).c;
  const userCount = isAdmin ? (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c : null;
  const draftCount = isEditor
    ? (db.prepare('SELECT COUNT(*) as c FROM documents WHERE status = ? AND created_by = ?').get('draft', session?.user?.id) as any).c
    : null;

  // Recent documents
  const recentDocs = db.prepare(`
    SELECT d.*, c.name as category_name, c.color as category_color
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.status = 'published'
    ORDER BY d.updated_at DESC LIMIT 8
  `).all() as any[];

  // Categories with doc counts
  const categories = db.prepare(`
    SELECT c.*, COUNT(d.id) as doc_count
    FROM categories c
    LEFT JOIN documents d ON d.category_id = c.id AND d.status = 'published'
    GROUP BY c.id ORDER BY doc_count DESC LIMIT 6
  `).all() as any[];

  const stats = [
    { label: 'Published Docs', value: docCount, icon: <FileText size={20} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Categories', value: catCount, icon: <FolderOpen size={20} />, color: 'bg-purple-50 text-purple-600' },
    ...(isAdmin ? [{ label: 'Team Members', value: userCount, icon: <Users size={20} />, color: 'bg-green-50 text-green-600' }] : []),
    ...(isEditor ? [{ label: 'My Drafts', value: draftCount, icon: <TrendingUp size={20} />, color: 'bg-amber-50 text-amber-600' }] : []),
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()}, {session?.user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening in your knowledge base.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value ?? '–'}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Documents</h2>
            <Link href="/dashboard/documents" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentDocs.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400">
                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No documents yet.</p>
                {isEditor && (
                  <Link href="/dashboard/documents/new" className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <Plus size={14} /> Create your first document
                  </Link>
                )}
              </div>
            ) : recentDocs.map((doc) => (
              <Link key={doc.id} href={`/dashboard/documents/${doc.id}`}
                className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: (doc.category_color || '#6366f1') + '20' }}>
                  <FileText size={15} style={{ color: doc.category_color || '#6366f1' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.category_name && (
                      <span className="text-xs text-gray-400">{doc.category_name}</span>
                    )}
                    <span className="text-gray-300 text-xs">·</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={11} />
                      {formatDistanceToNow(new Date(doc.updated_at + 'Z'), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <StatusBadge status={doc.status} />
              </Link>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Categories</h2>
            <Link href="/dashboard/categories" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Manage <ChevronRight size={14} />
            </Link>
          </div>
          <div className="p-3 flex flex-col gap-1">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/dashboard/documents?category=${cat.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: cat.color + '20' }}>
                  <FolderOpen size={15} style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{cat.name}</p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                  {cat.doc_count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
