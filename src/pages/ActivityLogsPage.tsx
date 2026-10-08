import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, RefreshCw } from 'lucide-react';
import { ActivityLog } from '../types';
import { apiFetch } from '../utils/api';
import { useWebSocket } from '../context/WebSocketContext';

export const ActivityLogsPage: React.FC = () => {
  const { addEventListener } = useWebSocket();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      let url = '/api/logs?limit=300&';
      if (severityFilter !== 'ALL') url += `severity=${severityFilter}&`;
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;
      const data = await apiFetch<{ logs: ActivityLog[] }>(url);
      setLogs(data.logs);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [severityFilter, search]);

  useEffect(() => {
    const unsub = addEventListener('log:new', () => {
      fetchLogs();
    });
    return unsub;
  }, [addEventListener]);

  const getSeverityStyle = (s: ActivityLog['severity']) => {
    switch (s) {
      case 'CRITICAL':
        return 'bg-rose-600 text-white font-bold';
      case 'ERROR':
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Activity Logs & Audit Trail</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Pencatatan riwayat event koneksi WhatsApp, pesan masuk/keluar, unduhan media, dan sistem.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className="text-xs text-zinc-500 font-medium">Severity:</span>
          {(['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                severityFilter === sev
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Cari dalam log..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1 bg-transparent text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-xs text-zinc-400">Memuat log aktivitas...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
          <FileText className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Belum Ada Log</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Aktivitas sistem dan pesan akan dicatat di sini secara otomatis.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800">
          {logs.map((log) => (
            <div key={log.id} className="p-3.5 flex items-start justify-between gap-4 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase shrink-0 ${getSeverityStyle(log.severity)}`}>
                  {log.severity}
                </span>

                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>{log.event}</span>
                    <span className="text-[10px] text-zinc-400 font-normal">[{log.source}]</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300 mt-0.5 break-words font-mono text-[11px]">
                    {log.details}
                  </p>
                </div>
              </div>

              <span className="text-[10px] text-zinc-400 whitespace-nowrap shrink-0">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
