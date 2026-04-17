import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getDb();
  const groups = db.prepare(`
    SELECT g.*, COUNT(gm.user_id) as member_count
    FROM groups g LEFT JOIN group_members gm ON gm.group_id = g.id
    GROUP BY g.id ORDER BY g.name
  `).all();
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { name, description, color = '#6366f1' } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const db = getDb();
  const existing = db.prepare('SELECT id FROM groups WHERE name = ?').get(name.trim());
  if (existing) return NextResponse.json({ error: 'Group already exists' }, { status: 409 });
  const id = uuidv4();
  db.prepare(`INSERT INTO groups (id, name, description, color, created_by) VALUES (?, ?, ?, ?, ?)`)
    .run(id, name.trim(), description || null, color, session.user.id);
  return NextResponse.json(db.prepare('SELECT * FROM groups WHERE id = ?').get(id), { status: 201 });
}
