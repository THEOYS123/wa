import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  EyeOff,
  Radio,
  FileText,
  CheckCheck,
} from 'lucide-react';
import { AppNotification } from '../types';
import { apiFetch } from '../utils/api';
import { useWebSocket } from '../context/WebSocketContext';

export const NotificationsPage: React.FC = () => {
  const { addEventListener } = useWebSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const data = await apiFetch<{ notifications: AppNotification[] }>('/api/notifications');
      setNotifications(data.notifications);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  useEffect(() => {
    const unsub = addEventListener('notification:new', () => {
      fetchNotifs();
    });
    return unsub;
  }, [addEventListener]);

  const markAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (_) {}
  };

  const clearAll = async () => {
    try {
      await apiFetch('/api/notifications', { method: 'DELETE' });
      setNotifications([]);
    } catch (_) {}
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'view_once_saved':
        return <EyeOff className="w-4 h-4 text-amber-500" />;
      case 'deleted_message':
        return <Trash2 className="w-4 h-4 text-rose-500" />;
      case 'wa_connected':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'wa_disconnected':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Notification Center</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Pemberitahuan aktivitas bot, pesan masuk, media sekali lihat, dan deteksi pesan ditarik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Tandai Semua Dibaca</span>
          </button>

          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Semua</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-xs text-zinc-400">Memuat notifikasi...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
          <Bell className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Tidak Ada Notifikasi Baru</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Notifikasi realtime akan muncul di sini setiap kali bot mendeteksi kejadian penting.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${
                item.isRead
                  ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-80'
                  : 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20'
              }`}
            >
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">{item.title}</h4>
                  <span className="text-[10px] text-zinc-400 whitespace-nowrap ml-2">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
