import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const category = searchParams.get('category');

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const db = getDb();
  const userRole = session.user.role || 'viewer';
  const userId = session.user.id!;

  let query = `
    SELECT d.id, d.title, d.summary, d.status, d.updated_at,
           c.name as category_name, c.color as category_color, c.icon as category_icon,
           snippet(documents_fts, 1, '<mark>', '</mark>', '...', 20) as snippet
    FROM documents_fts
    JOIN documents d ON documents_fts.rowid = d.rowid
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE documents_fts MATCH ?
  `;

  const params: any[] = [q + '*'];

  if (userRole !== 'admin') {
    query += ` AND (d.status = 'published' OR d.created_by = ?)`;
    params.push(userId);
  }

  if (category) {
    query += ` AND d.category_id = ?`;
    params.push(category);
  }

  query += ` ORDER BY rank LIMIT 30`;

  const results = db.prepare(query).all(...params);
  return NextResponse.json({ results, query: q });
}
