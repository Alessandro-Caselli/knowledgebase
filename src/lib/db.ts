import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'knowledgebase.db');

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'viewer',
      azure_id TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'folder',
      color TEXT DEFAULT '#6366f1',
      parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      summary TEXT,
      file_path TEXT,
      file_name TEXT,
      file_size INTEGER,
      file_type TEXT,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      tags TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT REFERENCES users(id),
      updated_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT,
      version INTEGER NOT NULL,
      changed_by TEXT REFERENCES users(id),
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      change_summary TEXT
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      permission TEXT NOT NULL,
      granted_by TEXT REFERENCES users(id),
      granted_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(subject_type, subject_id, resource_type, resource_id, permission)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      title,
      content,
      summary,
      tags,
      content='documents',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
      INSERT INTO documents_fts(rowid, title, content, summary, tags)
      VALUES (new.rowid, new.title, new.content, new.summary, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, content, summary, tags)
      VALUES ('delete', old.rowid, old.title, old.content, old.summary, old.tags);
      INSERT INTO documents_fts(rowid, title, content, summary, tags)
      VALUES (new.rowid, new.title, new.content, new.summary, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, content, summary, tags)
      VALUES ('delete', old.rowid, old.title, old.content, old.summary, old.tags);
    END;
  `);

  // Seed default admin if none exists
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    const { v4: uuidv4 } = require('uuid');
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, name, role) VALUES (?, ?, ?, ?)
    `).run(uuidv4(), 'admin@knowledgebase.local', 'System Admin', 'admin');
  }

  // Seed default categories
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (catCount.count === 0) {
    const { v4: uuidv4 } = require('uuid');
    const cats = [
      { name: 'General', slug: 'general', icon: 'book-open', color: '#6366f1' },
      { name: 'Engineering', slug: 'engineering', icon: 'code-2', color: '#0ea5e9' },
      { name: 'HR & People', slug: 'hr-people', icon: 'users', color: '#10b981' },
      { name: 'Finance', slug: 'finance', icon: 'bar-chart-2', color: '#f59e0b' },
      { name: 'Legal', slug: 'legal', icon: 'shield', color: '#ef4444' },
    ];
    const insert = db.prepare('INSERT OR IGNORE INTO categories (id, name, slug, icon, color) VALUES (?, ?, ?, ?, ?)');
    cats.forEach(c => insert.run(uuidv4(), c.name, c.slug, c.icon, c.color));
  }
}

export type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: 'admin' | 'editor' | 'viewer';
  azure_id: string | null;
  created_at: string;
  last_login: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  title: string;
  content: string | null;
  summary: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  category_id: string | null;
  tags: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Permission = {
  id: string;
  subject_type: 'user' | 'role';
  subject_id: string;
  resource_type: 'category' | 'document' | 'global';
  resource_id: string;
  permission: 'read' | 'write' | 'admin';
  granted_by: string | null;
  granted_at: string;
};
