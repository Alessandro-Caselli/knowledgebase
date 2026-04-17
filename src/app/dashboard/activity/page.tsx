'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  FilePlus, FileEdit, Trash2, LogIn, MessageSquare, Shield,
  Activity, RefreshCw, User,
} from 'lucide-react';
import Link from 'next/link';

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  create:   { icon: <FilePlus size={14} />,      label: 'ha creato',    color: 'bg-green-100 text-green-700' },
  update:   { icon: <FileEdit size={14} />,      label: 'ha modificato',color: 'bg-blue-100 text-blue-700' },
  delete:   { icon: <Trash2 size={14} />,        label: 'ha eliminato', color: 'bg-red-100 text-red-700' },
  comment:  { icon: <MessageSquare size={14} />, label: 'ha commentato',color: 'bg-purple-100 text-purple-700' },
  login:    { icon: <LogIn size={14} />,         label: 'ha effettuato il login', color: 'bg-gray-100 text-gray-600' },
  permission_grant: { icon: <Shield size={14} />, label: 'ha concesso permessi', color: 'bg-yellow-100 text-yellow-700' },
  permission_revoke:{ icon: <Shield size={14} />, label: 'ha revocato permessi',  color: 'bg-orange-100 text-orange-700' },
};

function ActionBadge({ action }: { action: string }) {
  const config = ACTION_CONFIG[action] || {
    icon: <Activity size={14} />, label: action, color: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

export default function ActivityPage() {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch('/api/activity?limit=50');
      const data = await res.json();
      setActivities(data.activities || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
          <p className="text-sm text-gray-500 mt-1">Ultime attività nelle tue categorie</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Aggiorna
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Activity size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nessuna attività trovata</p>
          <p className="text-sm mt-1">Le attività appariranno qui man mano che i documenti vengono creati e modificati.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

          <div className="flex flex-col gap-1">
            {activities.map((activity, idx) => {
              const isDoc = activity.resource_type === 'document';
              const docTitle = activity.document_title || activity.details?.title || 'documento';

              return (
                <div key={activity.id} className="relative flex gap-4 pl-10 py-3 group">
                  {/* Timeline dot */}
                  <div className={`absolute left-2 top-5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center z-10 ${
                    ACTION_CONFIG[activity.action]?.color?.split(' ')[0] || 'bg-gray-200'
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                  </div>

                  <div className="flex-1 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm hover:border-gray-200 transition-colors animate-fade-in">
                    <div className="flex items-start gap-2 flex-wrap">
                      {/* User avatar */}
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">
                        {(activity.user_name || activity.user_email || 'U')[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-gray-900">{activity.user_name || activity.user_email || 'Utente'}</span>
                          <ActionBadge action={activity.action} />
                          {isDoc && (
                            <>
                              <span className="text-gray-400">il documento</span>
                              {activity.resource_id && activity.action !== 'delete' ? (
                                <Link
                                  href={`/dashboard/documents/${activity.resource_id}`}
                                  className="font-medium text-blue-600 hover:underline truncate max-w-xs"
                                >
                                  {docTitle}
                                </Link>
                              ) : (
                                <span className="font-medium text-gray-700 truncate max-w-xs">{docTitle}</span>
                              )}
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(activity.created_at + 'Z'), { addSuffix: true, locale: it })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
