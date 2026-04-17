import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { canRead } from '@/lib/permissions';
import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, attachmentId } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  const db = getDb();

  const doc = db.prepare('SELECT category_id FROM documents WHERE id = ?').get(id) as any;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.category_id && !canRead(userId, userRole, 'category', doc.category_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const attachment = db.prepare('SELECT * FROM document_attachments WHERE id = ? AND document_id = ?')
    .get(attachmentId, id) as any;
  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const filePath = path.join(UPLOADS_DIR, attachment.file_path);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });

  const fileBuffer = fs.readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': attachment.file_type,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.file_name)}"`,
      'Content-Length': String(attachment.file_size),
    },
  });
}
