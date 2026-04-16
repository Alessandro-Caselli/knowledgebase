'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Save, Eye, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/toast';

export default function NewDocumentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState({
    title: '',
    content: '',
    summary: '',
    category_id: '',
    tags: [] as string[],
    status: 'draft' as 'draft' | 'published',
  });

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || []));
  }, []);

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => set('tags', form.tags.filter(t => t !== tag));

  const save = async (status?: string) => {
    if (!form.title.trim()) { toast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: status || form.status }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const doc = await res.json();
      toast('Document saved successfully', 'success');
      router.push(`/dashboard/documents/${doc.id}`);
    } catch (e: any) {
      toast(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400">New Document</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${preview ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Eye size={15} /> {preview ? 'Edit' : 'Preview'}
          </button>
          <Button variant="secondary" size="sm" onClick={() => save('draft')} loading={saving}>
            <Save size={15} /> Save Draft
          </Button>
          <Button size="sm" onClick={() => save('published')} loading={saving}>
            Publish
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <input
              placeholder="Document title..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full text-2xl font-bold text-gray-900 placeholder:text-gray-300 bg-transparent border-none outline-none resize-none"
            />
            {preview ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-80 prose-kb"
                dangerouslySetInnerHTML={{ __html: form.content.replace(/\n/g, '<br/>') }} />
            ) : (
              <textarea
                placeholder="Start writing your document... (Markdown supported)"
                value={form.content}
                onChange={e => set('content', e.target.value)}
                className="w-full flex-1 min-h-96 text-sm text-gray-700 placeholder:text-gray-300 bg-white border border-gray-200 rounded-xl p-5 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
                rows={24}
              />
            )}
          </div>

          {/* Sidebar meta */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-700">Document Settings</h3>

              <Select
                label="Category"
                value={form.category_id}
                onChange={e => set('category_id', e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>

              <Select
                label="Status"
                value={form.status}
                onChange={e => set('status', e.target.value as any)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>

              <Textarea
                label="Summary"
                placeholder="Brief description..."
                value={form.summary}
                onChange={e => set('summary', e.target.value)}
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Tag size={14} /> Tags
              </h3>
              <div className="flex gap-2 mb-2">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag..."
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={addTag} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                  Add
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                      #{tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-blue-900"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
