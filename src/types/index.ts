export interface User {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  lastLogin?: string;
}

export interface WhatsAppSession {
  id: string;
  phoneNumber?: string;
  accountName?: string;
  profilePicUrl?: string;
  status:
    | 'waiting_qr'
    | 'qr_ready'
    | 'qr_expired'
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'auth_failure';
  lastActive?: string;
  device?: string;
  uptimeStarted?: string;
  connectionVersion?: string;
  reconnectStatus?: string;
  qrCode?: string;
  pairingCode?: string;
}

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  isArchived: boolean;
  isStarred?: boolean;
  unreadCount: number;
  lastMessageTime: string;
  lastMessageText?: string;
  avatarUrl?: string;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'document'
  | 'sticker'
  | 'view_once'
  | 'location'
  | 'contact'
  | 'reaction'
  | 'poll'
  | 'other';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  fromMe: boolean;
  timestamp: string;
  messageType: MessageType;
  textContent?: string;
  mediaId?: string;
  mediaPath?: string;
  mimeType?: string;
  fileSize?: number;
  fileName?: string;
  isDeleted: boolean;
  deletedAt?: string;
  isViewOnce: boolean;
  quotedMessageId?: string;
  quotedText?: string;
  status?: 'received' | 'sent' | 'delivered' | 'read';
}

export interface DeletedMessage {
  id: string;
  messageId: string;
  chatId: string;
  chatName: string;
  senderId: string;
  senderName: string;
  originalTimestamp: string;
  deletedTimestamp: string;
  messageType: MessageType;
  originalText?: string;
  mediaPath?: string;
  mediaType?: string;
  mimeType?: string;
}

export type MediaDownloadStatus = 'SAVED' | 'PROCESSING' | 'FAILED' | 'UNSUPPORTED';

export interface MediaItem {
  id: string;
  messageId?: string;
  chatId?: string;
  chatName?: string;
  senderId?: string;
  senderName?: string;
  mediaType: 'photo' | 'video' | 'audio' | 'voice' | 'document' | 'sticker' | 'view_once' | 'link';
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  checksum?: string;
  isViewOnce: boolean;
  isStatus: boolean;
  downloadStatus: MediaDownloadStatus;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
}

export interface WhatsAppStatusItem {
  id: string;
  senderId: string;
  senderName: string;
  senderPhone: string;
  mediaType: 'photo' | 'video' | 'text';
  mediaPath?: string;
  caption?: string;
  timestamp: string;
  savedAt: string;
  downloadStatus: MediaDownloadStatus;
  fileSize?: number;
}

export interface Contact {
  id: string;
  name: string;
  notifyName?: string;
  phoneNumber: string;
  avatarUrl?: string;
  about?: string;
  lastSeen?: string;
  totalMessages?: number;
  totalMedia?: number;
}

export interface Group {
  id: string;
  subject: string;
  description?: string;
  owner?: string;
  creationTime?: string;
  memberCount: number;
  members: Array<{ id: string; admin?: 'admin' | 'superadmin' | null }>;
  avatarUrl?: string;
  totalMessages?: number;
  totalMedia?: number;
}

export interface AppNotification {
  id: string;
  type:
    | 'new_message'
    | 'deleted_message'
    | 'new_media'
    | 'new_status'
    | 'view_once_saved'
    | 'wa_connected'
    | 'wa_disconnected'
    | 'media_failed'
    | 'system_warning'
    | 'storage_warning';
  title: string;
  message: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  event: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  source: 'BOT' | 'USER' | 'SYSTEM';
}

export interface AppSettings {
  autoSaveEverything: boolean;
  autoSaveMessages: boolean;
  autoSavePhotos: boolean;
  autoSaveVideos: boolean;
  autoSaveAudio: boolean;
  autoSaveDocuments: boolean;
  autoSaveStickers: boolean;
  autoSaveDeletedMessages: boolean;
  autoSaveStatus: boolean;
  autoSaveGroupMessages: boolean;
  autoSavePrivateMessages: boolean;
  autoSaveArchivedChats: boolean;
  autoSaveNonArchivedChats: boolean;
  saveViewOncePhotos: boolean;
  saveViewOnceVideos: boolean;
  saveViewOnceAudio: boolean;
  saveAllViewOnce: boolean;
  autoReconnect: boolean;
  pairingMethod: 'qr' | 'pairing_code';
  storageLocation: string;
  retentionDays: number;
  maxStorageBytes: number;
  autoCleanup: boolean;
  enableNotifications: boolean;
  notifyDeletedMessages: boolean;
  notifyNewStatus: boolean;
  notifyConnection: boolean;
  notifyViewOnce: boolean;
}

export interface DiagnosticResult {
  id: string;
  name: string;
  category: 'core' | 'media' | 'view_once' | 'anti_delete' | 'realtime';
  status: 'PASS' | 'FAIL' | 'UNSUPPORTED';
  durationMs: number;
  details: string;
  error?: string;
}

export interface DiagnosticReport {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  unsupported: number;
  results: DiagnosticResult[];
}
