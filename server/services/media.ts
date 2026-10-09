import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { downloadMediaMessage, downloadContentFromMessage, WAMessage } from '@whiskeysockets/baileys';
import { db } from '../db/database';
import { MediaItem, MediaDownloadStatus } from '../db/schema';
import { realtime } from './realtime';

const MEDIA_DIR = path.resolve(process.cwd(), 'data', 'media');

export interface MediaJob {
  id: string;
  messageId: string;
  chatId: string;
  chatName: string;
  senderId: string;
  senderName: string;
  rawMsg: WAMessage;
  mediaType: 'photo' | 'video' | 'audio' | 'voice' | 'document' | 'sticker' | 'view_once';
  isViewOnce: boolean;
  isStatus: boolean;
  attempts: number;
  maxAttempts: number;
}

class MediaService {
  private retryQueue: MediaJob[] = [];
  private isProcessingQueue = false;

  constructor() {
    // Run queue worker every 5 seconds
    setInterval(() => this.processQueue(), 5000);
  }

  public getMediaDir(): string {
    return MEDIA_DIR;
  }

  public getSubdir(type: string, isViewOnce: boolean, isStatus: boolean): string {
    if (isViewOnce) return path.join(MEDIA_DIR, 'view_once');
    if (isStatus) return path.join(MEDIA_DIR, 'status');
    switch (type) {
      case 'photo':
        return path.join(MEDIA_DIR, 'photos');
      case 'video':
        return path.join(MEDIA_DIR, 'videos');
      case 'audio':
      case 'voice':
        return path.join(MEDIA_DIR, 'audio');
      case 'document':
        return path.join(MEDIA_DIR, 'documents');
      case 'sticker':
        return path.join(MEDIA_DIR, 'stickers');
      default:
        return path.join(MEDIA_DIR, 'documents');
    }
  }

  public getExtension(mimeType: string, type: string): string {
    if (mimeType.includes('image/jpeg')) return '.jpg';
    if (mimeType.includes('image/png')) return '.png';
    if (mimeType.includes('image/webp')) return '.webp';
    if (mimeType.includes('video/mp4')) return '.mp4';
    if (mimeType.includes('video/3gpp')) return '.3gp';
    if (mimeType.includes('audio/ogg')) return '.ogg';
    if (mimeType.includes('audio/mp4') || mimeType.includes('audio/m4a')) return '.m4a';
    if (mimeType.includes('audio/mpeg')) return '.mp3';
    if (mimeType.includes('pdf')) return '.pdf';
    if (type === 'photo') return '.jpg';
    if (type === 'video') return '.mp4';
    if (type === 'audio' || type === 'voice') return '.mp3';
    if (type === 'sticker') return '.webp';
    return '.bin';
  }

  public unwrapMessage(msgContent: any): { unwrapped: any; isViewOnce: boolean } {
    let isViewOnce = false;
    let current = msgContent;

    for (let depth = 0; depth < 10; depth++) {
      if (!current || typeof current !== 'object') break;

      if (current.deviceSentMessage?.message) {
        current = current.deviceSentMessage.message;
        continue;
      }
      if (current.ephemeralMessage?.message) {
        current = current.ephemeralMessage.message;
        continue;
      }
      if (current.documentWithCaptionMessage?.message) {
        current = current.documentWithCaptionMessage.message;
        continue;
      }
      if (current.viewOnceMessage?.message) {
        isViewOnce = true;
        current = current.viewOnceMessage.message;
        continue;
      }
      if (current.viewOnceMessageV2?.message) {
        isViewOnce = true;
        current = current.viewOnceMessageV2.message;
        continue;
      }
      if (current.viewOnceMessageV2Extension?.message) {
        isViewOnce = true;
        current = current.viewOnceMessageV2Extension.message;
        continue;
      }
      if (current.editedMessage?.message?.protocolMessage?.editedMessage) {
        current = current.editedMessage.message.protocolMessage.editedMessage;
        continue;
      }
      break;
    }

    if (
      current?.imageMessage?.viewOnce ||
      current?.videoMessage?.viewOnce ||
      current?.audioMessage?.viewOnce
    ) {
      isViewOnce = true;
    }

    return { unwrapped: current || msgContent, isViewOnce };
  }

