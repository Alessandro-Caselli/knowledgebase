import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getVisibleCategoryIds, canWrite } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('category');
  const status = searchParams.get('status') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';

  // Get visible categories
  const visibleCats = getVisibleCategoryIds(userId, userRole);

  // Build category filter
  let catFilter = '';
  const params: any[] = [];

  if (visibleCats !== '*') {
    if (visibleCats.length === 0) return NextResponse.json({ documents: [], total: 0, page, pages: 0 });
    if (categoryId) {
      if (!visibleCats.includes(categoryId)) return NextResponse.json({ documents: [], total: 0, page, pages: 0 });
      catFilter = ' AND d.category_id = ?';
      params.push(categoryId);
    } else {
      catFilter = ` AND (d.category_id IS NULL OR d.category_id IN (${visibleCats.map(() => '?').join(',')}))`;
      params.push(...visibleCats);
    }
  } else if (categoryId) {
    catFilter = ' AND d.category_id = ?';
    params.push(categoryId);
  }

  let statusFilter = '';
  if (userRole !== 'admin') {
    statusFilter = ` AND (d.status = 'published' OR d.created_by = ?)`;
    params.push(userId);
  } else if (status !== 'all') {
    statusFilter = ' AND d.status = ?';
    params.push(status);
  }

  const query = `
    SELECT d.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
           u.name as author_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN users u ON d.created_by = u.id
    WHERE 1=1 ${catFilter} ${statusFilter}
    ORDER BY d.updated_at DESC LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);

  const docs = db.prepare(query).all(...params) as any[];
  const total = docs.length; // simplified count

  return NextResponse.json({
    documents: docs.map(d => ({ ...d, tags: JSON.parse(d.tags || '[]') })),
    total, page, pages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  const body = await req.json();
  const { title, content, summary, category_id, tags = [], status = 'draft' } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  if (category_id && !canWrite(userId, userRole, 'category', category_id)) {
    return NextResponse.json({ error: 'No write permission for this category' }, { status: 403 });
  }

  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO documents (id, title, content, summary, category_id, tags, status, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, content || '', summary || '', category_id || null, JSON.stringify(tags), status, userId, userId);

  db.prepare(`
    INSERT INTO document_versions (id, document_id, title, content, version, changed_by, change_summary)
    VALUES (?, ?, ?, ?, 1, ?, 'Initial creation')
  `).run(uuidv4(), id, title, content || '', userId);

  db.prepare(`INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details) VALUES (?, ?, 'create', 'document', ?, ?)`)
    .run(uuidv4(), userId, id, JSON.stringify({ title }));

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  return NextResponse.json({ ...doc, tags: JSON.parse(doc.tags || '[]') }, { status: 201 });
}
