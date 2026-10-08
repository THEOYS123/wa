import React from 'react';
import { X, Download, FileText, Music, Film, Image as ImageIcon } from 'lucide-react';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: {
    id: string;
    fileName: string;
    mediaType: string;
    mimeType?: string;
    fileSize?: number;
    senderName?: string;
    caption?: string;
    isViewOnce?: boolean;
    createdAt?: string;
  } | null;
}

export const MediaModal: React.FC<MediaModalProps> = ({ isOpen, onClose, media }) => {
  if (!isOpen || !media) return null;

  const streamUrl = `/api/media-file/${media.id}`;
  const downloadUrl = `/api/media-file/${media.id}?download=true`;

  const isImage = media.mediaType === 'photo' || media.mimeType?.startsWith('image/');
  const isVideo = media.mediaType === 'video' || media.mimeType?.startsWith('video/');
  const isAudio = media.mediaType === 'audio' || media.mediaType === 'voice' || media.mimeType?.startsWith('audio/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-2xl bg-zinc-900 border border-zinc-800 text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3 truncate">
            {isImage && <ImageIcon className="w-5 h-5 text-emerald-400 shrink-0" />}
            {isVideo && <Film className="w-5 h-5 text-blue-400 shrink-0" />}
            {isAudio && <Music className="w-5 h-5 text-purple-400 shrink-0" />}
            {!isImage && !isVideo && !isAudio && <FileText className="w-5 h-5 text-amber-400 shrink-0" />}

            <div className="truncate">
              <h3 className="font-semibold text-sm truncate">{media.fileName}</h3>
              <p className="text-[11px] text-zinc-400">
                {media.senderName && `Dari: ${media.senderName} • `}
                {media.fileSize ? `${(media.fileSize / 1024).toFixed(1)} KB` : ''}
                {media.isViewOnce && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    VIEW ONCE SAVED
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={media.fileName}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Preview Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50 min-h-[300px]">
          {isImage && (
            <img
              src={streamUrl}
              alt={media.fileName}
              className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-lg"
            />
          )}

          {isVideo && (
            <div className="w-full flex items-center justify-center">
              <video
                src={streamUrl}
                controls
                autoPlay
                playsInline
                preload="auto"
                className="max-h-[65vh] max-w-full rounded-lg shadow-lg bg-black"
              />
            </div>
          )}

          {isAudio && (
            <div className="flex flex-col items-center gap-4 w-full max-w-md p-6 bg-zinc-800/80 rounded-xl">
              <Music className="w-12 h-12 text-purple-400" />
              <audio src={streamUrl} controls autoPlay className="w-full" />
              <div className="text-xs text-zinc-400">{media.fileName}</div>
            </div>
          )}

          {!isImage && !isVideo && !isAudio && (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <FileText className="w-16 h-16 text-zinc-500" />
              <div className="font-medium text-sm">{media.fileName}</div>
              <p className="text-xs text-zinc-400 max-w-sm">
                File dokumen ini siap diunduh dan dibuka dengan aplikasi eksternal.
              </p>
              <a
                href={downloadUrl}
                download={media.fileName}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              >
                <Download className="w-4 h-4" /> Download File Sekarang
              </a>
            </div>
          )}
        </div>

        {/* Caption bar if present */}
        {media.caption && (
          <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/40 text-xs text-zinc-300">
            <span className="font-semibold text-zinc-400">Caption: </span>
            {media.caption}
          </div>
        )}
      </div>
    </div>
  );
};