  public async processAndSaveMedia(
    rawMsg: WAMessage,
    mediaType: 'photo' | 'video' | 'audio' | 'voice' | 'document' | 'sticker' | 'view_once',
    opts: {
      messageId: string;
      chatId: string;
      chatName: string;
      senderId: string;
      senderName: string;
      isViewOnce: boolean;
      isStatus: boolean;
      caption?: string;
    }
  ): Promise<MediaItem | null> {
    const settings = db.getSettings();

    const { unwrapped, isViewOnce: unwrappedVO } = this.unwrapMessage(rawMsg.message);
    const finalIsViewOnce = opts.isViewOnce || unwrappedVO;

    // Check settings if saving is enabled
    if (!settings.autoSaveEverything) {
      if (mediaType === 'photo' && !settings.autoSavePhotos) return null;
      if (mediaType === 'video' && !settings.autoSaveVideos) return null;
      if ((mediaType === 'audio' || mediaType === 'voice') && !settings.autoSaveAudio) return null;
      if (mediaType === 'document' && !settings.autoSaveDocuments) return null;
      if (mediaType === 'sticker' && !settings.autoSaveStickers) return null;
      if (finalIsViewOnce && !settings.saveAllViewOnce) {
        if (mediaType === 'photo' && !settings.saveViewOncePhotos) return null;
        if (mediaType === 'video' && !settings.saveViewOnceVideos) return null;
        if (mediaType === 'audio' && !settings.saveViewOnceAudio) return null;
      }
    }

    const mediaId = crypto.randomUUID();
    const initialItem: MediaItem = {
      id: mediaId,
      messageId: opts.messageId,
      chatId: opts.chatId,
      chatName: opts.chatName,
      senderId: opts.senderId,
      senderName: opts.senderName,
      mediaType,
      fileName: 'pending',
      filePath: '',
      mimeType: 'application/octet-stream',
      fileSize: 0,
      isViewOnce: finalIsViewOnce,
      isStatus: opts.isStatus,
      downloadStatus: 'PROCESSING',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    db.upsertMedia(initialItem);

    const cleanRawMsg: WAMessage = {
      ...rawMsg,
      message: unwrapped,
    };

    try {
      let buffer: Buffer | null = null;

      try {
        buffer = await downloadMediaMessage(cleanRawMsg, 'buffer', {}, {} as any);
      } catch (primaryErr: any) {
        const mediaObj =
          unwrapped?.imageMessage ||
          unwrapped?.videoMessage ||
          unwrapped?.audioMessage ||
          unwrapped?.documentMessage ||
          unwrapped?.stickerMessage;

        if (mediaObj && (mediaObj.directPath || mediaObj.url)) {
          const baileyType =
            mediaType === 'photo'
              ? 'image'
              : mediaType === 'video'
                ? 'video'
                : mediaType === 'audio' || mediaType === 'voice'
                  ? (mediaObj.ptt ? 'audio' : 'audio')
                  : mediaType === 'document'
                    ? 'document'
                    : 'sticker';

          const stream = await downloadContentFromMessage(mediaObj, baileyType as any);
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          buffer = Buffer.concat(chunks);
        } else {
          throw primaryErr;
        }
      }

      if (!buffer || buffer.length === 0) {
        throw new Error('Downloaded buffer is empty or null');
      }

      // Calculate sha256 checksum
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      // Determine mime and extension
      let mime = 'application/octet-stream';
      let originalFilename = '';

      if (unwrapped?.imageMessage?.mimetype) mime = unwrapped.imageMessage.mimetype;
      else if (unwrapped?.videoMessage?.mimetype) mime = unwrapped.videoMessage.mimetype;
      else if (unwrapped?.audioMessage?.mimetype) mime = unwrapped.audioMessage.mimetype;
      else if (unwrapped?.documentMessage?.mimetype) {
        mime = unwrapped.documentMessage.mimetype;
        originalFilename = unwrapped.documentMessage.fileName || '';
      } else if (unwrapped?.stickerMessage?.mimetype) mime = unwrapped.stickerMessage.mimetype;

      const ext = this.getExtension(mime, mediaType);
      const cleanFileName =
        originalFilename || `${Date.now()}_${finalIsViewOnce ? 'VIEWONCE_' : ''}${opts.messageId.slice(0, 10)}${ext}`;
      const targetFolder = this.getSubdir(mediaType, finalIsViewOnce, opts.isStatus);
      const fullPath = path.join(targetFolder, cleanFileName);
      const relativePath = path.relative(process.cwd(), fullPath);

      // Write file to disk
      await fs.promises.writeFile(fullPath, buffer);

      const savedItem: MediaItem = {
        ...initialItem,
        fileName: cleanFileName,
        filePath: relativePath,
        mimeType: mime,
        fileSize: buffer.length,
        checksum,
        downloadStatus: 'SAVED',
      };

      db.upsertMedia(savedItem);

      // Emit realtime event
      if (finalIsViewOnce) {
        realtime.broadcast('view_once:saved', savedItem);
        db.addNotification({
          type: 'view_once_saved',
          title: '📷 View Once Media Tersimpan',
          message: `Media Sekali Lihat dari ${opts.senderName} (${opts.chatName}) berhasil diamankan!`,
          referenceId: savedItem.id,
        });
      } else {
        realtime.broadcast('media:saved', savedItem);
      }

      db.addLog(
        finalIsViewOnce ? 'View Once Captured' : 'Media Saved',
        `Successfully downloaded ${mediaType} (${(buffer.length / 1024).toFixed(1)} KB) from ${opts.senderName}`,
        'INFO',
        'BOT'
      );

      return savedItem;
    } catch (err: any) {
      console.warn(`Initial media download error for msg ${opts.messageId}:`, err.message);

      // Add to retry queue if attempts < 3
      this.retryQueue.push({
        id: mediaId,
        messageId: opts.messageId,
        chatId: opts.chatId,
        chatName: opts.chatName,
        senderId: opts.senderId,
        senderName: opts.senderName,
        rawMsg: cleanRawMsg,
        mediaType,
        isViewOnce: finalIsViewOnce,
        isStatus: opts.isStatus,
        attempts: 1,
        maxAttempts: 3,
      });

      return initialItem;
    }
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.retryQueue.length === 0) return;
    this.isProcessingQueue = true;

    const job = this.retryQueue.shift();
    if (!job) {
      this.isProcessingQueue = false;
      return;
    }

    try {
      let buffer: Buffer | null = null;
      try {
        buffer = await downloadMediaMessage(job.rawMsg, 'buffer', {}, {} as any);
      } catch (errRetry: any) {
        const { unwrapped } = this.unwrapMessage(job.rawMsg.message);
        const mediaObj =
          unwrapped?.imageMessage ||
          unwrapped?.videoMessage ||
          unwrapped?.audioMessage ||
          unwrapped?.documentMessage ||
          unwrapped?.stickerMessage;

        if (mediaObj && (mediaObj.directPath || mediaObj.url)) {
          const baileyType =
            job.mediaType === 'photo'
              ? 'image'
              : job.mediaType === 'video'
                ? 'video'
                : job.mediaType === 'audio' || job.mediaType === 'voice'
                  ? (mediaObj.ptt ? 'audio' : 'audio')
                  : job.mediaType === 'document'
                    ? 'document'
                    : 'sticker';

          const stream = await downloadContentFromMessage(mediaObj, baileyType as any);
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          buffer = Buffer.concat(chunks);
        } else {
          throw errRetry;
        }
      }

      if (!buffer || buffer.length === 0) {
        throw new Error('Downloaded buffer empty on retry');
      }

      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
      const ext = this.getExtension('application/octet-stream', job.mediaType);
      const cleanFileName = `retry_${Date.now()}_${job.messageId.slice(0, 8)}${ext}`;
      const targetFolder = this.getSubdir(job.mediaType, job.isViewOnce, job.isStatus);
      const fullPath = path.join(targetFolder, cleanFileName);
      const relativePath = path.relative(process.cwd(), fullPath);

      await fs.promises.writeFile(fullPath, buffer);

      const updated: MediaItem = {
        id: job.id,
        messageId: job.messageId,
        chatId: job.chatId,
        chatName: job.chatName,
        senderId: job.senderId,
        senderName: job.senderName,
        mediaType: job.mediaType,
        fileName: cleanFileName,
        filePath: relativePath,
        mimeType: 'application/octet-stream',
        fileSize: buffer.length,
        checksum,
        isViewOnce: job.isViewOnce,
        isStatus: job.isStatus,
        downloadStatus: 'SAVED',
        retryCount: job.attempts,
        createdAt: new Date().toISOString(),
      };

      db.upsertMedia(updated);
      realtime.broadcast(job.isViewOnce ? 'view_once:saved' : 'media:saved', updated);
      db.addLog('Retry Media Success', `Recovered media ${job.id} on attempt #${job.attempts}`, 'INFO', 'SYSTEM');
    } catch (err: any) {
      job.attempts++;
      if (job.attempts < job.maxAttempts) {
        this.retryQueue.push(job);
      } else {
        // Mark FAILED
        const existing = db.getMediaById(job.id);
        if (existing) {
          existing.downloadStatus = 'FAILED';
          existing.errorMessage = err.message || 'Media not available or key expired';
          existing.retryCount = job.attempts;
          db.upsertMedia(existing);
        }
        db.addNotification({
          type: 'media_failed',
          title: '⚠️ Media Download Gagal',
          message: `Gagal mendownload ${job.mediaType} dari ${job.senderName}: ${err.message}`,
        });
        db.addLog(
          'Media Download Failed',
          `Permanent failure for ${job.id} (${job.mediaType}): ${err.message}`,
          'WARNING',
          'SYSTEM'
        );
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  public getQueueStatus() {
    return {
      pendingRetries: this.retryQueue.length,
      isProcessing: this.isProcessingQueue,
    };
  }
}

export const mediaService = new MediaService();
