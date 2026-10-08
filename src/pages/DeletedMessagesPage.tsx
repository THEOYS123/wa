import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  Search,
  MessageSquare,
  Clock,
  User,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Eye,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { DeletedMessage } from '../types';
import { apiFetch } from '../utils/api';
import { useWebSocket } from '../context/WebSocketContext';
import { MediaModal } from '../components/MediaModal';

export const DeletedMessagesPage: React.FC<{ onNavigateToChat?: (chatId: string) => void }> = ({
  onNavigateToChat,
}) => {
  const { addEventListener } = useWebSocket();
  const [deletedList, setDeletedList] = useState<DeletedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [previewMedia, setPreviewMedia] = useState<any | null>(null);

  const fetchDeleted = async () => {
    try {
      const data = await apiFetch<{ deletedMessages: DeletedMessage[] }>('/api/deleted-messages');
      setDeletedList(data.deletedMessages);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
  }, []);

  useEffect(() => {
    const unsub = addEventListener('message:deleted', () => {
      fetchDeleted();
    });
    return unsub;
  }, [addEventListener]);

  const filtered = deletedList.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.originalText && item.originalText.toLowerCase().includes(q)) ||
      item.senderName.toLowerCase().includes(q) ||
      item.chatName.toLowerCase().includes(q) ||
      item.senderId.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/10 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/30">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Anti-Delete Message Vault
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">
                REVOKE INTERCEPTOR
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Pesan teks dan media yang telah dihapus atau ditarik oleh pengirim ("Delete for Everyone") tetap utuh dan tersimpan di server.
            </p>
          </div>
        </div>

        <button
          onClick={fetchDeleted}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2">
        <Search className="w-4 h-4 text-zinc-400 ml-2" />
        <input
          type="text"
          placeholder="Cari pesan yang dihapus berdasarkan isi teks, pengirim, atau obrolan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1 bg-transparent text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
        />
      </div>

      {/* List of Deleted Messages */}
      {loading ? (
        <div className="text-center py-20 text-xs text-zinc-400">Memuat arsip anti-delete...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
          <Trash2 className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
            Belum Ada Pesan Dihapus Terdeteksi
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Ketika pengirim menggunakan fitur "Tarik Pesan" / "Hapus untuk Semua Orang", pesan asli akan tetap terekam di sini beserta bukti waktu penghapusan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-rose-500/20 bg-white dark:bg-zinc-900 shadow-xs space-y-4 hover:border-rose-500/40 transition-colors"
            >
              {/* Alert Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>⚠️ Pesan Dihapus (Revoked)</span>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  DELETED
                </span>
              </div>

              {/* Message Details Grid */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Pengirim:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {item.senderName} ({item.senderId.split('@')[0]})
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-400">Obrolan / Grup:</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.chatName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-400">Waktu Dikirim:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {new Date(item.originalTimestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-zinc-400">Waktu Dihapus:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    {new Date(item.deletedTimestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Original Content Box */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Isi Asli Yang Berhasil Diamankan:
                </div>

                {item.originalText && (
                  <p className="text-xs text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed font-sans">
                    "{item.originalText}"
                  </p>
                )}

                {/* Media Attachment if present */}
                {item.mediaPath && (
                  <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                        {item.messageType === 'image' && <ImageIcon className="w-4 h-4 text-emerald-500" />}
                        {item.messageType === 'video' && <Video className="w-4 h-4 text-blue-500" />}
                        {item.messageType === 'audio' && <Music className="w-4 h-4 text-purple-500" />}
                        {!['image', 'video', 'audio'].includes(item.messageType) && (
                          <FileText className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="capitalize font-medium">Media Asli: {item.messageType}</span>
                      </div>

                      <button
                        onClick={() =>
                          setPreviewMedia({
                            id: item.messageId,
                            fileName: `Deleted_${item.messageType}`,
                            mediaType: item.messageType,
                            mimeType: item.mimeType,
                          })
                        }
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold hover:opacity-80"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Media</span>
                      </button>
                    </div>

                    {item.messageType === 'image' && (
                      <div
                        className="w-32 h-24 rounded-lg overflow-hidden bg-black/10 dark:bg-black/40 cursor-pointer"
                        onClick={() =>
                          setPreviewMedia({
                            id: item.messageId,
                            fileName: 'Deleted_Photo.jpg',
                            mediaType: 'photo',
                          })
                        }
                      >
                        <img
                          src={`/api/media-file/${item.messageId}`}
                          alt="Deleted Media"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                  </div>
                )}
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
