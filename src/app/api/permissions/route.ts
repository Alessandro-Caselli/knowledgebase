import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { grantPermission, revokePermission } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const resourceType = searchParams.get('resource_type');
  const resourceId = searchParams.get('resource_id');

  const db = getDb();
  let query = `
    SELECT p.*, 
      CASE WHEN p.subject_type = 'user' THEN u.name ELSE NULL END as subject_name,
      CASE WHEN p.subject_type = 'user' THEN u.email ELSE NULL END as subject_email
    FROM permissions p
    LEFT JOIN users u ON p.subject_type = 'user' AND p.subject_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (resourceType) { query += ' AND p.resource_type = ?'; params.push(resourceType); }
  if (resourceId) { query += ' AND p.resource_id = ?'; params.push(resourceId); }

  const permissions = db.prepare(query).all(...params);
  return NextResponse.json({ permissions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { subject_type, subject_id, resource_type, resource_id, permission } = body;

  if (!subject_type || !subject_id || !resource_type || !resource_id || !permission) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  grantPermission(session.user.id!, subject_type, subject_id, resource_type, resource_id, permission);
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { subject_type, subject_id, resource_type, resource_id } = body;

  revokePermission(subject_type, subject_id, resource_type, resource_id);
  return NextResponse.json({ success: true });
}
