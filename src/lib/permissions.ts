import { getDb } from '@/lib/db';

// Levels: no_access=0, read=1, write=2, admin=3
// no_access explicitly blocks — even if another rule grants access
export type PermissionLevel = 'no_access' | 'read' | 'write' | 'admin';

const LEVELS: Record<PermissionLevel, number> = {
  no_access: 0, read: 1, write: 2, admin: 3,
};

function getUserGroupIds(userId: string): string[] {
  const db = getDb();
  const rows = db.prepare(`SELECT group_id FROM group_members WHERE user_id = ?`).all(userId) as any[];
  return rows.map(r => r.group_id);
}

/** Returns the effective permission level for a user on a resource */
export function getEffectivePermission(
  userId: string,
  userRole: string,
  resourceType: 'category' | 'document',
  resourceId: string,
): PermissionLevel {
  if (userRole === 'admin') return 'admin';

  const db = getDb();
  const groupIds = getUserGroupIds(userId);

  // Gather all relevant permission rows (user + groups + role + global)
  const subjects: { type: string; id: string }[] = [
    { type: 'user', id: userId },
    ...groupIds.map(gid => ({ type: 'group', id: gid })),
    { type: 'role', id: userRole },
  ];

  // Build placeholders
  const placeholders = subjects.map(() => '(?,?)').join(',');
  const args: string[] = subjects.flatMap(s => [s.type, s.id]);

  // Resource-specific permissions
  const resourcePerms = db.prepare(`
    SELECT permission FROM permissions
    WHERE (subject_type, subject_id) IN (VALUES ${placeholders})
      AND resource_type = ? AND resource_id = ?
  `).all(...args, resourceType, resourceId) as { permission: string }[];

  // Global permissions
  const globalPerms = db.prepare(`
    SELECT permission FROM permissions
    WHERE (subject_type, subject_id) IN (VALUES ${placeholders})
      AND resource_type = 'global' AND resource_id = 'all'
  `).all(...args) as { permission: string }[];

  const allPerms = [...resourcePerms, ...globalPerms];

  // If ANY rule says no_access → blocked
  if (allPerms.some(p => p.permission === 'no_access')) return 'no_access';

  // Take the highest level granted
  let best: PermissionLevel = 'no_access';
  for (const p of allPerms) {
    const level = p.permission as PermissionLevel;
    if (LEVELS[level] > LEVELS[best]) best = level;
  }

  // Fall back to role defaults if nothing explicit set
  if (best === 'no_access') {
    if (userRole === 'editor') return 'write';
    if (userRole === 'member') return 'read';
  }

  return best;
}

export function canRead(userId: string, userRole: string, resourceType: 'category' | 'document', resourceId: string) {
  const p = getEffectivePermission(userId, userRole, resourceType, resourceId);
  return LEVELS[p] >= LEVELS['read'];
}

export function canWrite(userId: string, userRole: string, resourceType: 'category' | 'document', resourceId: string) {
  const p = getEffectivePermission(userId, userRole, resourceType, resourceId);
  return LEVELS[p] >= LEVELS['write'];
}

/** Returns list of category IDs the user can at least read. Returns ['*'] for admin. */
export function getVisibleCategoryIds(userId: string, userRole: string): string[] | '*' {
  if (userRole === 'admin') return '*';
  const db = getDb();
  const allCats = db.prepare('SELECT id FROM categories').all() as { id: string }[];
  return allCats
    .filter(c => canRead(userId, userRole, 'category', c.id))
    .map(c => c.id);
}

export function grantPermission(
  grantedBy: string,
  subjectType: 'user' | 'group' | 'role',
  subjectId: string,
  resourceType: 'category' | 'document' | 'global',
  resourceId: string,
  permission: PermissionLevel,
) {
  const db = getDb();
  const { v4: uuidv4 } = require('uuid');
  db.prepare(`
    INSERT OR REPLACE INTO permissions (id, subject_type, subject_id, resource_type, resource_id, permission, granted_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), subjectType, subjectId, resourceType, resourceId, permission, grantedBy);
}

export function revokePermission(
  subjectType: string, subjectId: string,
  resourceType: string, resourceId: string,
) {
  getDb().prepare(`
    DELETE FROM permissions
    WHERE subject_type = ? AND subject_id = ? AND resource_type = ? AND resource_id = ?
  `).run(subjectType, subjectId, resourceType, resourceId);
}
