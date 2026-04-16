import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const users = db.prepare(`
    SELECT id, email, name, image, role, created_at, last_login FROM users ORDER BY created_at DESC
  `).all();
  return NextResponse.json({ users });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, role } = body;

  if (!id || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (!['admin', 'editor', 'viewer'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  const db = getDb();
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(id);
  return NextResponse.json(user);
}
