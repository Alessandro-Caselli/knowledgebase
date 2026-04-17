'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/inputs';
import { LayoutTemplate, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useSession } from 'next-auth/react';

export default function NewDocumentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const isAdmin = session?.user?.role === 'admin';

  const [form, setForm] = useState({
    title: '',
    content: '',
    summary: '',
    category_id: '',
    tags: [] as string[],
    status: 'draft' as 'draft' | 'published',
    is_template: false,
    template_name: '',
    review_date: '',
  });

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || []));
    fetch('/api/templates').then(r => r.json()).then(d => setTemplates(d.templates || []));
  }, []);

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    set('content', tpl.content || '');
    set('summary', tpl.summary || '');
    set('tags', tpl.tags || []);
    if (!form.title) set('title', tpl.title);
    toast(`Template "${tpl.template_name || tpl.title}" applicato`, 'success');
  };

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => set('tags', form.tags.filter(t => t !== tag));

  const save = async (status?: string) => {
    if (!form.title.trim()) { toast('Il titolo è obbligatorio', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          status: status || form.status,
          is_template: form.is_template ? 1 : 0,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const doc = await res.json();
      toast('Documento salvato', 'success');
      router.push(`/dashboard/documents/${doc.id}`);
    } catch (e: any) {
      toast(e.message || 'Errore nel salvataggio', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400">Nuovo documento</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => save('draft')} loading={saving}>
            <Save size={15} /> Salva bozza
          </Button>
          <Button size="sm" onClick={() => save('published')} loading={saving}>
            Pubblica
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor area */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Template selector */}
            {templates.length > 0 && (
              <div className="flex items-center gap-2">
                <LayoutTemplate size={14} className="text-gray-400 flex-shrink-0" />
                <select
                  onChange={e => { if (e.target.value) { applyTemplate(e.target.value); e.target.value = ''; } }}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
                  defaultValue=""
                >
                  <option value="">Inizia da un template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.template_name || t.title}</option>
                  ))}
                </select>
              </div>
            )}
            <input
              placeholder="Titolo del documento..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full text-2xl font-bold text-gray-900 placeholder:text-gray-300 bg-transparent border-none outline-none"
            />
            <RichTextEditor
              value={form.content}
              onChange={v => set('content', v)}
              placeholder="Scrivi il contenuto del documento..."
              minHeight={480}
            />
          </div>

          {/* Sidebar settings */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-gray-700">Impostazioni</h3>

              <Select label="Categoria" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                <option value="">Senza categoria</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>

              <Select label="Stato" value={form.status} onChange={e => set('status', e.target.value as any)}>
                <option value="draft">Bozza</option>
                <option value="published">Pubblicato</option>
              </Select>

              <Textarea
                label="Sommario"
                placeholder="Breve descrizione..."
                value={form.summary}
                onChange={e => set('summary', e.target.value)}
                rows={3}
              />

              {/* Review date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                  <Calendar size={12} /> Data di revisione
                </label>
                <input
                  type="date"
                  value={form.review_date}
                  onChange={e => set('review_date', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Imposta una scadenza per la revisione di questo documento.</p>
              </div>

              {/* Template toggle (admin only) */}
              {isAdmin && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_template}
                      onChange={e => set('is_template', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 font-medium">Salva come template</span>
                  </label>
                  {form.is_template && (
                    <Input
                      label="Nome template"
                      value={form.template_name}
                      onChange={e => set('template_name', e.target.value)}
                      placeholder="es. Processo, Policy, How-To..."
                      className="mt-2"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Tag size={14} /> Tag
              </h3>
              <div className="flex gap-2 mb-2">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                  placeholder="Aggiungi tag..."
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={addTag} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                  +
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                      #{tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-blue-900 ml-0.5"><X size={10} /></button>
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
