import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { canRead, canWrite } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

function ensureAttachmentsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_attachments (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      uploaded_by TEXT REFERENCES users(id),
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// GET — list attachments for a document
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  ensureAttachmentsTable();
  const db = getDb();

  const doc = db.prepare('SELECT category_id FROM documents WHERE id = ?').get(id) as any;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.category_id && !canRead(userId, userRole, 'category', doc.category_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const attachments = db.prepare(`
    SELECT a.*, u.name as uploader_name FROM document_attachments a
    LEFT JOIN users u ON a.uploaded_by = u.id
    WHERE a.document_id = ? ORDER BY a.uploaded_at DESC
  `).all(id);

  return NextResponse.json({ attachments });
}

// POST — upload a new attachment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  ensureAttachmentsTable();
  const db = getDb();

  const doc = db.prepare('SELECT category_id FROM documents WHERE id = ?').get(id) as any;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.category_id && !canWrite(userId, userRole, 'category', doc.category_id)) {
    return NextResponse.json({ error: 'No write permission' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  // Validate file size (max 20 MB)
  const MAX_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File troppo grande (max 20 MB)' }, { status: 400 });
  }

  // Save file to disk
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const ext = path.extname(file.name);
  const storedName = `${uuidv4()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, storedName);
  const arrayBuffer = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

  const attachmentId = uuidv4();
  db.prepare(`
    INSERT INTO document_attachments (id, document_id, file_name, file_path, file_size, file_type, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(attachmentId, id, file.name, storedName, file.size, file.type || 'application/octet-stream', userId);

  const attachment = db.prepare('SELECT * FROM document_attachments WHERE id = ?').get(attachmentId);
  return NextResponse.json(attachment, { status: 201 });
}

// DELETE — remove an attachment
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  ensureAttachmentsTable();

  const { searchParams } = new URL(req.url);
  const attachmentId = searchParams.get('attachmentId');
  if (!attachmentId) return NextResponse.json({ error: 'attachmentId required' }, { status: 400 });

  const db = getDb();
  const attachment = db.prepare('SELECT * FROM document_attachments WHERE id = ?').get(attachmentId) as any;
  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (userRole !== 'admin' && attachment.uploaded_by !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete from disk
  const filePath = path.join(UPLOADS_DIR, attachment.file_path);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM document_attachments WHERE id = ?').run(attachmentId);
  return NextResponse.json({ success: true });
}
