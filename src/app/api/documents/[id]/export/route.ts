import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { canRead } from '@/lib/permissions';

// Strips HTML tags and returns plain text (for Word export fallback)
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'docx';

  const db = getDb();
  const doc = db.prepare(`
    SELECT d.*, u.name as author_name
    FROM documents d LEFT JOIN users u ON d.created_by = u.id WHERE d.id = ?
  `).get(id) as any;

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.category_id && !canRead(userId, userRole, 'category', doc.category_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const plainContent = htmlToPlainText(doc.content || '');

  if (format === 'txt') {
    // Plain text fallback
    const text = `${doc.title}\n${'='.repeat(doc.title.length)}\n\n${plainContent}`;
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.title)}.txt"`,
      },
    });
  }

  if (format === 'docx') {
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');

      const lines = plainContent.split('\n');
      const children: any[] = [
        new Paragraph({
          text: doc.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        }),
      ];

      if (doc.summary) {
        children.push(new Paragraph({
          children: [new TextRun({ text: doc.summary, italics: true, color: '6B7280' })],
          spacing: { after: 300 },
        }));
      }

      children.push(new Paragraph({
        children: [new TextRun({ text: '', break: 1 })],
      }));

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          children.push(new Paragraph({ text: '' }));
          continue;
        }
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed })],
          spacing: { after: 100 },
        }));
      }

      // Footer with metadata
      children.push(new Paragraph({ text: '', spacing: { before: 400 } }));
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `Documento: ${doc.title} · Versione: v${doc.version} · Autore: ${doc.author_name || 'N/A'} · Esportato il: ${new Date().toLocaleDateString('it-IT')}`, size: 18, color: '9CA3AF' }),
        ],
      }));

      const docxDoc = new Document({ sections: [{ children }] });
      const buffer = await Packer.toBuffer(docxDoc);

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.title)}.docx"`,
        },
      });
    } catch (err) {
      console.error('DOCX export error:', err);
      // Fall back to plain text if docx generation fails
      const text = `${doc.title}\n${'='.repeat(doc.title.length)}\n\n${plainContent}`;
      return new NextResponse(text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.title)}.txt"`,
        },
      });
    }
  }

  return NextResponse.json({ error: 'Unknown format' }, { status: 400 });
}
