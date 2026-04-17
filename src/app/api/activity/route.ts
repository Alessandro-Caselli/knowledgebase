import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getVisibleCategoryIds } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id!;
  const userRole = session.user.role || 'member';
  const db = getDb();

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '40');

  const visibleCats = getVisibleCategoryIds(userId, userRole);

  // Build visibility filter for document-related events
  let catSubquery = '';
  const extraParams: any[] = [];
  if (visibleCats !== '*') {
    if (visibleCats.length === 0) {
      return NextResponse.json({ activities: [] });
    }
    const placeholders = visibleCats.map(() => '?').join(',');
    catSubquery = `
      AND (
        a.resource_type != 'document'
        OR a.resource_id IN (
          SELECT id FROM documents WHERE category_id IS NULL OR category_id IN (${placeholders})
        )
      )
    `;
    extraParams.push(...visibleCats);
  }

  // Non-admin users only see document-related activity
  const typeFilter = userRole !== 'admin'
    ? `AND a.resource_type IN ('document')`
    : '';

  const activities = db.prepare(`
    SELECT a.*, u.name as user_name, u.email as user_email,
           d.title as document_title
    FROM audit_log a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN documents d ON (a.resource_type = 'document' AND a.resource_id = d.id)
    WHERE 1=1 ${typeFilter} ${catSubquery}
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(...extraParams, limit) as any[];

  return NextResponse.json({
    activities: activities.map(a => ({
      ...a,
      details: (() => { try { return JSON.parse(a.details || '{}'); } catch { return {}; } })(),
    })),
  });
}
