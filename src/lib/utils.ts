import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse a tags field that may be:
 * - a valid JSON array string: '["tag1","tag2"]'
 * - a comma-separated plain string: 'tag1,tag2'  (legacy)
 * - a single plain word: 'ciao'  (legacy)
 * - null / undefined / ''
 */
export function parseTags(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();
  // Try JSON first
  if (trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed) as string[]; } catch {}
  }
  // Fallback: treat as comma-separated plain text
  return trimmed.split(',').map(t => t.trim()).filter(Boolean);
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export const ROLES = ['admin', 'editor', 'viewer'] as const;
export type Role = typeof ROLES[number];

export const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-red-100 text-red-800',
  editor: 'bg-blue-100 text-blue-800',
  viewer: 'bg-gray-100 text-gray-800',
};

export const STATUS_COLORS = {
  published: 'bg-green-100 text-green-800',
  draft: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-gray-100 text-gray-600',
};

export const CATEGORY_ICONS = [
  'folder', 'book-open', 'code-2', 'users', 'bar-chart-2',
  'shield', 'settings', 'globe', 'database', 'layout',
  'briefcase', 'heart', 'star', 'zap', 'lock',
] as const;
