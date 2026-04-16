import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { BookOpen, Shield, Search, FolderOpen } from 'lucide-react';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />

      <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left — branding */}
        <div className="text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
              <BookOpen size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">KnowledgeBase</p>
              <p className="text-sm text-slate-400">Team Wiki & Documentation</p>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold leading-tight mb-3">
              Your team's knowledge,<br />organized and searchable.
            </h1>
            <p className="text-slate-400 text-base leading-relaxed">
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
              <div key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                <div className="w-7 h-7 rounded-lg bg-blue-900/60 border border-blue-700/40 flex items-center justify-center text-blue-400 shrink-0">
                  {f.icon}
                </div>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right — login card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={24} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Sign in to KnowledgeBase</h2>
            <p className="text-sm text-gray-500 mt-1">Use your company Microsoft account</p>
          </div>

          <form
            action={async () => {
              'use server';
              await signIn('microsoft-entra-id', { redirectTo: '/dashboard' });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-gray-700 font-medium text-sm group"
            >
              {/* Microsoft logo */}
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
                <rect width="10" height="10" fill="#F25022" />
                <rect x="11" width="10" height="10" fill="#7FBA00" />
                <rect y="11" width="10" height="10" fill="#00A4EF" />
                <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
              </svg>
              Continue with Microsoft
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              By signing in you agree to your organization's policies.<br />
              Access is managed by your Azure AD administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
