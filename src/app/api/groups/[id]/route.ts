import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const db = getDb();
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
  const members = db.prepare(`
    SELECT u.id, u.email, u.name, u.role FROM group_members gm
    JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?
  `).all(id);
  return NextResponse.json({ group, members });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  if (body.name !== undefined || body.description !== undefined || body.color !== undefined) {
    db.prepare(`UPDATE groups SET name = COALESCE(?, name), description = COALESCE(?, description), color = COALESCE(?, color) WHERE id = ?`)
      .run(body.name ?? null, body.description ?? null, body.color ?? null, id);
  }

  // Update members if provided
  if (Array.isArray(body.member_ids)) {
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(id);
    const ins = db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)');
    body.member_ids.forEach((uid: string) => ins.run(id, uid));
  }

  return NextResponse.json(db.prepare('SELECT * FROM groups WHERE id = ?').get(id));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  getDb().prepare('DELETE FROM groups WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
