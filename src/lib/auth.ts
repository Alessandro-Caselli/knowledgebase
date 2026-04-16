import NextAuth from 'next-auth';
import AzureAD from 'next-auth/providers/microsoft-entra-id';
import Credentials from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: 'openid profile email User.Read',
        },
      },
    }),
    // Local dev only — disabled in production
    ...(process.env.NODE_ENV !== 'production' ? [
      Credentials({
        id: 'local-admin',
        name: 'Local Admin',
        credentials: { password: { label: 'Dev Password', type: 'password' } },
        async authorize(credentials) {
          if (credentials?.password !== (process.env.LOCAL_ADMIN_PASSWORD || 'admin123')) return null;
          const db = getDb();
          const id = 'local-admin-00000000-0000-0000-0000-000000000000';
          const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
          if (!existing) {
            db.prepare(`INSERT INTO users (id, email, name, role, azure_id, last_login)
              VALUES (?, ?, ?, 'admin', 'local-dev', datetime('now'))`)
              .run(id, 'admin@local.dev', 'Local Admin');
          } else {
            db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(id);
          }
          return { id, email: 'admin@local.dev', name: 'Local Admin', role: 'admin' };
        },
      })
    ] : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      const db = getDb();
      const azureId = profile?.sub || account?.providerAccountId;

      let existing = db.prepare('SELECT * FROM users WHERE email = ?').get(user.email) as any;

      if (!existing) {
        const newId = uuidv4();
        db.prepare(`
          INSERT INTO users (id, email, name, image, role, azure_id, last_login)
          VALUES (?, ?, ?, ?, 'viewer', ?, datetime('now'))
        `).run(newId, user.email, user.name, user.image, azureId);
        existing = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
      } else {
        db.prepare(`UPDATE users SET last_login = datetime('now'), azure_id = ?, image = ? WHERE id = ?`)
          .run(azureId, user.image, existing.id);
      }

      // Log audit
      db.prepare(`INSERT INTO audit_log (id, user_id, action, resource_type, details) VALUES (?, ?, 'login', 'user', ?)`)
        .run(uuidv4(), existing.id, JSON.stringify({ email: user.email }));

      return true;
    },

    async jwt({ token, user, account }) {
      if (account && user?.email) {
        // For credentials provider, user object has role directly
        if (account.type === 'credentials') {
          token.userId = (user as any).id;
          token.role = (user as any).role;
        } else {
          const db = getDb();
          const dbUser = db.prepare('SELECT * FROM users WHERE email = ?').get(user.email) as any;
          if (dbUser) {
            token.userId = dbUser.id;
            token.role = dbUser.role;
          }
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
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
});
