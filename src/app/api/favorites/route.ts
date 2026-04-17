import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { canRead } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  const db = getDb();

  const favorites = db.prepare(`
    SELECT d.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
           u.name as author_name
    FROM document_favorites f
    JOIN documents d ON f.document_id = d.id
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN users u ON d.created_by = u.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(userId) as any[];

  // Filter out docs from categories the user can no longer read
  const visible = favorites.filter(d => {
    if (!d.category_id) return true;
    return canRead(userId, userRole, 'category', d.category_id);
  });

  return NextResponse.json({
    favorites: visible.map(d => ({ ...d, tags: JSON.parse(d.tags || '[]') })),
  });
}
