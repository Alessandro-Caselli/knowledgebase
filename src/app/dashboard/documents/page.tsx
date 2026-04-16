'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { FileText, Plus, Filter, Clock, ChevronRight, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/inputs';
import { formatDistanceToNow } from 'date-fns';

export default function DocumentsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get('category');

  const [docs, setDocs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(categoryFilter || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const isEditor = session?.user?.role === 'editor' || session?.user?.role === 'admin';

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '15', status: statusFilter });
    if (activeCategory) params.set('category', activeCategory);
    const res = await fetch(`/api/documents?${params}`);
    const data = await res.json();
    setDocs(data.documents || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, activeCategory, statusFilter]);

  useEffect(() => { fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || [])); }, []);
  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Category sidebar */}
      <div className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Categories</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
          <button
            onClick={() => { setActiveCategory(''); setPage(1); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-left transition-colors ${!activeCategory ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText size={15} />
            All Documents
            <span className="ml-auto text-xs text-gray-400">{total}</span>
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setPage(1); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-left transition-colors ${activeCategory === cat.id ? 'font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              style={activeCategory === cat.id ? { background: cat.color + '15', color: cat.color } : {}}
            >
              <FolderOpen size={15} style={{ color: activeCategory === cat.id ? cat.color : undefined }} />
              <span className="truncate">{cat.name}</span>
              <span className="ml-auto text-xs text-gray-400">{cat.document_count || 0}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900 mr-2">
            {activeCategory ? categories.find(c => c.id === activeCategory)?.name || 'Category' : 'All Documents'}
          </h1>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            {isEditor && (
              <Link href="/dashboard/documents/new">
                <Button size="sm"><Plus size={15} /> New Document</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-gray-400">
              <FileText size={36} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">No documents found</p>
              {isEditor && (
                <Link href="/dashboard/documents/new" className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Plus size={14} /> Create one
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {docs.map((doc: any) => (
                <Link key={doc.id} href={`/dashboard/documents/${doc.id}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: (doc.category_color || '#6366f1') + '18' }}>
                    <FileText size={16} style={{ color: doc.category_color || '#6366f1' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {doc.title}
                      </p>
                      <StatusBadge status={doc.status} />
                    </div>
                    {doc.summary && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{doc.summary}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {doc.category_name && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <FolderOpen size={11} /> {doc.category_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={11} />
                        {formatDistanceToNow(new Date(doc.updated_at + 'Z'), { addSuffix: true })}
                      </span>
                      {doc.tags && JSON.parse(doc.tags || '[]').slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">#{tag}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 mt-2 shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-white flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {page} of {Math.ceil(total / 15)}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
