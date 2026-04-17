'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, all } from 'lowlight';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Minus, Link as LinkIcon, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Table as TableIcon, Undo, Redo,
  Unlink,
} from 'lucide-react';

const lowlight = createLowlight(all);

// ─── Toolbar Button ──────────────────────────────────────────────────────────
function ToolbarBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-1 self-center" />;
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────
function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const url = window.prompt('URL del link:', editor.getAttributes('link').href ?? '');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      {/* Undo / Redo */}
      <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annulla (Ctrl+Z)">
        <Undo size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Ripeti (Ctrl+Y)">
        <Redo size={15} />
      </ToolbarBtn>

      <Divider />

      {/* Headings */}
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
        <Heading1 size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
        <Heading2 size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
        <Heading3 size={15} />
      </ToolbarBtn>

      <Divider />

      {/* Inline formatting */}
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Grassetto (Ctrl+B)">
        <Bold size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Corsivo (Ctrl+I)">
        <Italic size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sottolineato (Ctrl+U)">
        <UnderlineIcon size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Barrato">
        <Strikethrough size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Codice inline">
        <Code size={15} />
      </ToolbarBtn>

      <Divider />

      {/* Alignment */}
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Allinea sinistra">
        <AlignLeft size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centra">
        <AlignCenter size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Allinea destra">
        <AlignRight size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Giustificato">
        <AlignJustify size={15} />
      </ToolbarBtn>

      <Divider />

      {/* Lists & blocks */}
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Elenco puntato">
        <List size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Elenco numerato">
        <ListOrdered size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Citazione">
        <Quote size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Blocco codice">
        <Code size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Separatore orizzontale">
        <Minus size={15} />
      </ToolbarBtn>

      <Divider />

      {/* Link */}
      <ToolbarBtn onClick={setLink} active={editor.isActive('link')} title="Inserisci link">
        <LinkIcon size={15} />
      </ToolbarBtn>
      {editor.isActive('link') && (
        <ToolbarBtn onClick={() => editor.chain().focus().unsetLink().run()} title="Rimuovi link">
          <Unlink size={15} />
        </ToolbarBtn>
      )}

      {/* Table */}
      <ToolbarBtn onClick={insertTable} title="Inserisci tabella">
        <TableIcon size={15} />
      </ToolbarBtn>
    </div>
  );
}

// ─── Main Editor Component ───────────────────────────────────────────────────
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({ value, onChange, placeholder = 'Scrivi il contenuto del documento...', minHeight = 400 }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline' } }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose-kb focus:outline-none px-6 py-5',
        style: `min-height: ${minHeight}px`,
      },
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  const chars = editor.storage.characterCount?.characters() ?? 0;
  const words = editor.storage.characterCount?.words() ?? 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {/* Footer */}
      <div className="flex items-center justify-end px-4 py-1.5 border-t border-gray-100 bg-gray-50">
        <span className="text-xs text-gray-400">{words} parole · {chars} caratteri</span>
      </div>
    </div>
  );
}

// ─── Read-only Viewer ────────────────────────────────────────────────────────
export function RichTextViewer({ content }: { content: string }) {
  // Detect if content is HTML (from TipTap) or plain text
  const isHtml = content.trim().startsWith('<');
  if (!isHtml) {
    // Render plain text with line breaks preserved
    return (
      <div className="prose-kb whitespace-pre-wrap">
        {content}
      </div>
    );
  }
  return (
    <div
      className="prose-kb"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
