import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video,
  Play,
  Music,
  FileText,
  Smile,
  Download,
  Trash2,
  Search,
  Filter,
  Eye,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';
import { MediaItem } from '../types';
import { apiFetch } from '../utils/api';
import { MediaModal } from '../components/MediaModal';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const MediaPage: React.FC = () => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    ids: string[];
    isBulk: boolean;
  }>({ isOpen: false, ids: [], isBulk: false });

  const fetchMedia = async () => {
    try {
      let url = '/api/media?';
      if (category !== 'all') url += `type=${category}&`;
      const data = await apiFetch<{ media: MediaItem[] }>(url);
      setMediaList(data.media);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [category]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m.id)));
    }
  };

  const executeDelete = async (ids: string[]) => {
    try {
      if (ids.length === 1) {
        await apiFetch(`/api/media/${ids[0]}`, { method: 'DELETE' });
      } else {
        await apiFetch('/api/media/bulk-delete', {
          method: 'POST',
          body: JSON.stringify({ ids }),
        });
      }
      setSelectedIds(new Set());
      fetchMedia();
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  const filtered = mediaList.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.fileName.toLowerCase().includes(q) ||
      (item.senderName && item.senderName.toLowerCase().includes(q)) ||
      (item.chatName && item.chatName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Media Center & File Vault</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manajemen seluruh file multimedia (foto, video, VN, dokumen, stiker) yang tersimpan otomatis dari seluruh obrolan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() =>
                setConfirmDelete({
                  isOpen: true,
                  ids: Array.from(selectedIds),
                  isBulk: true,
                })
              }
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus ({selectedIds.size}) Terpilih</span>
            </button>
          )}

          <button
            onClick={fetchMedia}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Categories & Search Bar */}
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'all', label: 'Semua Media' },
            { id: 'photo', label: 'Foto', icon: ImageIcon },
            { id: 'video', label: 'Video', icon: Video },
            { id: 'audio', label: 'Audio / Voice', icon: Music },
            { id: 'document', label: 'Dokumen', icon: FileText },
            { id: 'sticker', label: 'Stiker', icon: Smile },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
                category === cat.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {cat.icon && <cat.icon className="w-3.5 h-3.5" />}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari file berdasarkan nama, pengirim, atau grup..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
            />
          </div>

          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium"
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-emerald-500" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>Pilih Semua</span>
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="text-center py-20 text-xs text-zinc-400">Memuat media vault...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
          <ImageIcon className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Belum Ada Media Tersimpan</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Media yang dikirim atau diterima melalui obrolan WhatsApp akan otomatis terkumpul di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isPhoto = item.mediaType === 'photo' || item.mimeType?.startsWith('image/');
            const isVideo = item.mediaType === 'video' || item.mimeType?.startsWith('video/');

            return (
              <div
                key={item.id}
                className={`group relative rounded-xl border overflow-hidden bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                {/* Media Preview Box */}
                <div
                  className="relative aspect-square bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center overflow-hidden cursor-pointer group/thumb"
                  onClick={() => setPreviewMedia(item)}
                >
                  {isPhoto && item.mediaType !== 'sticker' && (
                    <img
                      src={`/api/media-file/${item.id}`}
                      alt={item.fileName}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}

                  {item.mediaType === 'sticker' && (
                    <div className="w-full h-full p-2 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50">
                      <img
                        src={`/api/media-file/${item.id}`}
                        alt="Sticker"
                        className="max-h-full max-w-full object-contain group-hover/thumb:scale-110 transition-transform"
                      />
                    </div>
                  )}

                  {isVideo && (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      <video
                        src={`/api/media-file/${item.id}#t=0.001`}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-85 group-hover/thumb:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md group-hover/thumb:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {!isPhoto && !isVideo && item.mediaType !== 'sticker' && (
                    <div className="flex flex-col items-center gap-1 text-zinc-400 p-2 text-center">
                      {item.mediaType === 'audio' || item.mediaType === 'voice' ? (
                        <Music className="w-8 h-8 text-purple-400" />
                      ) : (
                        <FileText className="w-8 h-8 text-amber-400" />
                      )}
                      <span className="text-[10px] font-mono truncate max-w-[80px]">{item.fileName}</span>
                    </div>
                  )}

                  {/* Selection Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                    className="absolute top-2 left-2 p-1 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                  </button>
                </div>

                {/* Footer Info */}
                <div className="p-2 space-y-1 text-[11px]">
                  <div className="font-medium text-zinc-900 dark:text-white truncate" title={item.fileName}>
                    {item.fileName}
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>{(item.fileSize / 1024).toFixed(0)} KB</span>
                    <span>{new Date(item.createdAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => setPreviewMedia(item)}
                      className="text-zinc-500 hover:text-emerald-500 p-1"
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={`/api/media-file/${item.id}?download=true`}
                      download={item.fileName}
                      className="text-zinc-500 hover:text-emerald-500 p-1"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() =>
                        setConfirmDelete({
                          isOpen: true,
                          ids: [item.id],
                          isBulk: false,
                        })
                      }
                      className="text-zinc-400 hover:text-rose-500 p-1"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        title="Hapus Media dari Server"
        message={`Apakah Anda yakin ingin menghapus ${confirmDelete.ids.length} file media ini secara permanen dari server?`}
        confirmLabel="Hapus Permanen"
        isDangerous={true}
        onConfirm={async () => {
          const ids = confirmDelete.ids;
          setConfirmDelete({ isOpen: false, ids: [], isBulk: false });
          await executeDelete(ids);
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, ids: [], isBulk: false })}
      />
    </div>
  );
};
