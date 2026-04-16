'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/toast';

export default function EditDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState({
    title: '', content: '', summary: '',
    category_id: '', tags: [] as string[], status: 'draft',
    change_summary: '',
  });

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  useEffect(() => {
    Promise.all([
      fetch(`/api/documents/${id}`).then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]).then(([doc, cats]) => {
      if (!doc.error) {
        setForm({
          title: doc.title || '', content: doc.content || '',
          summary: doc.summary || '', category_id: doc.category_id || '',
          tags: doc.tags || [], status: doc.status || 'draft',
          change_summary: '',
        });
      }
      setCategories(cats.categories || []);
      setLoading(false);
    });
  }, [id]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const save = async () => {
    if (!form.title.trim()) { toast('Title required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Document updated', 'success');
      router.push(`/dashboard/documents/${id}`);
    } catch (e: any) {
      toast(e.message || 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <p className="text-sm text-gray-500 flex-1">Editing: <span className="font-medium text-gray-900">{form.title}</span></p>
        <button onClick={() => setPreview(p => !p)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${preview ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>
          <Eye size={15} /> {preview ? 'Edit' : 'Preview'}
        </button>
        <Button size="sm" onClick={save} loading={saving}><Save size={15} /> Save Changes</Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <input
              placeholder="Document title..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full text-2xl font-bold text-gray-900 placeholder:text-gray-300 bg-transparent border-none outline-none"
            />
            {preview ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-80 prose-kb"
                dangerouslySetInnerHTML={{ __html: form.content.replace(/\n/g, '<br/>') }} />
            ) : (
              <textarea
                value={form.content}
                onChange={e => set('content', e.target.value)}
                className="w-full min-h-96 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl p-5 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
                rows={24}
                placeholder="Write your content here..."
              />
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-700">Settings</h3>
              <Select label="Category" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                <option value="">Uncategorized</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
              <Textarea label="Summary" value={form.summary} onChange={e => set('summary', e.target.value)} rows={3} placeholder="Brief description..." />
              <Textarea label="Change Note" value={form.change_summary} onChange={e => set('change_summary', e.target.value)} rows={2} placeholder="What changed?" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><Tag size={14} /> Tags</h3>
              <div className="flex gap-2 mb-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag..." className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={addTag} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                    #{tag}
                    <button onClick={() => set('tags', form.tags.filter(t => t !== tag))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
