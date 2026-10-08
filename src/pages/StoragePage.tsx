import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Trash2,
  Image,
  Video,
  Music,
  FileText,
  EyeOff,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const StoragePage: React.FC = () => {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const [confirmCleanup, setConfirmCleanup] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await apiFetch<{ stats: any }>('/api/storage/stats');
      setStats(data.stats);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCleanup = async () => {
    try {
      const res = await apiFetch<{ deletedCount: number; freedBytes: number }>('/api/storage/cleanup', {
        method: 'POST',
        body: JSON.stringify({ days: retentionDays }),
      });
      setCleanupResult(
        `Berhasil membersihkan ${res.deletedCount} file lama, membebaskan ${(res.freedBytes / (1024 * 1024)).toFixed(2)} MB ruang.`
      );
      fetchStats();
    } catch (err: any) {
      alert(`Pembersihan gagal: ${err.message}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading || !stats) {
    return <div className="text-center py-20 text-xs text-zinc-400">Memuat analisis penyimpanan...</div>;
  }

  const usedPercentage = Math.min(100, Math.round((stats.usedBytes / (stats.totalBytes || 1)) * 100));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Storage Management</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Kelola penggunaan media, kuota disk lokal server, dan konfigurasi retensi pembersihan otomatis.
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {cleanupResult && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          {cleanupResult}
        </div>
      )}

      {/* Main Storage Gauge Card */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">Kapasitas Penyimpanan Server</h3>
              <p className="text-xs text-zinc-400">Direktori fisik: data/media/</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{usedPercentage}%</span>
            <div className="text-[11px] text-zinc-400">Terpakai</div>
          </div>
        </div>

        <div>
          <div className="h-4 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${usedPercentage}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-500 font-medium">
            <span>Terpakai: {formatBytes(stats.usedBytes)}</span>
            <span>Tersedia: {formatBytes(stats.freeBytes)}</span>
            <span>Batas Kuota: {formatBytes(stats.totalBytes)}</span>
          </div>
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
              <Image className="w-3.5 h-3.5" />
              <span className="font-semibold">Foto</span>
            </div>
            <div className="font-bold text-sm text-zinc-900 dark:text-white">
              {formatBytes(stats.photosBytes)}
            </div>
            <div className="text-[10px] text-zinc-400">{stats.counts?.photos || 0} file</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs">
            <div className="flex items-center gap-1.5 text-blue-500 mb-1">
              <Video className="w-3.5 h-3.5" />
              <span className="font-semibold">Video</span>
            </div>
            <div className="font-bold text-sm text-zinc-900 dark:text-white">
              {formatBytes(stats.videosBytes)}
            </div>
            <div className="text-[10px] text-zinc-400">{stats.counts?.videos || 0} file</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs">
            <div className="flex items-center gap-1.5 text-purple-500 mb-1">
              <Music className="w-3.5 h-3.5" />
              <span className="font-semibold">Audio</span>
            </div>
            <div className="font-bold text-sm text-zinc-900 dark:text-white">{formatBytes(stats.audioBytes)}</div>
            <div className="text-[10px] text-zinc-400">{stats.counts?.audio || 0} file</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs">
            <div className="flex items-center gap-1.5 text-amber-500 mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span className="font-semibold">Dokumen</span>
            </div>
            <div className="font-bold text-sm text-zinc-900 dark:text-white">
              {formatBytes(stats.documentsBytes)}
            </div>
            <div className="text-[10px] text-zinc-400">{stats.counts?.documents || 0} file</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs">
            <div className="flex items-center gap-1.5 text-amber-600 mb-1">
              <EyeOff className="w-3.5 h-3.5" />
              <span className="font-semibold">View Once</span>
            </div>
            <div className="font-bold text-sm text-zinc-900 dark:text-white">
              {formatBytes(stats.viewOnceBytes)}
            </div>
            <div className="text-[10px] text-zinc-400">{stats.counts?.view_once || 0} file</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs">
            <div className="flex items-center gap-1.5 text-teal-500 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-semibold">Status Stories</span>
            </div>
            <div className="font-bold text-sm text-zinc-900 dark:text-white">
              {formatBytes(stats.statusBytes)}
            </div>
            <div className="text-[10px] text-zinc-400">{stats.counts?.status || 0} file</div>
          </div>
        </div>
      </div>

      {/* Retention & Cleanup Configuration */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-5">
        <div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white">Kebijakan Retensi & Pembersihan Media</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Pilih jangka waktu penyimpanan file media sebelum dapat dibersihkan untuk menghemat ruang disk server.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            { days: 0, label: 'Simpan Selamanya (Tanpa Batas)' },
            { days: 7, label: 'Hapus &gt; 7 Hari' },
            { days: 30, label: 'Hapus &gt; 30 Hari' },
            { days: 90, label: 'Hapus &gt; 90 Hari' },
          ].map((opt) => (
            <button
              key={opt.days}
              onClick={() => setRetentionDays(opt.days)}
              className={`p-3.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                retentionDays === opt.days
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {retentionDays > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                Pembersihan manual akan mencari dan menghapus file media fisik yang lebih lama dari {retentionDays} hari.
              </span>
            </div>

            <button
              onClick={() => setConfirmCleanup(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs shrink-0 cursor-pointer"
            >
              Jalankan Pembersihan Sekarang
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmCleanup}
        title="Konfirmasi Pembersihan Media"
        message={`Apakah Anda yakin ingin menghapus file media yang berumur lebih dari ${retentionDays} hari? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Bersihkan File Lama"
        isDangerous={true}
        onConfirm={async () => {
          setConfirmCleanup(false);
          await handleCleanup();
        }}
        onCancel={() => setConfirmCleanup(false)}
      />
    </div>
  );
};
