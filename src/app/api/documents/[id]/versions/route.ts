import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { canRead } from '@/lib/permissions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  const db = getDb();

  const doc = db.prepare('SELECT category_id FROM documents WHERE id = ?').get(id) as any;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.category_id && !canRead(userId, userRole, 'category', doc.category_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const versions = db.prepare(`
    SELECT v.*, u.name as author_name
    FROM document_versions v
    LEFT JOIN users u ON v.changed_by = u.id
    WHERE v.document_id = ?
    ORDER BY v.version DESC
  `).all(id);

  return NextResponse.json({ versions });
}
