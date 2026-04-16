import { auth, signIn } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BookOpen, Shield, Search, FolderOpen } from 'lucide-react';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  const isLocalDev = process.env.NODE_ENV !== 'production';

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c1a3a 100%)' }}>
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />

      <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left — branding */}
        <div className="text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
              <BookOpen size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">KnowledgeBase</p>
              <p className="text-sm" style={{ color: '#94a3b8' }}>Team Wiki & Documentation</p>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold leading-tight mb-3">
              Your team's knowledge,<br />organized and searchable.
            </h1>
            <p className="text-base leading-relaxed" style={{ color: '#94a3b8' }}>
              A centralized hub for documents, guides, and processes — with granular
              permissions and full-text search.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: <FolderOpen size={16} />, text: 'Documents organized by category' },
              { icon: <Shield size={16} />, text: 'Granular role & category permissions' },
              { icon: <Search size={16} />, text: 'Full-text search across all content' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm" style={{ color: '#cbd5e1' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.3)', border: '1px solid rgba(37,99,235,0.4)', color: '#93c5fd' }}>
                  {f.icon}
                </div>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right — login card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#eff6ff' }}>
              <BookOpen size={24} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Sign in to KnowledgeBase</h2>
            <p className="text-sm text-gray-500 mt-1">Choose your login method below</p>
          </div>

          {/* Microsoft SSO */}
          <form action={async () => {
            'use server';
            await signIn('microsoft-entra-id', { redirectTo: '/dashboard' });
          }}>
            <button type="submit" className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-700 font-medium text-sm mb-4">
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
                <rect width="10" height="10" fill="#F25022" />
                <rect x="11" width="10" height="10" fill="#7FBA00" />
                <rect y="11" width="10" height="10" fill="#00A4EF" />
                <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
              </svg>
              Continue with Microsoft
            </button>
          </form>

          {/* Local Dev Login */}
          {isLocalDev && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">DEV ONLY</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <form action={async (formData: FormData) => {
                'use server';
                await signIn('local-admin', {
                  password: formData.get('password'),
                  redirectTo: '/dashboard',
                });
              }}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#fef9c3', color: '#854d0e' }}>
                    <span>⚠️</span> Local admin — no SSO required
                  </div>
                  <input
                    name="password"
                    type="password"
                    placeholder="Dev password (default: admin123)"
                    defaultValue="admin123"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="submit" className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-colors" style={{ background: '#1e293b' }}>
                    Sign in as Local Admin
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Access is managed by your Azure AD administrator.<br/>
              {isLocalDev && <span className="text-amber-500">Dev login is disabled in production.</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
