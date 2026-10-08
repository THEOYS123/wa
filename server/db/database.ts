import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  WhatsAppSession,
  Contact,
  Group,
  Chat,
  Message,
  DeletedMessage,
  MediaItem,
  WhatsAppStatusItem,
  AppNotification,
  ActivityLog,
  AppSettings,
  MediaDownloadStatus,
} from './schema';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_DIR = path.resolve(DATA_DIR, 'db');
const MEDIA_DIR = path.resolve(DATA_DIR, 'media');

// Ensure base directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

// Sub-media folders
['photos', 'videos', 'audio', 'documents', 'stickers', 'view_once', 'status'].forEach((sub) => {
  const p = path.resolve(MEDIA_DIR, sub);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

export const DEFAULT_SETTINGS: AppSettings = {
  autoSaveEverything: true,
  autoSaveMessages: true,
  autoSavePhotos: true,
  autoSaveVideos: true,
  autoSaveAudio: true,
  autoSaveDocuments: true,
  autoSaveStickers: true,
  autoSaveDeletedMessages: true,
  autoSaveStatus: true,
  autoSaveGroupMessages: true,
  autoSavePrivateMessages: true,
  autoSaveArchivedChats: true,
  autoSaveNonArchivedChats: true,
  saveViewOncePhotos: true,
  saveViewOnceVideos: true,
  saveViewOnceAudio: true,
  saveAllViewOnce: true,
  autoReconnect: true,
  pairingMethod: 'qr',
  storageLocation: './data/media',
  retentionDays: 0, // forever
  maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
  autoCleanup: false,
  enableNotifications: true,
  notifyDeletedMessages: true,
  notifyNewStatus: true,
  notifyConnection: true,
  notifyViewOnce: true,
};

export class Database {
  private users: Map<string, User> = new Map();
  private session: WhatsAppSession;
  private contacts: Map<string, Contact> = new Map();
  private groups: Map<string, Group> = new Map();
  private chats: Map<string, Chat> = new Map();
  private messages: Map<string, Message> = new Map();
  private deletedMessages: Map<string, DeletedMessage> = new Map();
  private mediaItems: Map<string, MediaItem> = new Map();
  private statuses: Map<string, WhatsAppStatusItem> = new Map();
  private notifications: AppNotification[] = [];
  private activityLogs: ActivityLog[] = [];
  private settings: AppSettings = { ...DEFAULT_SETTINGS };

  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.session = {
      id: 'default',
      status: 'disconnected',
      reconnectStatus: 'Idle',
    };
    this.loadAll();
  }

  private getFilePath(filename: string): string {
    return path.join(DB_DIR, filename);
  }

  private loadFile<T>(filename: string, fallback: T): T {
    const p = this.getFilePath(filename);
    if (!fs.existsSync(p)) return fallback;
    try {
      const content = fs.readFileSync(p, 'utf-8');
      return JSON.parse(content) as T;
    } catch (e) {
      console.error(`Error loading ${filename}:`, e);
      return fallback;
    }
  }

  private async saveFileAtomic(filename: string, data: any): Promise<void> {
    const targetPath = this.getFilePath(filename);
    const tempPath = `${targetPath}.tmp.${Date.now()}`;
    const json = JSON.stringify(data, null, 2);
    try {
      await fs.promises.writeFile(tempPath, json, 'utf-8');
      await fs.promises.rename(tempPath, targetPath);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (_) {}
      }
      throw err;
    }
  }

  private scheduleSave(filename: string, getData: () => any) {
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        await this.saveFileAtomic(filename, getData());
      } catch (err) {
        console.error(`Failed to save ${filename}:`, err);
      }
    });
  }

  public loadAll() {
    // 1. Settings
    this.settings = { ...DEFAULT_SETTINGS, ...this.loadFile<AppSettings>('settings.json', DEFAULT_SETTINGS) };

    // 2. Users (Seed default admin if none)
    const usersArr = this.loadFile<User[]>('users.json', []);
    if (usersArr.length === 0) {
      const hash = crypto.createHash('sha256').update('admin123').digest('hex');
      const admin: User = {
        id: crypto.randomUUID(),
        username: 'admin',
        passwordHash: hash,
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      this.users.set(admin.id, admin);
      this.scheduleSave('users.json', () => Array.from(this.users.values()));
    } else {
      usersArr.forEach((u) => this.users.set(u.id, u));
    }

    // 3. WhatsApp Session
    this.session = this.loadFile<WhatsAppSession>('session.json', {
      id: 'default',
      status: 'disconnected',
      reconnectStatus: 'Idle',
    });

    // 4. Contacts
    const contactsArr = this.loadFile<Contact[]>('contacts.json', []);
    contactsArr.forEach((c) => this.contacts.set(c.id, c));

    // 5. Groups
    const groupsArr = this.loadFile<Group[]>('groups.json', []);
    groupsArr.forEach((g) => this.groups.set(g.id, g));

    // 6. Chats
    const chatsArr = this.loadFile<Chat[]>('chats.json', []);
    chatsArr.forEach((c) => this.chats.set(c.id, c));

    // 7. Messages
    const msgsArr = this.loadFile<Message[]>('messages.json', []);
    msgsArr.forEach((m) => this.messages.set(m.id, m));

    // 8. Deleted Messages
    const delArr = this.loadFile<DeletedMessage[]>('deleted_messages.json', []);
    delArr.forEach((d) => this.deletedMessages.set(d.id, d));

    // 9. Media
    const mediaArr = this.loadFile<MediaItem[]>('media.json', []);
    mediaArr.forEach((m) => this.mediaItems.set(m.id, m));

    // 10. Statuses
    const statusArr = this.loadFile<WhatsAppStatusItem[]>('statuses.json', []);
    statusArr.forEach((s) => this.statuses.set(s.id, s));

    // 11. Notifications
    this.notifications = this.loadFile<AppNotification[]>('notifications.json', []);

    // 12. Activity Logs
    this.activityLogs = this.loadFile<ActivityLog[]>('logs.json', []);
  }

  // --- Users & Auth ---
  public getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  public updateUser(user: User) {
    this.users.set(user.id, user);
    this.scheduleSave('users.json', () => Array.from(this.users.values()));
  }

  // --- Settings ---
  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...partial };
    this.scheduleSave('settings.json', () => this.settings);
    return this.settings;
  }

  // --- Session ---
  public getSession(): WhatsAppSession {
    return { ...this.session };
  }

  public updateSession(partial: Partial<WhatsAppSession>): WhatsAppSession {
    this.session = { ...this.session, ...partial };
    this.scheduleSave('session.json', () => this.session);
    return this.session;
  }

  // --- Chats ---
  public getChats(filter?: 'all' | 'personal' | 'groups' | 'archived' | 'unread' | 'starred'): Chat[] {
    let list = Array.from(this.chats.values());
    if (filter === 'personal') {
      list = list.filter((c) => !c.isGroup && !c.isArchived);
    } else if (filter === 'groups') {
      list = list.filter((c) => c.isGroup && !c.isArchived);
    } else if (filter === 'archived') {
      list = list.filter((c) => c.isArchived);
    } else if (filter === 'unread') {
      list = list.filter((c) => c.unreadCount > 0);
    } else if (filter === 'starred') {
      list = list.filter((c) => c.isStarred);
    }
    // Sort descending by lastMessageTime
    return list.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  }

  public getChat(id: string): Chat | undefined {
    return this.chats.get(id);
  }

  public upsertChat(chat: Chat) {
    const existing = this.chats.get(chat.id);
    this.chats.set(chat.id, { ...existing, ...chat });
    this.scheduleSave('chats.json', () => Array.from(this.chats.values()));
  }

  public updateChatArchived(chatId: string, isArchived: boolean) {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.isArchived = isArchived;
      this.chats.set(chatId, chat);
      this.scheduleSave('chats.json', () => Array.from(this.chats.values()));
    }
  }

  // --- Contacts ---
  public getContacts(): Contact[] {
    return Array.from(this.contacts.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  public getContact(id: string): Contact | undefined {
    return this.contacts.get(id);
  }

  public upsertContact(contact: Contact) {
    const existing = this.contacts.get(contact.id);
    this.contacts.set(contact.id, { ...existing, ...contact });
    this.scheduleSave('contacts.json', () => Array.from(this.contacts.values()));
  }

  // --- Groups ---
  public getGroups(): Group[] {
    return Array.from(this.groups.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }

  public getGroup(id: string): Group | undefined {
    return this.groups.get(id);
  }

  public upsertGroup(group: Group) {
    const existing = this.groups.get(group.id);
    this.groups.set(group.id, { ...existing, ...group });
    this.scheduleSave('groups.json', () => Array.from(this.groups.values()));
  }

  // --- Messages ---
  public getMessages(chatId: string, limit = 100, beforeTimestamp?: string): Message[] {
    let list = Array.from(this.messages.values()).filter((m) => m.chatId === chatId);
    if (beforeTimestamp) {
      const before = new Date(beforeTimestamp).getTime();
      list = list.filter((m) => new Date(m.timestamp).getTime() < before);
    }
    // Sort chronological (oldest to newest)
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (list.length > limit) {
      list = list.slice(list.length - limit);
    }
    return list;
  }

  public getMessage(id: string): Message | undefined {
    return this.messages.get(id);
  }

  public upsertMessage(msg: Message) {
    this.messages.set(msg.id, msg);
    this.scheduleSave('messages.json', () => Array.from(this.messages.values()));

    // Also update parent chat info
    const chat = this.chats.get(msg.chatId);
    const snippet = msg.textContent || (msg.isViewOnce ? '📷 View Once' : `[${msg.messageType}]`);
    if (chat) {
      chat.lastMessageTime = msg.timestamp;
      chat.lastMessageText = snippet;
      if (!msg.fromMe) chat.unreadCount = (chat.unreadCount || 0) + 1;
      this.chats.set(msg.chatId, chat);
      this.scheduleSave('chats.json', () => Array.from(this.chats.values()));
    } else {
      const isGrp = msg.chatId.endsWith('@g.us');
      this.upsertChat({
        id: msg.chatId,
        name: msg.senderName || msg.chatId.split('@')[0],
        isGroup: isGrp,
        isArchived: false,
        unreadCount: msg.fromMe ? 0 : 1,
        lastMessageTime: msg.timestamp,
        lastMessageText: snippet,
      });
    }
  }

  public markMessageDeleted(messageId: string, deletedTimestamp = new Date().toISOString()): DeletedMessage | null {
    const msg = this.messages.get(messageId);
    if (!msg) return null;

    msg.isDeleted = true;
    msg.deletedAt = deletedTimestamp;
    this.messages.set(messageId, msg);
    this.scheduleSave('messages.json', () => Array.from(this.messages.values()));

    const chat = this.chats.get(msg.chatId);
    const chatName = chat?.name || msg.chatId;

    const delItem: DeletedMessage = {
      id: crypto.randomUUID(),
      messageId: msg.id,
      chatId: msg.chatId,
      chatName,
      senderId: msg.senderId,
      senderName: msg.senderName,
      originalTimestamp: msg.timestamp,
      deletedTimestamp,
      messageType: msg.messageType,
      originalText: msg.textContent,
      mediaPath: msg.mediaPath,
      mediaType: msg.mediaPath ? msg.messageType : undefined,
      mimeType: msg.mimeType,
    };

    this.deletedMessages.set(delItem.id, delItem);
    this.scheduleSave('deleted_messages.json', () => Array.from(this.deletedMessages.values()));

    return delItem;
  }

  public getDeletedMessages(): DeletedMessage[] {
    return Array.from(this.deletedMessages.values()).sort(
      (a, b) => new Date(b.deletedTimestamp).getTime() - new Date(a.deletedTimestamp).getTime()
    );
  }

  // --- View Once & Media ---
  public upsertMedia(media: MediaItem) {
    this.mediaItems.set(media.id, media);
    this.scheduleSave('media.json', () => Array.from(this.mediaItems.values()));
  }

  public getMediaItems(options?: {
    type?: string;
    isViewOnce?: boolean;
    isStatus?: boolean;
    status?: MediaDownloadStatus;
  }): MediaItem[] {
    let list = Array.from(this.mediaItems.values());
    if (options?.type && options.type !== 'all') {
      list = list.filter((m) => m.mediaType === options.type);
    }
    if (typeof options?.isViewOnce === 'boolean') {
      list = list.filter((m) => m.isViewOnce === options.isViewOnce);
    }
    if (typeof options?.isStatus === 'boolean') {
      list = list.filter((m) => m.isStatus === options.isStatus);
    }
    if (options?.status) {
      list = list.filter((m) => m.downloadStatus === options.status);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getMediaById(id: string): MediaItem | undefined {
    return this.mediaItems.get(id);
  }

  public deleteMedia(id: string): boolean {
    const item = this.mediaItems.get(id);
    if (!item) return false;
    // Delete file from disk if exists
    try {
      const fullPath = path.resolve(process.cwd(), item.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      console.error('Failed to unlink media file:', err);
    }
    this.mediaItems.delete(id);
    this.scheduleSave('media.json', () => Array.from(this.mediaItems.values()));
    return true;
  }

  // --- Statuses ---
  public upsertStatus(status: WhatsAppStatusItem) {
    this.statuses.set(status.id, status);
    this.scheduleSave('statuses.json', () => Array.from(this.statuses.values()));
  }

  public getStatuses(filter?: { type?: string; timeRange?: string }): WhatsAppStatusItem[] {
    let list = Array.from(this.statuses.values());
    if (filter?.type && filter.type !== 'all') {
      list = list.filter((s) => s.mediaType === filter.type);
    }
    const now = Date.now();
    if (filter?.timeRange === 'today') {
      const oneDay = 24 * 60 * 60 * 1000;
      list = list.filter((s) => now - new Date(s.timestamp).getTime() <= oneDay);
    } else if (filter?.timeRange === 'yesterday') {
      const oneDay = 24 * 60 * 60 * 1000;
      list = list.filter((s) => {
        const diff = now - new Date(s.timestamp).getTime();
        return diff > oneDay && diff <= 2 * oneDay;
      });
    } else if (filter?.timeRange === 'week') {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      list = list.filter((s) => now - new Date(s.timestamp).getTime() <= sevenDays);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public deleteStatus(id: string): boolean {
    const s = this.statuses.get(id);
    if (!s) return false;
    if (s.mediaPath) {
      try {
        const full = path.resolve(process.cwd(), s.mediaPath);
        if (fs.existsSync(full)) fs.unlinkSync(full);
      } catch (_) {}
    }
    this.statuses.delete(id);
    this.scheduleSave('statuses.json', () => Array.from(this.statuses.values()));
    return true;
  }

  // --- Notifications ---
  public addNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): AppNotification {
    const item: AppNotification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    this.notifications.unshift(item);
    if (this.notifications.length > 500) {
      this.notifications = this.notifications.slice(0, 500);
    }
    this.scheduleSave('notifications.json', () => this.notifications);
    return item;
  }

  public getNotifications(unreadOnly = false): AppNotification[] {
    if (unreadOnly) {
      return this.notifications.filter((n) => !n.isRead);
    }
    return this.notifications;
  }

  public markNotificationRead(id: string) {
    const n = this.notifications.find((i) => i.id === id);
    if (n) {
      n.isRead = true;
      this.scheduleSave('notifications.json', () => this.notifications);
    }
  }

  public markAllNotificationsRead() {
    this.notifications.forEach((n) => (n.isRead = true));
    this.scheduleSave('notifications.json', () => this.notifications);
  }

  public clearNotifications() {
    this.notifications = [];
    this.scheduleSave('notifications.json', () => this.notifications);
  }

  // --- Activity Logs ---
  public addLog(
    event: string,
    details: string,
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' = 'INFO',
    source: 'BOT' | 'USER' | 'SYSTEM' = 'BOT'
  ): ActivityLog {
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      event,
      details,
      severity,
      source,
    };
    this.activityLogs.unshift(log);
    if (this.activityLogs.length > 2000) {
      this.activityLogs = this.activityLogs.slice(0, 2000);
    }
    this.scheduleSave('logs.json', () => this.activityLogs);
    return log;
  }

  public getLogs(limit = 200, severity?: string, search?: string): ActivityLog[] {
    let list = this.activityLogs;
    if (severity && severity !== 'ALL') {
      list = list.filter((l) => l.severity === severity);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) => l.event.toLowerCase().includes(q) || l.details.toLowerCase().includes(q));
    }
    return list.slice(0, limit);
  }

  // --- Global Search ---
  public globalSearch(query: string): {
    messages: Message[];
    contacts: Contact[];
    groups: Group[];
    media: MediaItem[];
    statuses: WhatsAppStatusItem[];
    deleted: DeletedMessage[];
  } {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { messages: [], contacts: [], groups: [], media: [], statuses: [], deleted: [] };
    }

    const messages = Array.from(this.messages.values())
      .filter(
        (m) =>
          (m.textContent && m.textContent.toLowerCase().includes(q)) ||
          m.id.toLowerCase().includes(q) ||
          m.chatId.toLowerCase().includes(q) ||
          (m.senderName && m.senderName.toLowerCase().includes(q))
      )
      .slice(0, 50);

    const contacts = Array.from(this.contacts.values())
      .filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phoneNumber && c.phoneNumber.includes(q)) ||
          c.id.toLowerCase().includes(q)
      )
      .slice(0, 20);

    const groups = Array.from(this.groups.values())
      .filter((g) => g.subject.toLowerCase().includes(q) || g.id.toLowerCase().includes(q))
      .slice(0, 20);

    const media = Array.from(this.mediaItems.values())
      .filter((m) => m.fileName.toLowerCase().includes(q) || (m.senderName && m.senderName.toLowerCase().includes(q)))
      .slice(0, 30);

    const statuses = Array.from(this.statuses.values())
      .filter(
        (s) =>
          (s.caption && s.caption.toLowerCase().includes(q)) ||
          (s.senderName && s.senderName.toLowerCase().includes(q))
      )
      .slice(0, 20);

    const deleted = Array.from(this.deletedMessages.values())
      .filter(
        (d) =>
          (d.originalText && d.originalText.toLowerCase().includes(q)) ||
          d.senderName.toLowerCase().includes(q) ||
          d.chatName.toLowerCase().includes(q)
      )
      .slice(0, 30);

    return { messages, contacts, groups, media, statuses, deleted };
  }

  // --- Storage Stats ---
  public getStorageStats(): {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    photosBytes: number;
    videosBytes: number;
    audioBytes: number;
    documentsBytes: number;
    viewOnceBytes: number;
    statusBytes: number;
    otherBytes: number;
    counts: Record<string, number>;
  } {
    let photosBytes = 0;
    let videosBytes = 0;
    let audioBytes = 0;
    let documentsBytes = 0;
    let viewOnceBytes = 0;
    let statusBytes = 0;
    let otherBytes = 0;

    const counts: Record<string, number> = {
      photos: 0,
      videos: 0,
      audio: 0,
      documents: 0,
      stickers: 0,
      view_once: 0,
      status: 0,
    };

    for (const item of this.mediaItems.values()) {
      const sz = item.fileSize || 0;
      if (item.isViewOnce) {
        viewOnceBytes += sz;
        counts.view_once++;
      } else if (item.isStatus) {
        statusBytes += sz;
        counts.status++;
      } else if (item.mediaType === 'photo' || item.mediaType === 'sticker') {
        photosBytes += sz;
        if (item.mediaType === 'photo') counts.photos++;
        else counts.stickers++;
      } else if (item.mediaType === 'video') {
        videosBytes += sz;
        counts.videos++;
      } else if (item.mediaType === 'audio' || item.mediaType === 'voice') {
        audioBytes += sz;
        counts.audio++;
      } else if (item.mediaType === 'document') {
        documentsBytes += sz;
        counts.documents++;
      } else {
        otherBytes += sz;
      }
    }

    const usedBytes =
      photosBytes + videosBytes + audioBytes + documentsBytes + viewOnceBytes + statusBytes + otherBytes;
    const maxBytes = this.settings.maxStorageBytes || 50 * 1024 * 1024 * 1024;
    const freeBytes = Math.max(0, maxBytes - usedBytes);

    return {
      totalBytes: maxBytes,
      usedBytes,
      freeBytes,
      photosBytes,
      videosBytes,
      audioBytes,
      documentsBytes,
      viewOnceBytes,
      statusBytes,
      otherBytes,
      counts,
    };
  }

  // --- Data Retention Cleanup ---
  public cleanupOldMedia(days: number): { deletedCount: number; freedBytes: number } {
    if (days <= 0) return { deletedCount: 0, freedBytes: 0 };
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    let freedBytes = 0;

    for (const [id, item] of this.mediaItems.entries()) {
      if (new Date(item.createdAt).getTime() < cutoffTime) {
        freedBytes += item.fileSize || 0;
        deletedCount++;
        this.deleteMedia(id);
      }
    }

    this.addLog(
      'Media Retention Cleanup',
      `Auto cleanup removed ${deletedCount} media files older than ${days} days, freeing ${(freedBytes / (1024 * 1024)).toFixed(2)} MB`,
      'INFO',
      'SYSTEM'
    );

    return { deletedCount, freedBytes };
  }

  // --- Reset All Data ---
  public async deleteAllStoredData(): Promise<void> {
    this.messages.clear();
    this.deletedMessages.clear();
    this.chats.clear();
    this.contacts.clear();
    this.groups.clear();
    this.statuses.clear();
    this.mediaItems.clear();
    this.notifications = [];
    this.activityLogs = [];

    // Clear media folder contents
    const clearDir = (dir: string) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const curPath = path.join(dir, file);
          if (fs.lstatSync(curPath).isDirectory()) {
            clearDir(curPath);
          } else {
            fs.unlinkSync(curPath);
          }
        }
      }
    };
    clearDir(MEDIA_DIR);

    // Save empty state files
    await this.saveFileAtomic('messages.json', []);
    await this.saveFileAtomic('deleted_messages.json', []);
    await this.saveFileAtomic('chats.json', []);
    await this.saveFileAtomic('contacts.json', []);
    await this.saveFileAtomic('groups.json', []);
    await this.saveFileAtomic('statuses.json', []);
    await this.saveFileAtomic('media.json', []);
    await this.saveFileAtomic('notifications.json', []);
    await this.saveFileAtomic('logs.json', []);

    this.addLog('Reset Stored Data', 'All local WhatsApp messages, media, and statuses were deleted by user request.', 'CRITICAL', 'USER');
  }

  // --- Statistics for Dashboard ---
  public getDashboardStats() {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const allMsgs = Array.from(this.messages.values());
    const messagesToday = allMsgs.filter((m) => new Date(m.timestamp).getTime() >= oneDayAgo).length;

    const storageStats = this.getStorageStats();

    return {
      session: this.getSession(),
      totalChats: this.chats.size,
      totalMessages: this.messages.size,
      messagesToday,
      deletedMessagesCount: this.deletedMessages.size,
      savedPhotos: storageStats.counts.photos || 0,
      savedVideos: storageStats.counts.videos || 0,
      savedAudio: storageStats.counts.audio || 0,
      savedDocuments: storageStats.counts.documents || 0,
      savedViewOnce: storageStats.counts.view_once || 0,
      savedStatus: this.statuses.size,
      storage: storageStats,
    };
  }
}

export const db = new Database();
