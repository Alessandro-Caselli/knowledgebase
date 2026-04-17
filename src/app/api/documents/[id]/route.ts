import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { canRead, canWrite, getEffectivePermission } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';
import { parseTags } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';

  const doc = db.prepare(`
    SELECT d.*, c.name as category_name, c.color as category_color, c.icon as category_icon, u.name as author_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN users u ON d.created_by = u.id
    WHERE d.id = ?
  `).get(id) as any;

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check visibility — if category has no_access, block
  if (doc.category_id && !canRead(userId, userRole, 'category', doc.category_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ ...doc, tags: parseTags(doc.tags) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';

  const db = getDb();
  const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Must have write on category or be owner with write somewhere
  const hasWrite = userRole === 'admin' ||
    (existing.category_id && canWrite(userId, userRole, 'category', existing.category_id)) ||
    (existing.created_by === userId && canWrite(userId, userRole, 'document', id));

  if (!hasWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { title, content, summary, category_id, tags, status, change_summary } = body;
  const newVersion = existing.version + 1;

  db.prepare(`
    UPDATE documents SET title = ?, content = ?, summary = ?, category_id = ?, tags = ?,
    status = ?, version = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?
  `).run(
    title ?? existing.title, content ?? existing.content, summary ?? existing.summary,
    category_id ?? existing.category_id, JSON.stringify(tags ?? parseTags(existing.tags)),
    status ?? existing.status, newVersion, userId, id
  );

  db.prepare(`
    INSERT INTO document_versions (id, document_id, title, content, version, changed_by, change_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), id, title ?? existing.title, content ?? existing.content, newVersion, userId, change_summary || 'Updated');

  db.prepare(`INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details) VALUES (?, ?, 'update', 'document', ?, ?)`)
    .run(uuidv4(), userId, id, JSON.stringify({ title }));

  const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  return NextResponse.json({ ...updated, tags: parseTags(updated.tags) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';

  if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  db.prepare(`INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details) VALUES (?, ?, 'delete', 'document', ?, ?)`)
    .run(uuidv4(), userId, id, JSON.stringify({ title: existing.title }));

  return NextResponse.json({ success: true });
}
