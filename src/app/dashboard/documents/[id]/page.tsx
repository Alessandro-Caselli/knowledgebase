'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Edit, Trash2, Clock, FolderOpen, Tag, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/inputs';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isAdmin = session?.user?.role === 'admin';
  const isEditor = session?.user?.role === 'editor' || isAdmin;
  const isOwner = doc?.created_by === session?.user?.id;
  const canEdit = isAdmin || (isEditor && isOwner);

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then(r => r.json())
      .then(d => { setDoc(d); setLoading(false); });
  }, [id]);

  const handleDelete = async () => {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('Document deleted', 'success');
      router.push('/dashboard/documents');
    } else {
      toast('Failed to delete', 'error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!doc || doc.error) return (
    <div className="flex flex-col items-center justify-center h-screen text-gray-400">
      <p className="text-lg font-medium">Document not found</p>
      <Link href="/dashboard/documents" className="mt-3 text-sm text-blue-600 hover:underline">← Back to documents</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
        </div>
        <StatusBadge status={doc.status} />
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/documents/${id}/edit`}>
              <Button variant="outline" size="sm"><Edit size={15} /> Edit</Button>
            </Link>
            {isAdmin && (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Content */}
        <article className="lg:col-span-3">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{doc.title}</h1>
          {doc.summary && (
            <p className="text-gray-500 text-base mb-6 leading-relaxed border-l-4 border-blue-200 pl-4">
              {doc.summary}
            </p>
          )}
          <div className="bg-white rounded-xl border border-gray-100 p-7 shadow-sm">
            <div className="prose-kb" dangerouslySetInnerHTML={{ __html: renderContent(doc.content || '') }} />
          </div>
        </article>

        {/* Meta sidebar */}
        <aside className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4">
            {doc.category_name && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Category</p>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: doc.category_color + '20' }}>
                    <FolderOpen size={12} style={{ color: doc.category_color }} />
                  </div>
                  <span className="text-sm text-gray-700">{doc.category_name}</span>
                </div>
              </div>
            )}

            {doc.author_name && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Author</p>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={11} className="text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-700">{doc.author_name}</span>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Last Updated</p>
              <p className="text-sm text-gray-700 flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400" />
                {formatDistanceToNow(new Date(doc.updated_at + 'Z'), { addSuffix: true })}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Version</p>
              <p className="text-sm text-gray-700">v{doc.version}</p>
            </div>

            {doc.tags?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Tag size={11} /> Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((tag: string) => (
                    <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${doc.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function renderContent(content: string): string {
  // Basic markdown-like rendering
  return content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hbulopq])(.+)$/gm, (match) => match.trim() ? `<p>${match}</p>` : '')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}
