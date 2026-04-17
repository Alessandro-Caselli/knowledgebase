import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getVisibleCategoryIds } from '@/lib/permissions';
import { slugify } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  const visibleCats = getVisibleCategoryIds(userId, userRole);

  let query = `
    SELECT c.*, COUNT(d.id) as document_count
    FROM categories c
    LEFT JOIN documents d ON d.category_id = c.id AND d.status = 'published'
  `;
  let params: any[] = [];

  if (visibleCats !== '*') {
    if (visibleCats.length === 0) return NextResponse.json({ categories: [] });
    query += ` WHERE c.id IN (${visibleCats.map(() => '?').join(',')})`;
    params = visibleCats;
  }

  query += ' GROUP BY c.id ORDER BY c.name ASC';
  const categories = db.prepare(query).all(...params);
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, icon = 'folder', color = '#6366f1', parent_id } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const db = getDb();
  const slug = slugify(name);
  const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (existing) return NextResponse.json({ error: 'Category already exists' }, { status: 409 });

  const id = uuidv4();
  db.prepare(`INSERT INTO categories (id, name, slug, description, icon, color, parent_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, name.trim(), slug, description || null, icon, color, parent_id || null, session.user.id);

  return NextResponse.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id), { status: 201 });
}
