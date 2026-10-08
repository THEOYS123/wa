import React, { useState, useEffect } from 'react';
import {
  EyeOff,
  Image,
  Video,
  Play,
  Music,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Download,
  Filter,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { MediaItem } from '../types';
import { apiFetch } from '../utils/api';
import { useWebSocket } from '../context/WebSocketContext';
import { MediaModal } from '../components/MediaModal';

export const ViewOncePage: React.FC = () => {
  const { addEventListener } = useWebSocket();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);

  const fetchViewOnce = async () => {
    try {
      let url = '/api/view-once?';
      if (typeFilter !== 'all') url += `type=${typeFilter}&`;
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;
      const data = await apiFetch<{ items: MediaItem[] }>(url);
      setItems(data.items);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViewOnce();
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    const unsub = addEventListener('view_once:saved', () => {
      fetchViewOnce();
    });
    return unsub;
  }, [addEventListener]);

  const getStatusBadge = (status: MediaItem['downloadStatus']) => {
    switch (status) {
      case 'SAVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>SAVED</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>PROCESSING</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/10 text-zinc-500">
            UNSUPPORTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/10 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
            <EyeOff className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                View Once Vault (Sekali Lihat)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-black">
                AUTO-RECOVERY
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Sistem secara instan menangkap dan mengunduh buffer media "Sekali Lihat" begitu event pesan diterima dari server WhatsApp.
            </p>
          </div>
        </div>

        <button
          onClick={fetchViewOnce}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-500 font-medium">Tipe:</span>
          {(['all', 'photo', 'video', 'audio'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {t === 'all' ? 'Semua' : t === 'photo' ? 'Foto' : t === 'video' ? 'Video' : 'Audio / VN'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 font-medium">Status:</span>
          {(['all', 'SAVED', 'FAILED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {s === 'all' ? 'Semua' : s === 'SAVED' ? 'Tersimpan (SAVED)' : 'Gagal (FAILED)'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of View Once Items */}
      {loading ? (
        <div className="text-center py-20 text-xs text-zinc-400">Memuat brankas View Once...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
          <EyeOff className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
            Belum Ada Media Sekali Lihat
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Ketika ada kontak yang mengirimkan foto/video "View Once" (1x), bot akan otomatis menyimpannya ke sini sebelum media kedaluwarsa.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const isPhoto = item.mediaType === 'photo' || item.mimeType?.startsWith('image/');
            const isVideo = item.mediaType === 'video' || item.mimeType?.startsWith('video/');

            return (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs hover:border-amber-500/40 transition-all flex flex-col justify-between"
              >
                {/* Media Thumbnail Container */}
                <div
                  className="relative aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer group/thumb"
                  onClick={() => {
                    if (item.downloadStatus === 'SAVED') {
                      setPreviewMedia(item);
                    }
                  }}
                >
                  {item.downloadStatus === 'SAVED' && isPhoto && (
                    <img
                      src={`/api/media-file/${item.id}`}
                      alt={item.fileName}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}

                  {item.downloadStatus === 'SAVED' && isVideo && (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      <video
                        src={`/api/media-file/${item.id}#t=0.001`}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-90 group-hover/thumb:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                          <Play className="w-6 h-6 fill-black ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white">
                        VIDEO
                      </div>
                    </div>
                  )}

                  {item.downloadStatus === 'SAVED' && !isPhoto && !isVideo && (
                    <div className="flex flex-col items-center gap-2 text-zinc-400 p-4">
                      <Music className="w-10 h-10 text-purple-400" />
                      <span className="text-[10px] font-medium">Audio Sekali Dengar</span>
                    </div>
                  )}

                  {item.downloadStatus !== 'SAVED' && (
                    <div className="flex flex-col items-center gap-1.5 p-4 text-center">
                      <ShieldAlert className="w-8 h-8 text-rose-500" />
                      <span className="text-[10px] text-zinc-400">{item.errorMessage || 'Unduhan gagal'}</span>
                    </div>
                  )}

                  {/* Top Badge Overlay */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-black shadow-xs">
                      VIEW ONCE — SAVED
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 pointer-events-none">
                    {getStatusBadge(item.downloadStatus)}
                  </div>
                </div>

                {/* Info Container */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white truncate">
                      {item.senderName || 'Pengirim'}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {item.fileSize ? `${(item.fileSize / 1024).toFixed(1)} KB` : ''}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    Obrolan: {item.chatName || item.chatId}
                  </p>

                  <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                    <span>Diterima:</span>
                    <span>{new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>

                  {/* Actions */}
                  {item.downloadStatus === 'SAVED' && (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => setPreviewMedia(item)}
                        className="flex-1 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={`/api/media-file/${item.id}?download=true`}
                        download={item.fileName}
                        className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <MediaModal
        isOpen={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        media={previewMedia}
      />
    </div>
  );
};
