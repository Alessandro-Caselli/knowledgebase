import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { grantPermission, revokePermission } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const resourceType = searchParams.get('resource_type');
  const resourceId = searchParams.get('resource_id');
  const db = getDb();

  let q = `
    SELECT p.*,
      CASE WHEN p.subject_type = 'user' THEN u.name ELSE g.name END as subject_name,
      CASE WHEN p.subject_type = 'user' THEN u.email ELSE NULL END as subject_email
    FROM permissions p
    LEFT JOIN users u ON p.subject_type = 'user' AND p.subject_id = u.id
    LEFT JOIN groups g ON p.subject_type = 'group' AND p.subject_id = g.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (resourceType) { q += ' AND p.resource_type = ?'; params.push(resourceType); }
  if (resourceId) { q += ' AND p.resource_id = ?'; params.push(resourceId); }

  return NextResponse.json({ permissions: db.prepare(q).all(...params) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { subject_type, subject_id, resource_type, resource_id, permission } = await req.json();
  if (!subject_type || !subject_id || !resource_type || !resource_id || !permission)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  grantPermission(session.user.id!, subject_type, subject_id, resource_type, resource_id, permission);
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { subject_type, subject_id, resource_type, resource_id } = await req.json();
  revokePermission(subject_type, subject_id, resource_type, resource_id);
  return NextResponse.json({ success: true });
}
