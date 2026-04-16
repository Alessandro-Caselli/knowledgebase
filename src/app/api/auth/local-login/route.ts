import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// LOCAL DEV ONLY — blocked in production
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const db = getDb();
  const id = 'local-admin-00000000-0000-0000-0000-000000000000';
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  if (!existing) {
    db.prepare(`
      INSERT INTO users (id, email, name, role, azure_id, last_login)
      VALUES (?, ?, ?, 'admin', 'local-dev', datetime('now'))
    `).run(id, 'admin@local.dev', 'Local Admin');
  } else {
    db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(id);
  }

  return NextResponse.json({ success: true, userId: id, email: 'admin@local.dev', role: 'admin' });
}
