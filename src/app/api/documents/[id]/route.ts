import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = getDb();

  const doc = db.prepare(`
    SELECT d.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
           u.name as author_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN users u ON d.created_by = u.id
    WHERE d.id = ?
  `).get(id) as any;

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ...doc, tags: JSON.parse(doc.tags || '[]') });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'viewer';

  const db = getDb();
  const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!hasPermission(userId, userRole, 'document', id, 'write') &&
      !hasPermission(userId, userRole, 'category', existing.category_id, 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, summary, category_id, tags, status, change_summary } = body;
  const newVersion = existing.version + 1;

  db.prepare(`
    UPDATE documents SET title = ?, content = ?, summary = ?, category_id = ?, tags = ?,
    status = ?, version = ?, updated_by = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(title ?? existing.title, content ?? existing.content, summary ?? existing.summary,
    category_id ?? existing.category_id, JSON.stringify(tags ?? JSON.parse(existing.tags || '[]')),
    status ?? existing.status, newVersion, userId, id);

  // Save version history
  db.prepare(`
    INSERT INTO document_versions (id, document_id, title, content, version, changed_by, change_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), id, title ?? existing.title, content ?? existing.content, newVersion, userId, change_summary || 'Updated');

  db.prepare(`INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details) VALUES (?, ?, 'update', 'document', ?, ?)`)
    .run(uuidv4(), userId, id, JSON.stringify({ title }));

  const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  return NextResponse.json({ ...updated, tags: JSON.parse(updated.tags || '[]') });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'viewer';

  const db = getDb();
  const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!hasPermission(userId, userRole, 'document', id, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  db.prepare(`INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details) VALUES (?, ?, 'delete', 'document', ?, ?)`)
    .run(uuidv4(), userId, id, JSON.stringify({ title: existing.title }));

  return NextResponse.json({ success: true });
}
