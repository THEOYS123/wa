import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  EyeOff,
  Trash2,
  HardDrive,
  Image,
  Video,
  Music,
  FileText,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Radio,
  Zap,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useWebSocket } from '../context/WebSocketContext';
import { ActivityLog } from '../types';

interface DashboardStats {
  session: any;
  totalChats: number;
  totalMessages: number;
  messagesToday: number;
  deletedMessagesCount: number;
  savedPhotos: number;
  savedVideos: number;
  savedAudio: number;
  savedDocuments: number;
  savedViewOnce: number;
  savedStatus: number;
  storage: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    photosBytes: number;
    videosBytes: number;
    audioBytes: number;
    documentsBytes: number;
    viewOnceBytes: number;
    statusBytes: number;
  };
  uptime: string;
}

export const DashboardPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { isConnected, addEventListener } = useWebSocket();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await apiFetch<DashboardStats>('/api/dashboard/stats');
      setStats(data);
      const logsData = await apiFetch<{ logs: ActivityLog[] }>('/api/logs?limit=8');
      setLogs(logsData.logs);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Listen to realtime events
    const unsubMsg = addEventListener('message:new', () => fetchStats());
    const unsubDel = addEventListener('message:deleted', () => fetchStats());
    const unsubVo = addEventListener('view_once:saved', () => fetchStats());
    const unsubConn = addEventListener('connection:update', () => fetchStats());

    const timer = setInterval(fetchStats, 15000);
    return () => {
      unsubMsg();
      unsubDel();
      unsubVo();
      unsubConn();
      clearInterval(timer);
    };
  }, [addEventListener]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-zinc-500">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
          <span>Memuat metrik dashboard...</span>
        </div>
      </div>
    );
  }

  const isWaConnected = stats.session?.status === 'connected';
  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const usedPercentage = Math.min(
    100,
    Math.round((stats.storage.usedBytes / (stats.storage.totalBytes || 1)) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Top Welcome / Status Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isWaConnected
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}
          >
            {isWaConnected ? <CheckCircle2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {isWaConnected ? 'WhatsApp Bot Aktif & Memantau' : 'WhatsApp Belum Terhubung'}
              </h2>
              <span className="flex h-2 w-2 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isWaConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isWaConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {isWaConnected
                ? `Akun: ${stats.session.accountName || stats.session.phoneNumber} • Uptime: ${stats.uptime}`
                : 'Scan QR Code atau gunakan Pairing Code untuk memulai auto-save realtime.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('connection')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all cursor-pointer ${
              isWaConnected
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{isWaConnected ? 'Kelola Koneksi' : 'Sambungkan WhatsApp'}</span>
          </button>

          <button
            onClick={() => onNavigate('diagnostics')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Uji Diagnostik</span>
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Messages */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Total Pesan</span>
            <MessageSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {stats.totalMessages.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            +{stats.messagesToday} pesan hari ini
          </div>
        </div>

        {/* View Once Captured */}
        <div
          onClick={() => onNavigate('view_once')}
          className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-semibold">View Once Captured</span>
            <EyeOff className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {stats.savedViewOnce}
          </div>
          <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
            <span>Buka Brankas View Once</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* Deleted Messages Archive */}
        <div
          onClick={() => onNavigate('deleted_messages')}
          className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-xs font-semibold">Anti-Delete Archive</span>
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {stats.deletedMessagesCount}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
            <span>Lihat Pesan Dihapus</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* Total Chats */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Total Percakapan</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{stats.totalChats}</div>
          <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">Grup & Pribadi Dipantau</div>
        </div>
      </div>

      {/* Media & Storage Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Media Distribution */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">
              Distribusi Media Tersimpan Otomatis
            </h3>
            <button
              onClick={() => onNavigate('media')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Buka Media Center</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <Image className="w-4 h-4" />
                <span className="text-xs font-medium">Foto</span>
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.savedPhotos}</div>
              <div className="text-[10px] text-zinc-400">{formatBytes(stats.storage.photosBytes)}</div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <Video className="w-4 h-4" />
                <span className="text-xs font-medium">Video</span>
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.savedVideos}</div>
              <div className="text-[10px] text-zinc-400">{formatBytes(stats.storage.videosBytes)}</div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                <Music className="w-4 h-4" />
                <span className="text-xs font-medium">Audio / VN</span>
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.savedAudio}</div>
              <div className="text-[10px] text-zinc-400">{formatBytes(stats.storage.audioBytes)}</div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-medium">Dokumen</span>
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.savedDocuments}</div>
              <div className="text-[10px] text-zinc-400">{formatBytes(stats.storage.documentsBytes)}</div>
            </div>
          </div>

          {/* WhatsApp Stories Summary */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-zinc-900 dark:text-zinc-200">
                Status / Cerita WhatsApp Tersimpan:
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.savedStatus} status</span>
            </div>
            <button
              onClick={() => onNavigate('status')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Lihat Status
            </button>
          </div>
        </div>

        {/* Storage Bar Card */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-zinc-500" />
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">Penyimpanan Server</h3>
              </div>
              <span className="text-xs font-semibold text-zinc-500">{usedPercentage}% Digunakan</span>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 font-medium">
                <span>{formatBytes(stats.storage.usedBytes)} terpakai</span>
                <span>{formatBytes(stats.storage.totalBytes)} kuota</span>
              </div>
              <div className="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${usedPercentage}%` }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Foto & Stiker</span>
                <span className="font-medium">{formatBytes(stats.storage.photosBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Video</span>
                <span className="font-medium">{formatBytes(stats.storage.videosBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span>View Once Vault</span>
                <span className="font-medium text-amber-500">{formatBytes(stats.storage.viewOnceBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Dokumen & Lainnya</span>
                <span className="font-medium">{formatBytes(stats.storage.documentsBytes)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('storage')}
            className="w-full mt-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-colors"
          >
            Kelola Retensi & Pembersihan
          </button>
        </div>
      </div>

      {/* Live Activity Logs Preview */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">Aktivitas Realtime Terkini</h3>
          </div>
          <button
            onClick={() => onNavigate('logs')}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            Lihat Semua Log
          </button>
        </div>

        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-center py-6 text-xs text-zinc-400">Belum ada aktivitas tercatat.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      log.severity === 'CRITICAL'
                        ? 'bg-rose-500 text-white'
                        : log.severity === 'ERROR'
                        ? 'bg-rose-500/10 text-rose-500'
                        : log.severity === 'WARNING'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {log.severity}
                  </span>
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-white">{log.event}</span>
                    <span className="text-zinc-500 dark:text-zinc-400 ml-2">{log.details}</span>
                  </div>
                </div>

                <span className="text-[10px] text-zinc-400 whitespace-nowrap ml-4">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
