'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, FileText, FolderOpen, Clock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/inputs';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [catFilter, setCatFilter] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query || query.length < 2) { setResults([]); setSearched(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      const params = new URLSearchParams({ q: query });
      if (catFilter) params.set('category', catFilter);
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setResults(data.results || []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, catFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search hero */}
      <div className="bg-white border-b border-gray-200 px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Search Knowledge Base</h1>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search documents, titles, content..."
              className="w-full pl-11 pr-4 py-3.5 text-base rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none shadow-sm transition-colors"
            />
            {loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setCatFilter('')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${!catFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All
            </button>
            {categories.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCatFilter(catFilter === c.id ? '' : c.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${catFilter === c.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={catFilter === c.id ? { background: c.color } : {}}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {!searched && (
          <div className="text-center text-gray-400 mt-10">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-base">Start typing to search across all documents</p>
            <p className="text-sm mt-1">Searches titles, content, summaries, and tags</p>
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">No results for "{query}"</p>
            <p className="text-sm mt-1">Try different keywords or check your spelling</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <p className="text-sm text-gray-400 mb-4">{results.length} result{results.length !== 1 ? 's' : ''} for "<span className="text-gray-700 font-medium">{query}</span>"</p>
            <div className="flex flex-col gap-3">
              {results.map((doc: any) => (
                <Link key={doc.id} href={`/dashboard/documents/${doc.id}`}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-sm transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: (doc.category_color || '#6366f1') + '20' }}>
                      <FileText size={15} style={{ color: doc.category_color || '#6366f1' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{doc.title}</p>
                      {doc.snippet && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: doc.snippet }} />
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {doc.category_name && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <FolderOpen size={11} /> {doc.category_name}
                          </span>
                        )}
                        {doc.updated_at && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(doc.updated_at + 'Z').toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
