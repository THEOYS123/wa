import React, { useState, useEffect } from 'react';
import {
  Menu,
  Moon,
  Sun,
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
  LogOut,
  User,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useTheme } from '../context/ThemeContext';
import { AppNotification } from '../types';
import { apiFetch } from '../utils/api';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigate: (tab: string) => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigate, activeTab }) => {
  const { user, logout } = useAuth();
  const { session, isConnected } = useWebSocket();
  const { theme, toggleTheme } = useTheme();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch<{ notifications: AppNotification[] }>('/api/notifications?unread=true');
      setNotifications(data.notifications.slice(0, 5));
      setUnreadCount(data.notifications.length);
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    const st = session?.status;
    if (st === 'connected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">WhatsApp</span> Terhubung
        </span>
      );
    }
    if (st === 'connecting' || st === 'qr_ready') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="hidden sm:inline">WhatsApp</span> Menghubungkan
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        <span className="hidden sm:inline">WhatsApp</span> Terputus
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-4 sm:px-6 backdrop-blur-md transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-sm shadow-emerald-500/30">
            WA
          </div>
          <span className="font-semibold text-zinc-900 dark:text-white tracking-tight hidden sm:inline">
            WhatsApp Bot Monitor
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* WhatsApp Connection Status Badge */}
        <button
          onClick={() => onNavigate('connection')}
          className="cursor-pointer transition-opacity hover:opacity-85"
          title="Klik untuk buka WhatsApp Connection"
        >
          {getStatusBadge()}
        </button>

        {/* Realtime WebSocket indicator */}
        <div
          className={`hidden md:flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
            isConnected
              ? 'text-zinc-500 dark:text-zinc-400'
              : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
          }`}
          title={isConnected ? 'Live WebSocket Connected' : 'Reconnecting WebSocket...'}
        >
          <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-500' : 'text-amber-500 animate-spin'}`} />
          <span>{isConnected ? 'Realtime' : 'Reconnecting'}</span>
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none transition-colors"
          title={`Ganti ke mode ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
        </button>

        {/* Notifications Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none transition-colors"
            title="Pusat Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-xl z-50">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="font-semibold text-sm text-zinc-900 dark:text-white">
                  Notifikasi ({unreadCount})
                </span>
                <button
                  onClick={() => {
                    setShowNotifMenu(false);
                    onNavigate('notifications');
                  }}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-xs py-4 text-zinc-400">Tidak ada notifikasi baru</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs"
                    >
                      <div className="font-medium text-zinc-900 dark:text-white flex items-center justify-between">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-300 mt-1 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 font-medium text-xs">
              {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="hidden xl:block text-left text-xs">
              <div className="font-medium text-zinc-900 dark:text-white leading-tight">{user?.username}</div>
              <div className="text-[10px] text-zinc-500 capitalize">{user?.role || 'Admin'}</div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 focus:outline-none transition-colors"
            title="Keluar / Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
