import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('category');
  const status = searchParams.get('status') || 'published';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const userId = session.user.id!;
  const userRole = session.user.role || 'viewer';

  let query = `
    SELECT d.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
           u.name as author_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN users u ON d.created_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (userRole !== 'admin') {
    query += ` AND (d.status = 'published' OR d.created_by = ?)`;
    params.push(userId);
  } else if (status !== 'all') {
    query += ` AND d.status = ?`;
    params.push(status);
  }

  if (categoryId) {
    query += ` AND d.category_id = ?`;
    params.push(categoryId);
  }

  query += ` ORDER BY d.updated_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const docs = db.prepare(query).all(...params);
  const total = (db.prepare(`SELECT COUNT(*) as count FROM documents WHERE 1=1${categoryId ? ' AND category_id = ?' : ''}`).get(...(categoryId ? [categoryId] : [])) as any).count;

  return NextResponse.json({
    documents: docs.map((d: any) => ({ ...d, tags: JSON.parse(d.tags || '[]') })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id!;
  const userRole = session.user.role || 'viewer';

  const body = await req.json();
  const { title, content, summary, category_id, tags = [], status = 'draft' } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  // Check write permission on category
  if (category_id && !hasPermission(userId, userRole, 'category', category_id, 'write')) {
    return NextResponse.json({ error: 'No write permission for this category' }, { status: 403 });
  }

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO documents (id, title, content, summary, category_id, tags, status, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, content || '', summary || '', category_id || null, JSON.stringify(tags), status, userId, userId);

  // Save version
  db.prepare(`
    INSERT INTO document_versions (id, document_id, title, content, version, changed_by, change_summary)
    VALUES (?, ?, ?, ?, 1, ?, 'Initial creation')
  `).run(uuidv4(), id, title, content || '', userId);

  // Audit
  db.prepare(`INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details) VALUES (?, ?, 'create', 'document', ?, ?)`)
    .run(uuidv4(), userId, id, JSON.stringify({ title }));

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  return NextResponse.json({ ...doc, tags: JSON.parse(doc.tags || '[]') }, { status: 201 });
}
