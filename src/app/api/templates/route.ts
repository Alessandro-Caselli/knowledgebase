import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { parseTags } from '@/lib/utils';

// GET /api/templates — list all templates (admin only to create, everyone can use)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const templates = db.prepare(`
    SELECT d.id, d.title, d.content, d.summary, d.template_name, d.tags,
           u.name as author_name, d.created_at
    FROM documents d
    LEFT JOIN users u ON d.created_by = u.id
    WHERE d.is_template = 1
    ORDER BY d.template_name ASC, d.title ASC
  `).all() as any[];

  return NextResponse.json({
    templates: templates.map(t => ({ ...t, tags: parseTags(t.tags) })),
  });
}
