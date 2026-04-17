import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { canRead } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';

function ensureCommentsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_comments (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  ensureCommentsTable();
  const db = getDb();

  const doc = db.prepare('SELECT category_id FROM documents WHERE id = ?').get(id) as any;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.category_id && !canRead(userId, userRole, 'category', doc.category_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const comments = db.prepare(`
    SELECT c.*, u.name as author_name
    FROM document_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.document_id = ?
    ORDER BY c.created_at ASC
  `).all(id);

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  ensureCommentsTable();
  const db = getDb();

  const doc = db.prepare('SELECT category_id FROM documents WHERE id = ?').get(id) as any;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.category_id && !canRead(userId, userRole, 'category', doc.category_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { content } = body;
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

  const commentId = uuidv4();
  db.prepare(`
    INSERT INTO document_comments (id, document_id, user_id, content) VALUES (?, ?, ?, ?)
  `).run(commentId, id, userId, content.trim());

  db.prepare(`INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details) VALUES (?, ?, 'comment', 'document', ?, ?)`)
    .run(uuidv4(), userId, id, JSON.stringify({ comment_id: commentId }));

  const comment = db.prepare(`
    SELECT c.*, u.name as author_name FROM document_comments c
    LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(commentId);

  return NextResponse.json(comment, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  ensureCommentsTable();

  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get('commentId');
  if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 });

  const db = getDb();
  const comment = db.prepare('SELECT * FROM document_comments WHERE id = ?').get(commentId) as any;
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only the author or an admin can delete a comment
  if (userRole !== 'admin' && comment.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  db.prepare('DELETE FROM document_comments WHERE id = ?').run(commentId);
  return NextResponse.json({ success: true });
}
