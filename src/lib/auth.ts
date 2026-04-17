import NextAuth from 'next-auth';
import AzureAD from 'next-auth/providers/microsoft-entra-id';
import Credentials from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: { params: { scope: 'openid profile email User.Read' } },
    }),

    Credentials({
      id: 'local',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const db = getDb();

        // Dev shortcut: local-admin via env password
        if (
          credentials.email === 'admin@local.dev' &&
          credentials.password === (process.env.LOCAL_ADMIN_PASSWORD || 'admin123') &&
          process.env.NODE_ENV !== 'production'
        ) {
          const id = 'local-admin-00000000-0000-0000-0000-000000000000';
          const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
          if (!existing) {
            db.prepare(`INSERT INTO users (id, email, name, role, is_local, last_login) VALUES (?, ?, ?, 'admin', 1, datetime('now'))`)
              .run(id, 'admin@local.dev', 'Local Admin');
          } else {
            db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(id);
          }
          return { id, email: 'admin@local.dev', name: 'Local Admin', role: 'admin' };
        }

        // Normal local user login
        const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_local = 1').get(
          (credentials.email as string).toLowerCase()
        ) as any;

        if (!user || !user.password_hash) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password_hash);
        if (!valid) return null;

        db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.type === 'credentials') return true;
      if (!user.email) return false;
      const db = getDb();
      const azureId = profile?.sub || account?.providerAccountId;
      let existing = db.prepare('SELECT * FROM users WHERE email = ?').get(user.email) as any;
      if (!existing) {
        const newId = uuidv4();
        db.prepare(`INSERT INTO users (id, email, name, image, role, azure_id, last_login) VALUES (?, ?, ?, ?, 'member', ?, datetime('now'))`)
          .run(newId, user.email, user.name, user.image, azureId);
      } else {
        db.prepare(`UPDATE users SET last_login = datetime('now'), azure_id = ?, image = ? WHERE id = ?`)
          .run(azureId, user.image, existing.id);
      }
      db.prepare(`INSERT INTO audit_log (id, user_id, action, resource_type, details) VALUES (?, ?, 'login', 'user', ?)`)
        .run(uuidv4(), existing?.id || user.email, JSON.stringify({ email: user.email }));
      return true;
    },

    async jwt({ token, user, account }) {
      if (account && user) {
        if (account.type === 'credentials') {
          token.userId = (user as any).id;
          token.role = (user as any).role;
        } else if (user.email) {
          const db = getDb();
          const dbUser = db.prepare('SELECT * FROM users WHERE email = ?').get(user.email) as any;
          if (dbUser) { token.userId = dbUser.id; token.role = dbUser.role; }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
});
