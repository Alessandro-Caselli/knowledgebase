'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft, Edit, Trash2, Clock, FolderOpen, Tag, User,
  Heart, History, MessageSquare, Download, FileText, Paperclip, X, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/inputs';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { RichTextViewer } from '@/components/ui/rich-text-editor';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import Link from 'next/link';

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'comments' | 'attachments' | 'history'>('content');
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoaded, setVersionsLoaded] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const isAdmin = session?.user?.role === 'admin';
  const isEditor = session?.user?.role === 'editor' || isAdmin;
  const isOwner = doc?.created_by === session?.user?.id;
  const canEdit = isAdmin || (isEditor && isOwner);

  const loadDoc = useCallback(() => {
    fetch(`/api/documents/${id}`)
      .then(r => r.json())
      .then(d => { setDoc(d); setLoading(false); });
  }, [id]);

  const loadFavorite = useCallback(() => {
    fetch(`/api/documents/${id}/favorite`)
      .then(r => r.json())
      .then(d => setFavorited(d.favorited ?? false))
      .catch(() => {});
  }, [id]);

  const loadComments = useCallback(() => {
    fetch(`/api/documents/${id}/comments`)
      .then(r => r.json())
      .then(d => setComments(d.comments || []))
      .catch(() => {});
  }, [id]);

  const loadAttachments = useCallback(() => {
    fetch(`/api/documents/${id}/attachments`)
      .then(r => r.json())
      .then(d => setAttachments(d.attachments || []))
      .catch(() => {});
  }, [id]);

  useEffect(() => { loadDoc(); loadFavorite(); loadComments(); loadAttachments(); }, [loadDoc, loadFavorite, loadComments, loadAttachments]);

  useEffect(() => {
    if (activeTab === 'history' && !versionsLoaded) {
      fetch(`/api/documents/${id}/versions`)
        .then(r => r.json())
        .then(d => { setVersions(d.versions || []); setVersionsLoaded(true); })
        .catch(() => {});
    }
  }, [activeTab, versionsLoaded, id]);

  const toggleFavorite = async () => {
    setFavLoading(true);
    try {
      const method = favorited ? 'DELETE' : 'POST';
      await fetch(`/api/documents/${id}/favorite`, { method });
      setFavorited(f => !f);
    } catch {
      toast('Errore', 'error');
    } finally {
      setFavLoading(false);
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('Documento eliminato', 'success');
      router.push('/dashboard/documents');
    } else {
      toast('Errore eliminazione', 'error');
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/documents/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (!res.ok) throw new Error();
      setCommentText('');
      loadComments();
      toast('Commento aggiunto', 'success');
    } catch {
      toast('Errore nell\'aggiunta del commento', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    await fetch(`/api/documents/${id}/comments?commentId=${commentId}`, { method: 'DELETE' });
    loadComments();
  };

  const restoreVersion = async (version: any) => {
    if (!confirm(`Ripristinare la versione ${version.version}?`)) return;
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: version.title,
        content: version.content,
        change_summary: `Ripristino alla versione ${version.version}`,
      }),
    });
    if (res.ok) {
      toast('Versione ripristinata', 'success');
      loadDoc();
      setVersionsLoaded(false);
      setActiveTab('content');
    } else {
      toast('Errore nel ripristino', 'error');
    }
  };

  const exportPDF = () => {
    window.print();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!doc || doc.error) return (
    <div className="flex flex-col items-center justify-center h-screen text-gray-400">
      <p className="text-lg font-medium">Documento non trovato</p>
      <Link href="/dashboard/documents" className="mt-3 text-sm text-blue-600 hover:underline">← Torna ai documenti</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10 print:hidden">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
        </div>
        <StatusBadge status={doc.status} />

        {/* Favorite */}
        <button
          onClick={toggleFavorite}
          disabled={favLoading}
          title={favorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
          className={`p-1.5 rounded-lg transition-colors ${favorited ? 'text-red-500 hover:bg-red-50' : 'text-gray-400 hover:bg-gray-100 hover:text-red-400'}`}
        >
          <Heart size={17} fill={favorited ? 'currentColor' : 'none'} />
        </button>

        {/* Export dropdown */}
        <div className="relative group">
          <button title="Esporta documento" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors flex items-center gap-1">
            <Download size={17} />
          </button>
          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-20">
            <button onClick={exportPDF} className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl flex items-center gap-2">
              <FileText size={14} className="text-gray-400" /> Stampa / PDF
            </button>
            <a href={`/api/documents/${id}/export?format=docx`} download className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-xl flex items-center gap-2">
              <FileText size={14} className="text-blue-500" /> Esporta Word (.docx)
            </a>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/documents/${id}/edit`}>
              <Button variant="outline" size="sm"><Edit size={15} /> Modifica</Button>
            </Link>
            {isAdmin && (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main content */}
        <article className="lg:col-span-3">
          <h1 className="text-3xl font-bold text-gray-900 mb-3 print:text-black">{doc.title}</h1>
          {doc.summary && (
            <p className="text-gray-500 text-base mb-6 leading-relaxed border-l-4 border-blue-200 pl-4">
              {doc.summary}
            </p>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-gray-200 print:hidden overflow-x-auto">
            {[
              { key: 'content', label: 'Contenuto', icon: <FileText size={14} /> },
              { key: 'comments', label: `Commenti (${comments.length})`, icon: <MessageSquare size={14} /> },
              { key: 'attachments', label: `Allegati (${attachments.length})`, icon: <Paperclip size={14} /> },
              { key: 'history', label: `Cronologia (v${doc.version})`, icon: <History size={14} /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Content tab */}
          {activeTab === 'content' && (
            <div className="bg-white rounded-xl border border-gray-100 p-7 shadow-sm">
              <RichTextViewer content={doc.content || ''} />
            </div>
          )}

          {/* Comments tab */}
          {activeTab === 'comments' && (
            <div className="flex flex-col gap-4">
              {/* New comment */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Scrivi un commento..."
                  rows={3}
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={submitComment} loading={submittingComment} disabled={!commentText.trim()}>
                    Commenta
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nessun commento ancora. Sii il primo!</p>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                          {(c.author_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.author_name || 'Utente'}</p>
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(c.created_at + 'Z'), { addSuffix: true, locale: it })}
                          </p>
                        </div>
                      </div>
                      {(isAdmin || c.user_id === session?.user?.id) && (
                        <button onClick={() => deleteComment(c.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-9">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Attachments tab */}
          {activeTab === 'attachments' && (
            <div className="flex flex-col gap-4">
              {/* Upload */}
              {canEdit && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors">
                    <Upload size={24} className="text-gray-400" />
                    <span className="text-sm text-gray-500">Clicca per caricare un file <span className="text-gray-400">(max 20 MB)</span></span>
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        const fd = new FormData();
                        fd.append('file', file);
                        try {
                          const res = await fetch(`/api/documents/${id}/attachments`, { method: 'POST', body: fd });
                          if (!res.ok) throw new Error((await res.json()).error);
                          loadAttachments();
                        } catch (err: any) {
                          alert(err.message || 'Upload failed');
                        } finally {
                          setUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                  {uploading && <p className="text-sm text-center text-blue-500 mt-2">Caricamento in corso...</p>}
                </div>
              )}

              {attachments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nessun allegato ancora.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {attachments.map((att: any) => (
                    <div key={att.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Paperclip size={15} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{att.file_name}</p>
                        <p className="text-xs text-gray-400">
                          {(att.file_size / 1024).toFixed(1)} KB · {att.uploader_name || 'Utente'} · {formatDistanceToNow(new Date(att.uploaded_at + 'Z'), { addSuffix: true, locale: it })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={`/api/documents/${id}/attachments/${att.id}`}
                          download={att.file_name}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Scarica"
                        >
                          <Download size={14} />
                        </a>
                        {(isAdmin || att.uploaded_by === session?.user?.id) && (
                          <button
                            onClick={async () => {
                              await fetch(`/api/documents/${id}/attachments?attachmentId=${att.id}`, { method: 'DELETE' });
                              loadAttachments();
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Elimina"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History tab */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-3">
              {!versionsLoaded ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : versions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nessuna versione precedente trovata.</p>
              ) : (
                versions.map((v: any) => (
                  <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">
                      v{v.version}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{v.title}</p>
                      {v.change_summary && (
                        <p className="text-xs text-gray-500 mt-0.5">{v.change_summary}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {v.author_name || 'Utente'} · {formatDistanceToNow(new Date(v.changed_at + 'Z'), { addSuffix: true, locale: it })}
                      </p>
                    </div>
                    {v.version !== doc.version && canEdit && (
                      <button
                        onClick={() => restoreVersion(v)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                      >
                        Ripristina
                      </button>
                    )}
                    {v.version === doc.version && (
                      <span className="text-xs text-green-600 font-medium px-3 py-1.5 bg-green-50 rounded-lg flex-shrink-0">Attuale</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </article>

        {/* Meta sidebar */}
        <aside className="flex flex-col gap-4 print:hidden">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4">
            {doc.category_name && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Categoria</p>
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
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Autore</p>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={11} className="text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-700">{doc.author_name}</span>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Ultimo aggiornamento</p>
              <p className="text-sm text-gray-700 flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400" />
                {formatDistanceToNow(new Date(doc.updated_at + 'Z'), { addSuffix: true, locale: it })}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Versione</p>
              <p className="text-sm text-gray-700">v{doc.version}</p>
            </div>

            {doc.tags?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Tag size={11} /> Tag
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

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
        }
      `}</style>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Elimina documento"
        message={`Sei sicuro di voler eliminare "${doc.title}"? Questa azione è irreversibile.`}
        confirmLabel="Elimina"
        danger
      />
    </div>
  );
}
