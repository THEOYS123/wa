import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquare,
  Users,
  Archive,
  ArchiveRestore,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  Trash2,
  EyeOff,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  X,
  Reply,
  MoreVertical,
  Download,
  AlertTriangle,
  Smile,
} from 'lucide-react';
import { Chat, Message, MediaItem } from '../types';
import { apiFetch } from '../utils/api';
import { useWebSocket } from '../context/WebSocketContext';
import { MediaModal } from '../components/MediaModal';

export const ChatsPage: React.FC = () => {
  const { addEventListener } = useWebSocket();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<'all' | 'personal' | 'groups' | 'archived' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Message sending state
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Attachment upload modal/state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileCaption, setFileCaption] = useState('');
  const [fileType, setFileType] = useState<'image' | 'video' | 'audio' | 'document'>('image');

  // Preview modal
  const [previewMedia, setPreviewMedia] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchChats = async () => {
    try {
      const data = await apiFetch<{ chats: Chat[] }>(`/api/chats?filter=${filter}`);
      setChats(data.chats);
    } catch (_) {}
    finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const data = await apiFetch<{ messages: Message[] }>(`/api/messages?chatId=${encodeURIComponent(chatId)}&limit=200`);
      setMessages(data.messages);
    } catch (_) {}
    finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [filter]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  // Realtime listeners
  useEffect(() => {
    const unsubMsg = addEventListener('message:new', (newMsg: Message) => {
      fetchChats();
      if (selectedChat && newMsg.chatId === selectedChat.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    });

    const unsubDel = addEventListener('message:deleted', (delPayload: any) => {
      fetchChats();
      if (selectedChat && delPayload.chatId === selectedChat.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === delPayload.messageId ? { ...m, isDeleted: true, deletedAt: delPayload.deletedTimestamp } : m))
        );
      }
    });

    return () => {
      unsubMsg();
      unsubDel();
    };
  }, [selectedChat, addEventListener]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChat || sending) return;

    setSending(true);
    try {
      await apiFetch('/api/messages/send-text', {
        method: 'POST',
        body: JSON.stringify({
          chatId: selectedChat.id,
          text: inputText.trim(),
          quotedMessageId: replyingTo?.id,
        }),
      });
      setInputText('');
      setReplyingTo(null);
    } catch (err: any) {
      alert(`Gagal mengirim pesan: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) setFileType('image');
    else if (file.type.startsWith('video/')) setFileType('video');
    else if (file.type.startsWith('audio/')) setFileType('audio');
    else setFileType('document');
  };

  const handleSendFile = async () => {
    if (!selectedFile || !selectedChat) return;
    setSending(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('chatId', selectedChat.id);
    formData.append('mediaType', fileType);
    if (fileCaption) formData.append('caption', fileCaption);
    if (replyingTo) formData.append('quotedMessageId', replyingTo.id);

    try {
      await apiFetch('/api/messages/send-media', {
        method: 'POST',
        body: formData,
      });
      setSelectedFile(null);
      setFileCaption('');
      setReplyingTo(null);
    } catch (err: any) {
      alert(`Gagal upload media: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const toggleArchive = async (chat: Chat) => {
    try {
      await apiFetch(`/api/chats/${encodeURIComponent(chat.id)}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: !chat.isArchived }),
      });
      fetchChats();
      if (selectedChat?.id === chat.id) {
        setSelectedChat({ ...selectedChat, isArchived: !chat.isArchived });
      }
    } catch (_) {}
  };

  const filteredChats = chats.filter((c) =>
    searchQuery ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="flex h-[calc(100vh-6.5rem)] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
      {/* 1. Left Chats Sidebar */}
      <div
        className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-zinc-200 dark:border-zinc-800 shrink-0 ${
          selectedChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Search & Filter Header */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari obrolan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            {(['all', 'personal', 'groups', 'archived', 'unread'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap capitalize transition-colors ${
                  filter === tab
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {tab === 'all'
                  ? 'Semua'
                  : tab === 'personal'
                  ? 'Pribadi'
                  : tab === 'groups'
                  ? 'Grup'
                  : tab === 'archived'
                  ? 'Diarsipkan'
                  : 'Belum Dibaca'}
              </button>
            ))}
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {filteredChats.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-400">
              {loadingChats ? 'Memuat pesan...' : 'Tidak ada percakapan ditemukan.'}
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`flex items-center gap-3 p-3.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 font-bold text-sm">
                      {chat.isGroup ? <Users className="w-5 h-5 text-emerald-500" /> : chat.name.slice(0, 2).toUpperCase()}
                    </div>
                    {chat.isArchived && (
                      <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-zinc-800 text-amber-400">
                        <Archive className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-zinc-900 dark:text-white truncate">
                        {chat.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap ml-2">
                        {chat.lastMessageTime
                          ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate pr-2">
                        {chat.lastMessageText || 'Tidak ada pesan terbaru'}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Center Chat Conversation */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950/50">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-3 truncate">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                &larr;
              </button>

              <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs shrink-0">
                {selectedChat.isGroup ? <Users className="w-4 h-4 text-emerald-500" /> : selectedChat.name.slice(0, 2).toUpperCase()}
              </div>

              <div className="truncate">
                <h3 className="font-semibold text-xs text-zinc-900 dark:text-white truncate">{selectedChat.name}</h3>
                <p className="text-[10px] text-zinc-400 truncate">
                  {selectedChat.isGroup ? 'Grup WhatsApp' : selectedChat.id.split('@')[0]}
                  {selectedChat.isArchived && ' • Diarsipkan'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleArchive(selectedChat)}
                className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title={selectedChat.isArchived ? 'Batalkan Arsip' : 'Arsipkan Chat'}
              >
                {selectedChat.isArchived ? <ArchiveRestore className="w-4 h-4 text-amber-500" /> : <Archive className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setShowRightPanel(!showRightPanel)}
                className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Info Chat"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMessages ? (
              <div className="text-center py-12 text-xs text-zinc-400">Memuat riwayat chat...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-xs text-zinc-400">
                Belum ada pesan tercatat di percakapan ini.
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.fromMe;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`relative max-w-sm sm:max-w-md lg:max-w-lg p-3 rounded-2xl shadow-xs text-xs space-y-1.5 ${
                        msg.isDeleted
                          ? 'border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/20 text-zinc-900 dark:text-zinc-100'
                          : isMe
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/60 rounded-bl-xs'
                      }`}
                    >
                      {/* Sender Name in group */}
                      {!isMe && (
                        <div className="font-semibold text-[11px] text-emerald-600 dark:text-emerald-400">
                          {msg.senderName}
                        </div>
                      )}

                      {/* Quoted Message Preview */}
                      {msg.quotedText && (
                        <div
                          className={`p-2 rounded-lg text-[10px] border-l-2 mb-1.5 ${
                            isMe
                              ? 'bg-emerald-700/60 border-white/60 text-emerald-100'
                              : 'bg-zinc-100 dark:bg-zinc-700/50 border-emerald-500 text-zinc-600 dark:text-zinc-300'
                          }`}
                        >
                          <div className="font-semibold">Balasan:</div>
                          <div className="truncate">{msg.quotedText}</div>
                        </div>
                      )}

                      {/* DELETED MESSAGE ALERT BANNER */}
                      {msg.isDeleted && (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <div>
                            <div>⚠️ Pesan Ini Dihapus Oleh Pengirim</div>
                            <div className="text-[9px] font-normal text-rose-500">
                              Dihapus: {msg.deletedAt ? new Date(msg.deletedAt).toLocaleTimeString() : 'Revoked'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* VIEW ONCE BADGE */}
                      {msg.isViewOnce && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-500 text-[10px] font-bold">
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>VIEW ONCE — SAVED</span>
                        </div>
                      )}

                      {/* Media Display */}
                      {msg.mediaPath && (
                        <div className="overflow-hidden rounded-xl bg-black/5 dark:bg-black/30">
                          {msg.messageType === 'sticker' ? (
                            <div className="p-2 flex items-center justify-center">
                              <img
                                src={`/api/media-file/${msg.mediaId || msg.id}`}
                                alt="Sticker"
                                className="max-w-[140px] max-h-[140px] object-contain drop-shadow-md cursor-pointer hover:scale-105 transition-transform"
                                onClick={() =>
                                  setPreviewMedia({
                                    id: msg.mediaId || msg.id,
                                    fileName: 'Sticker.webp',
                                    mediaType: 'photo',
                                    caption: '',
                                    isViewOnce: false,
                                  })
                                }
                              />
                            </div>
                          ) : msg.messageType === 'image' || msg.mimeType?.startsWith('image/') ? (
                            <div className="relative group/chatimg">
                              <img
                                src={`/api/media-file/${msg.mediaId || msg.id}`}
                                alt="Image"
                                className="w-full max-h-64 object-cover rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                                onClick={() =>
                                  setPreviewMedia({
                                    id: msg.mediaId || msg.id,
                                    fileName: msg.fileName || 'Photo.jpg',
                                    mediaType: 'photo',
                                    caption: msg.textContent,
                                    isViewOnce: msg.isViewOnce,
                                  })
                                }
                              />
                            </div>
                          ) : msg.messageType === 'video' || msg.mimeType?.startsWith('video/') ? (
                            <div className="relative bg-black rounded-lg overflow-hidden">
                              <video
                                src={`/api/media-file/${msg.mediaId || msg.id}#t=0.001`}
                                controls
                                preload="metadata"
                                playsInline
                                className="w-full max-h-64 rounded-lg object-contain bg-black"
                              />
                            </div>
                          ) : msg.messageType === 'audio' || msg.messageType === 'voice' ? (
                            <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                              <audio src={`/api/media-file/${msg.mediaId || msg.id}`} controls className="w-full" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-3 gap-3">
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-5 h-5 shrink-0" />
                                <span className="truncate text-xs">{msg.fileName || 'Dokumen'}</span>
                              </div>
                              <a
                                href={`/api/media-file/${msg.mediaId || msg.id}?download=true`}
                                download
                                className="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:opacity-80"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Text Content */}
                      {msg.textContent && (
                        <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.textContent}</p>
                      )}

                      {/* Timestamp & Status */}
                      <div
                        className={`flex items-center justify-end gap-1 text-[9px] ${
                          isMe ? 'text-emerald-100' : 'text-zinc-400'
                        }`}
                      >
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && <CheckCheck className="w-3.5 h-3.5" />}
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="ml-2 hover:opacity-80"
                          title="Balas pesan ini"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Quote Banner */}
          {replyingTo && (
            <div className="flex items-center justify-between px-4 py-2 bg-emerald-500/10 border-t border-emerald-500/20 text-xs">
              <div className="flex items-center gap-2 truncate">
                <Reply className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-zinc-900 dark:text-white">Membalas {replyingTo.senderName}:</span>
                <span className="text-zinc-500 truncate">{replyingTo.textContent || `[${replyingTo.messageType}]`}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:text-zinc-900 dark:hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Attachment Selected Banner */}
          {selectedFile && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 text-xs">
              <div className="flex items-center gap-3 truncate">
                <Paperclip className="w-4 h-4 text-emerald-500" />
                <span className="font-medium truncate">{selectedFile.name}</span>
                <span className="text-[10px] text-zinc-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendFile}
                  disabled={sending}
                  className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-xs"
                >
                  Kirim Media
                </button>
                <button onClick={() => setSelectedFile(null)} className="p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Message Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Kirim Foto / Video / Dokumen"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder="Ketik pesan WhatsApp..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center text-zinc-400 bg-zinc-50 dark:bg-zinc-950/30">
          <MessageSquare className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-3" />
          <h3 className="font-semibold text-base text-zinc-700 dark:text-zinc-300">Pilih Obrolan untuk Memulai</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            Lihat riwayat pesan, media yang tersimpan otomatis, view once, dan arsip pesan yang telah dihapus.
          </p>
        </div>
      )}

      {/* 3. Right Chat Info Panel */}
      {selectedChat && showRightPanel && (
        <div className="hidden xl:flex w-72 flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-6 overflow-y-auto">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-700 mx-auto flex items-center justify-center text-zinc-700 dark:text-zinc-200 font-bold text-2xl">
              {selectedChat.isGroup ? <Users className="w-8 h-8 text-emerald-500" /> : selectedChat.name.slice(0, 2).toUpperCase()}
            </div>
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{selectedChat.name}</h4>
            <p className="text-xs text-zinc-400 font-mono">{selectedChat.id.split('@')[0]}</p>
          </div>

          <div className="space-y-3 text-xs border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <div className="flex justify-between">
              <span className="text-zinc-500">Tipe Percakapan</span>
              <span className="font-medium text-zinc-900 dark:text-white">
                {selectedChat.isGroup ? 'Grup WhatsApp' : 'Obrolan Pribadi'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Status Arsip</span>
              <span className="font-medium text-zinc-900 dark:text-white">
                {selectedChat.isArchived ? 'Diarsipkan' : 'Normal'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Jumlah Pesan Sesi</span>
              <span className="font-medium text-zinc-900 dark:text-white">{messages.length}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-[11px] text-zinc-500 space-y-1">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Auto Save Status:</span>
            <p>Seluruh pesan, foto, audio, dan dokumen dari obrolan ini langsung tersimpan ke vault server.</p>
          </div>
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
