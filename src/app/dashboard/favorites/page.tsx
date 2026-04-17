'use client';
import { useState, useEffect } from 'react';
import { Heart, FolderOpen, Clock, FileText } from 'lucide-react';
import { StatusBadge } from '@/components/ui/inputs';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import Link from 'next/link';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/favorites')
      .then(r => r.json())
      .then(d => { setFavorites(d.favorites || []); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
          <Heart size={24} className="text-red-500" fill="currentColor" /> Preferiti
        </h1>
        <p className="text-sm text-gray-500 mt-1">Documenti che hai salvato come preferiti</p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Heart size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nessun preferito ancora</p>
          <p className="text-sm mt-1">
            Clicca il{' '}
            <Heart size={13} className="inline text-red-400" fill="currentColor" />{' '}
            su un documento per aggiungerlo ai preferiti.
          </p>
          <Link href="/dashboard/documents" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Vai ai documenti →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {favorites.map((doc: any) => (
            <Link
              key={doc.id}
              href={`/dashboard/documents/${doc.id}`}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                  <FileText size={17} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {doc.title}
                    </h3>
                    <StatusBadge status={doc.status} />
                  </div>
                  {doc.summary && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{doc.summary}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                    {doc.category_name && (
                      <span className="flex items-center gap-1">
                        <FolderOpen size={11} style={{ color: doc.category_color }} />
                        {doc.category_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {formatDistanceToNow(new Date(doc.updated_at + 'Z'), { addSuffix: true, locale: it })}
                    </span>
                    {doc.tags?.length > 0 && (
                      <span className="flex gap-1 flex-wrap">
                        {doc.tags.slice(0, 3).map((t: string) => (
                          <span key={t} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs">#{t}</span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
                <Heart size={15} className="text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
