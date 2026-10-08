import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, MessageCircle, Shield } from 'lucide-react';
import { Group } from '../types';
import { apiFetch } from '../utils/api';

export const GroupsPage: React.FC<{ onOpenChat: (jid: string, name: string) => void }> = ({
  onOpenChat,
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchGroups = async () => {
    try {
      const data = await apiFetch<{ groups: Group[] }>('/api/groups');
      setGroups(data.groups);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filtered = groups.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return g.subject.toLowerCase().includes(q) || g.id.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Grup WhatsApp</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Daftar seluruh grup yang diikuti bot beserta jumlah anggota dan pesan yang tersimpan.
          </p>
        </div>

        <button
          onClick={fetchGroups}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2">
        <Search className="w-4 h-4 text-zinc-400 ml-2" />
        <input
          type="text"
          placeholder="Cari grup berdasarkan nama grup atau group ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1 bg-transparent text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-xs text-zinc-400">Memuat daftar grup...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
          <Users className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Belum Ada Grup Terdeteksi</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Grup yang diikuti oleh nomor bot akan otomatis muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((group) => (
            <div
              key={group.id}
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3 flex flex-col justify-between hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 font-bold text-base flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div className="truncate">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">{group.subject}</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {group.memberCount} Anggota
                  </p>
                </div>
              </div>

              {group.description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                  {group.description}
                </p>
              )}

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-zinc-400 truncate max-w-[150px]">ID: {group.id}</span>
                <button
                  onClick={() => onOpenChat(group.id, group.subject)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Buka Chat</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
