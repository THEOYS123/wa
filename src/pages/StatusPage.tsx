import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Play,
  FileText,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Filter,
  Calendar,
} from 'lucide-react';
import { WhatsAppStatusItem } from '../types';
import { apiFetch } from '../utils/api';
import { useWebSocket } from '../context/WebSocketContext';
import { MediaModal } from '../components/MediaModal';

export const StatusPage: React.FC = () => {
  const { addEventListener } = useWebSocket();
  const [statuses, setStatuses] = useState<WhatsAppStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [previewMedia, setPreviewMedia] = useState<any | null>(null);

  const fetchStatuses = async () => {
    try {
      let url = '/api/statuses?';
      if (typeFilter !== 'all') url += `type=${typeFilter}&`;
      if (timeFilter !== 'all') url += `timeRange=${timeFilter}&`;
      const data = await apiFetch<{ statuses: WhatsAppStatusItem[] }>(url);
      setStatuses(data.statuses);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [typeFilter, timeFilter]);

  useEffect(() => {
    const unsub = addEventListener('status:new', () => {
      fetchStatuses();
    });
    return unsub;
  }, [addEventListener]);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus status ini dari server?')) return;
    try {
      await apiFetch(`/api/statuses/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setStatuses((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(`Gagal menghapus status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              WhatsApp Status (Stories) Downloader
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Seluruh status/cerita (foto, video, teks) yang dibagikan oleh kontak Anda otomatis diunduh dan disimpan sebelum 24 jam hilang.
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatuses}
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
          {(['all', 'photo', 'video', 'text'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {t === 'all' ? 'Semua' : t === 'photo' ? 'Foto' : t === 'video' ? 'Video' : 'Teks'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-500 font-medium">Waktu:</span>
          {(['all', 'today', 'yesterday', 'week'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setTimeFilter(w)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                timeFilter === w
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {w === 'all' ? 'Semua Waktu' : w === 'today' ? 'Hari Ini' : w === 'yesterday' ? 'Kemarin' : 'Minggu Ini'}
            </button>
          ))}
        </div>
      </div>

      {/* Status Items Grid */}
      {loading ? (
        <div className="text-center py-20 text-xs text-zinc-400">Memuat status tersimpan...</div>
      ) : statuses.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
          <Sparkles className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
            Belum Ada Status WhatsApp Tersimpan
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Ketika kontak WhatsApp Anda mengunggah status baru, bot akan otomatis menyimpannya ke server.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {statuses.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              {/* Media Thumbnail Container */}
              <div
                className="relative aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer group/thumb"
                onClick={() => {
                  if (item.mediaPath) {
                    setPreviewMedia({
                      id: item.id,
                      fileName: `Status_${item.senderName}`,
                      mediaType: item.mediaType,
                      caption: item.caption,
                    });
                  }
                }}
              >
                {item.mediaType === 'photo' && item.mediaPath && (
                  <img
                    src={`/api/media-file/${item.id}`}
                    alt="Status Photo"
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                )}

                {item.mediaType === 'video' && item.mediaPath && (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <video
                      src={`/api/media-file/${item.id}#t=0.001`}
                      preload="metadata"
                      muted
                      playsInline
                      className="w-full h-full object-cover opacity-90 group-hover/thumb:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white">
                      VIDEO
                    </div>
                  </div>
                )}

                {item.mediaType === 'text' && (
                  <div className="p-4 text-center text-xs text-white bg-gradient-to-tr from-emerald-800 to-teal-900 w-full h-full flex items-center justify-center font-medium">
                    "{item.caption}"
                  </div>
                )}

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white shadow-xs">
                  STATUS
                </div>
              </div>

              {/* Status Details */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-900 dark:text-white truncate">
                    {item.senderName}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">+{item.senderPhone}</span>
                </div>

                {item.caption && item.mediaType !== 'text' && (
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {item.caption}
                  </p>
                )}

                <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                  <span>Diunggah:</span>
                  <span>{new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2">
                  {item.mediaPath && (
                    <>
                      <button
                        onClick={() =>
                          setPreviewMedia({
                            id: item.id,
                            fileName: `Status_${item.senderName}`,
                            mediaType: item.mediaType,
                            caption: item.caption,
                          })
                        }
                        className="flex-1 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={`/api/media-file/${item.id}?download=true`}
                        download={`status_${item.senderPhone}`}
                        className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                        title="Download Status"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10"
                    title="Hapus Status dari Server"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Preview Modal */}
      <MediaModal
        isOpen={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        media={previewMedia}
      />
    </div>
  );
};
