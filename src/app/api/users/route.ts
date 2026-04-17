import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getDb();
  const users = db.prepare(`SELECT id, email, name, image, role, is_local, created_at, last_login FROM users ORDER BY created_at DESC`).all();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, name, role = 'member', password } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
  if (existing) return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });

  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 12);

  db.prepare(`INSERT INTO users (id, email, name, role, password_hash, is_local) VALUES (?, ?, ?, ?, ?, 1)`)
    .run(id, email.trim().toLowerCase(), name?.trim() || null, role, password_hash);

  db.prepare(`INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details) VALUES (?, ?, 'create_user', 'user', ?, ?)`)
    .run(uuidv4(), session.user.id, id, JSON.stringify({ email, name, role }));

  const user = db.prepare('SELECT id, email, name, role, is_local, created_at FROM users WHERE id = ?').get(id);
  return NextResponse.json(user, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, role, name, password } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const db = getDb();
  if (id === session.user.id && role && role !== 'admin') return NextResponse.json({ error: "Can't demote yourself" }, { status: 400 });

  if (role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, id);
  if (password && password.length >= 6) {
    const hash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  }

  return NextResponse.json(db.prepare('SELECT id, email, name, role, is_local FROM users WHERE id = ?').get(id));
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  if (id === session.user.id) return NextResponse.json({ error: "Can't delete yourself" }, { status: 400 });
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
