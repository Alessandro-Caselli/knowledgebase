import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getVisibleCategoryIds } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const category = searchParams.get('category');
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const db = getDb();
  const userId = session.user.id!;
  const userRole = session.user.role || 'member';

  const visibleCats = getVisibleCategoryIds(userId, userRole);

  // Build category constraint
  let catFilter = '';
  const params: any[] = [q + '*'];

  if (visibleCats !== '*') {
    if (visibleCats.length === 0) return NextResponse.json({ results: [] });
    if (category) {
      if (!visibleCats.includes(category)) return NextResponse.json({ results: [] });
      catFilter = ' AND d.category_id = ?';
      params.push(category);
    } else {
      catFilter = ` AND (d.category_id IS NULL OR d.category_id IN (${visibleCats.map(() => '?').join(',')}))`;
      params.push(...visibleCats);
    }
  } else if (category) {
    catFilter = ' AND d.category_id = ?';
    params.push(category);
  }

  const statusFilter = userRole !== 'admin' ? ` AND (d.status = 'published' OR d.created_by = ?)` : '';
  if (userRole !== 'admin') params.push(userId);

  params.push(30);

  const query = `
    SELECT d.id, d.title, d.summary, d.status, d.updated_at,
           c.name as category_name, c.color as category_color, c.icon as category_icon,
           snippet(documents_fts, 1, '<mark>', '</mark>', '...', 20) as snippet
    FROM documents_fts
    JOIN documents d ON documents_fts.rowid = d.rowid
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE documents_fts MATCH ? ${catFilter} ${statusFilter}
    ORDER BY rank LIMIT ?
  `;

  const results = db.prepare(query).all(...params);
  return NextResponse.json({ results, query: q });
}
