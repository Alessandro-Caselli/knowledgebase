import { getDb } from '@/lib/db';

export type PermissionLevel = 'read' | 'write' | 'admin';

export function hasPermission(
  userId: string,
  userRole: string,
  resourceType: 'category' | 'document' | 'global',
  resourceId: string,
  required: PermissionLevel
): boolean {
  // Admins have all permissions
  if (userRole === 'admin') return true;

  const db = getDb();
  const levels: Record<PermissionLevel, number> = { read: 1, write: 2, admin: 3 };

  // Check user-specific permission
  const userPerm = db.prepare(`
    SELECT permission FROM permissions
    WHERE subject_type = 'user' AND subject_id = ?
      AND resource_type = ? AND resource_id = ?
    ORDER BY permission DESC LIMIT 1
  `).get(userId, resourceType, resourceId) as { permission: string } | undefined;

  if (userPerm && levels[userPerm.permission as PermissionLevel] >= levels[required]) return true;

  // Check role-based permission
  const rolePerm = db.prepare(`
    SELECT permission FROM permissions
    WHERE subject_type = 'role' AND subject_id = ?
      AND resource_type = ? AND resource_id = ?
    ORDER BY permission DESC LIMIT 1
  `).get(userRole, resourceType, resourceId) as { permission: string } | undefined;

  if (rolePerm && levels[rolePerm.permission as PermissionLevel] >= levels[required]) return true;

  // Check global permission
  const globalPerm = db.prepare(`
    SELECT permission FROM permissions
    WHERE (subject_type = 'user' AND subject_id = ? OR subject_type = 'role' AND subject_id = ?)
      AND resource_type = 'global' AND resource_id = 'all'
    ORDER BY permission DESC LIMIT 1
  `).get(userId, userRole) as { permission: string } | undefined;

  if (globalPerm && levels[globalPerm.permission as PermissionLevel] >= levels[required]) return true;

  // Default role permissions
  if (userRole === 'editor') {
    return levels[required] <= levels['write'];
  }
  if (userRole === 'viewer') {
    return levels[required] <= levels['read'];
  }

  return false;
}

export function getAccessibleCategories(userId: string, userRole: string): string[] {
  if (userRole === 'admin') return ['*'];
  const db = getDb();

  const perms = db.prepare(`
    SELECT DISTINCT resource_id FROM permissions
    WHERE (subject_type = 'user' AND subject_id = ? OR subject_type = 'role' AND subject_id = ?)
      AND resource_type = 'category'
  `).all(userId, userRole) as { resource_id: string }[];

  return perms.map(p => p.resource_id);
}

export function grantPermission(
  grantedBy: string,
  subjectType: 'user' | 'role',
  subjectId: string,
  resourceType: 'category' | 'document' | 'global',
  resourceId: string,
  permission: PermissionLevel
) {
  const db = getDb();
  const { v4: uuidv4 } = require('uuid');

  db.prepare(`
    INSERT OR REPLACE INTO permissions (id, subject_type, subject_id, resource_type, resource_id, permission, granted_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), subjectType, subjectId, resourceType, resourceId, permission, grantedBy);
}

export function revokePermission(
  subjectType: 'user' | 'role',
  subjectId: string,
  resourceType: 'category' | 'document' | 'global',
  resourceId: string
) {
  const db = getDb();
  db.prepare(`
    DELETE FROM permissions
    WHERE subject_type = ? AND subject_id = ? AND resource_type = ? AND resource_id = ?
  `).run(subjectType, subjectId, resourceType, resourceId);
}
