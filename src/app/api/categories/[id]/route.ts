import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const { name, description, icon, color, parent_id } = body;

  const db = getDb();
  db.prepare(`
    UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description),
    icon = COALESCE(?, icon), color = COALESCE(?, color), parent_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name, description, icon, color, parent_id || null, id);

  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  const db = getDb();
  // Orphan documents instead of deleting them
  db.prepare('UPDATE documents SET category_id = NULL WHERE category_id = ?').run(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  db.prepare(`INSERT INTO audit_log (id, user_id, action, resource_type, resource_id) VALUES (?, ?, 'delete', 'category', ?)`)
    .run(uuidv4(), session.user.id, id);

  return NextResponse.json({ success: true });
}
