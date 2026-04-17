import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { canRead } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';

// Ensure table exists (safe migration)
function ensureFavTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_favorites (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(document_id, user_id)
    );
  `);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  ensureFavTable();
  const db = getDb();
  const fav = db.prepare('SELECT id FROM document_favorites WHERE document_id = ? AND user_id = ?')
    .get(id, session.user.id);
  return NextResponse.json({ favorited: !!fav });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  ensureFavTable();
  const db = getDb();

  const doc = db.prepare('SELECT category_id FROM documents WHERE id = ?').get(id) as any;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.category_id && !canRead(userId, userRole, 'category', doc.category_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  db.prepare('INSERT OR IGNORE INTO document_favorites (id, document_id, user_id) VALUES (?, ?, ?)')
    .run(uuidv4(), id, userId);
  return NextResponse.json({ favorited: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  ensureFavTable();
  const db = getDb();
  db.prepare('DELETE FROM document_favorites WHERE document_id = ? AND user_id = ?')
    .run(id, session.user.id);
  return NextResponse.json({ favorited: false });
}
