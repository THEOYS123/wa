import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  proto,
  WAMessage,
  WASocket,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';
import { db } from '../db/database';
import { Message, MessageType, WhatsAppStatusItem } from '../db/schema';
import { realtime } from './realtime';
import { mediaService } from './media';

const AUTH_DIR = path.resolve(process.cwd(), 'data', 'auth_info_baileys');
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const logger = pino({ level: 'silent' });

class WhatsAppBotService {
  private sock: WASocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private qrTimeoutTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private uptimeStarted: string | null = null;
  private isConnecting = false;
  private isPairingMode = false;

  constructor() {
    // If auth state has creds, auto-connect on boot
    const credsPath = path.join(AUTH_DIR, 'creds.json');
    if (fs.existsSync(credsPath)) {
      setTimeout(() => this.connect(), 2000);
    }
  }

  private attachSocketListeners(version: any) {
    if (!this.sock) return;

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !this.isPairingMode) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
          db.updateSession({
            status: 'qr_ready',
            qrCode: qrDataUrl,
            pairingCode: undefined,
            reconnectStatus: 'QR Code is ready. Scan with WhatsApp.',
          });
          realtime.broadcast('connection:update', db.getSession());

          if (this.qrTimeoutTimer) clearTimeout(this.qrTimeoutTimer);
          this.qrTimeoutTimer = setTimeout(() => {
            const current = db.getSession();
            if (current.status === 'qr_ready') {
              db.updateSession({
                status: 'qr_expired',
                reconnectStatus: 'QR Code expired. Refresh to generate new QR.',
              });
              realtime.broadcast('connection:update', db.getSession());
            }
          }, 60000);
        } catch (err) {
          console.error('Error rendering QR Code:', err);
        }
      }

      if (connection === 'connecting') {
        if (!this.isPairingMode) {
          db.updateSession({
            status: 'connecting',
            reconnectStatus: 'Connecting to WhatsApp servers...',
          });
          realtime.broadcast('connection:update', db.getSession());
        }
      }

      if (connection === 'open') {
        this.isPairingMode = false;
        this.reconnectAttempts = 0;
        this.uptimeStarted = new Date().toISOString();
        const userJid = this.sock?.user?.id;
        const cleanPhone = userJid ? jidNormalizedUser(userJid).split('@')[0] : '';
        const name = this.sock?.user?.name || cleanPhone || 'WhatsApp Bot';

        let profilePicUrl: string | undefined;
        if (userJid) {
          try {
            profilePicUrl = await this.sock?.profilePictureUrl(userJid, 'image');
          } catch (_) {}
        }

        db.updateSession({
          status: 'connected',
          phoneNumber: cleanPhone,
          accountName: name,
          profilePicUrl,
          lastActive: new Date().toISOString(),
          uptimeStarted: this.uptimeStarted,
          connectionVersion: Array.isArray(version) ? version.join('.') : String(version),
          reconnectStatus: 'Connected & Listening in Realtime',
          qrCode: undefined,
          pairingCode: undefined,
        });

        realtime.broadcast('connection:update', db.getSession());
        db.addNotification({
          type: 'wa_connected',
          title: '🟢 WhatsApp Terhubung',
          message: `Akun ${name} (${cleanPhone}) berhasil terhubung dan siap memantau pesan.`,
        });
        db.addLog('WhatsApp Connected', `Account ${name} (${cleanPhone}) is online`, 'INFO', 'BOT');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !this.isPairingMode;

        db.updateSession({
          status: statusCode === DisconnectReason.loggedOut ? 'auth_failure' : 'disconnected',
          reconnectStatus: `Connection closed (${statusCode || 'Unknown'}). ${shouldReconnect ? 'Reconnecting...' : 'Idle.'}`,
          qrCode: undefined,
        });
        realtime.broadcast('connection:update', db.getSession());

        db.addNotification({
          type: 'wa_disconnected',
          title: '🔴 WhatsApp Terputus',
          message: `Koneksi WhatsApp terputus. Kode: ${statusCode || 'N/A'}.`,
        });
        db.addLog(
          'WhatsApp Disconnected',
          `Socket closed with code ${statusCode}. Should reconnect: ${shouldReconnect}`,
          'WARNING',
          'BOT'
        );

        if (statusCode === DisconnectReason.loggedOut && !this.isPairingMode) {
          this.clearAuth();
        } else if (shouldReconnect && db.getSettings().autoReconnect) {
          this.handleAutoReconnect();
        }
      }
    });

    // Handle incoming messages
    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        await this.processIncomingMessage(msg);
      }
    });

    // Handle message updates
    this.sock.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        await this.processMessageUpdate(update);
      }
    });

    // Handle contacts
    this.sock.ev.on('contacts.upsert', (contacts) => {
      contacts.forEach((c) => {
        if (c.id) {
          db.upsertContact({
            id: c.id,
            name: c.name || c.notify || c.verifiedName || c.id.split('@')[0],
            notifyName: c.notify,
            phoneNumber: c.id.split('@')[0],
          });
        }
      });
    });

    // Handle groups
    this.sock.ev.on('groups.upsert', (groups) => {
      groups.forEach((g) => {
        db.upsertGroup({
          id: g.id,
          subject: g.subject,
          description: g.desc,
          owner: g.owner,
          memberCount: g.participants?.length || 0,
          members: (g.participants || []).map((p) => ({
            id: p.id,
            admin: p.admin as any,
          })),
        });
      });
    });
  }

  public async connect(usePairingCodePhone?: string): Promise<void> {
    if (usePairingCodePhone) {
      await this.requestPairingCode(usePairingCodePhone);
      return;
    }
    if (this.isConnecting) return;
    this.isConnecting = true;
    this.isPairingMode = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      db.updateSession({
        status: 'connecting',
        reconnectStatus: 'Initializing WhatsApp Web Socket...',
      });
      realtime.broadcast('connection:update', db.getSession());

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners('connection.update');
          this.sock.ev.removeAllListeners('messages.upsert');
          this.sock.end(undefined);
        } catch (_) {}
        this.sock = null;
      }

      this.sock = makeWASocket({
        version,
        logger,
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
      });

      this.sock.ev.on('creds.update', saveCreds);
      this.attachSocketListeners(version);
    } catch (err: any) {
      console.error('WhatsApp socket error:', err);
      db.updateSession({
        status: 'disconnected',
        reconnectStatus: `Error: ${err.message}`,
      });
      realtime.broadcast('connection:update', db.getSession());
      db.addLog('WhatsApp Connect Exception', err.message, 'ERROR');
    } finally {
      this.isConnecting = false;
    }
  }

  public async requestPairingCode(phoneNumber: string): Promise<string> {
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('08')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone;
    }

    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error('Nomor WhatsApp tidak valid. Masukkan nomor dengan format misal 6289519450908 atau 089519450908');
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.qrTimeoutTimer) {
      clearTimeout(this.qrTimeoutTimer);
      this.qrTimeoutTimer = null;
    }

    this.isPairingMode = true;
    this.isConnecting = false;

    // Safely close existing socket before starting clean pairing socket
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.ev.removeAllListeners('messages.upsert');
        this.sock.ev.removeAllListeners('messages.update');
        this.sock.end(undefined);
      } catch (_) {}
      this.sock = null;
    }

    db.updateSession({
      status: 'connecting',
      pairingCode: undefined,
      qrCode: undefined,
      reconnectStatus: `Menghubungkan ke server WhatsApp untuk nomor +${cleanPhone}...`,
    });
    realtime.broadcast('connection:update', db.getSession());

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    if (state.creds.registered) {
      this.isPairingMode = false;
      const currentSession = db.getSession();
      throw new Error(`Sesi WhatsApp untuk akun ${currentSession.accountName || currentSession.phoneNumber || 'ini'} sudah terdaftar dan terhubung. Silakan klik tombol 'Logout' terlebih dahulu jika Anda ingin menautkan akun/nomor WhatsApp baru.`);
    }

    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: false,
      browser: ['Chrome (Linux)', 'Chrome', '131.0.6778.86'],
      markOnlineOnConnect: true,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    this.sock.ev.on('creds.update', saveCreds);
    this.attachSocketListeners(version);

    let code = '';
    let lastError: any = null;

    // Retry with brief wait to ensure socket handshake is established
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, attempt === 1 ? 3500 : 2500));
        if (!this.sock) {
          throw new Error('Koneksi tertutup sebelum kode pairing dapat diambil');
        }
        code = await this.sock.requestPairingCode(cleanPhone);
        if (code) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Pairing code attempt #${attempt} error:`, err.message);
        if (attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (!code) {
      this.isPairingMode = false;
      const errMsg = lastError?.message || 'Koneksi tertutup oleh server WhatsApp saat meminta pairing';
      db.updateSession({
        status: 'disconnected',
        reconnectStatus: `Gagal meminta pairing: ${errMsg}`,
      });
      realtime.broadcast('connection:update', db.getSession());
      throw new Error(
        errMsg.includes('Connection Closed')
          ? 'Server WhatsApp menutup koneksi sementara saat meminta kode pairing. Silakan coba lagi dalam beberapa detik, atau gunakan opsi Scan QR Code.'
          : errMsg
      );
    }

    const formattedCode =
      code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

    db.updateSession({
      pairingCode: formattedCode,
      status: 'waiting_qr',
      reconnectStatus: `Kode pairing aktif: ${formattedCode}. Masukkan di WhatsApp HP Anda.`,
    });
    realtime.broadcast('connection:update', db.getSession());
    db.addLog('Pairing Code Ready', `Kode pairing: ${formattedCode} untuk nomor +${cleanPhone}`, 'INFO', 'BOT');

    return formattedCode;
  }

  private handleAutoReconnect() {
    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      db.updateSession({
        reconnectStatus: 'Max reconnect attempts reached. Please connect manually.',
      });
      realtime.broadcast('connection:update', db.getSession());
      return;
    }

    const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    db.updateSession({
      reconnectStatus: `Reconnecting in ${backoffMs / 1000}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
    });
    realtime.broadcast('connection:update', db.getSession());

    setTimeout(() => {
      this.connect();
    }, backoffMs);
  }

  private unwrapMessage(msgContent: any): { unwrapped: any; isViewOnce: boolean } {
    let isViewOnce = false;
    let current = msgContent;

    for (let depth = 0; depth < 10; depth++) {
      if (!current || typeof current !== 'object') break;

      // Handle deviceSentMessage (sent from own phone)
      if (current.deviceSentMessage?.message) {
        current = current.deviceSentMessage.message;
        continue;
      }
      // Handle ephemeralMessage (disappearing messages)
      if (current.ephemeralMessage?.message) {
        current = current.ephemeralMessage.message;
        continue;
      }
      // Handle documentWithCaptionMessage
      if (current.documentWithCaptionMessage?.message) {
        current = current.documentWithCaptionMessage.message;
        continue;
      }
      // Handle View Once V1
      if (current.viewOnceMessage?.message) {
        isViewOnce = true;
        current = current.viewOnceMessage.message;
        continue;
      }
      // Handle View Once V2
      if (current.viewOnceMessageV2?.message) {
        isViewOnce = true;
        current = current.viewOnceMessageV2.message;
        continue;
      }
      // Handle View Once V2 Extension
      if (current.viewOnceMessageV2Extension?.message) {
        isViewOnce = true;
        current = current.viewOnceMessageV2Extension.message;
        continue;
      }
      // Handle edited messages
      if (current.editedMessage?.message?.protocolMessage?.editedMessage) {
        current = current.editedMessage.message.protocolMessage.editedMessage;
        continue;
      }
      break;
    }

    // Also check if inner media item has viewOnce flag
    if (
      current?.imageMessage?.viewOnce ||
      current?.videoMessage?.viewOnce ||
      current?.audioMessage?.viewOnce
    ) {
      isViewOnce = true;
    }

    return { unwrapped: current || msgContent, isViewOnce };
  }

  private async processIncomingMessage(msg: WAMessage) {
    if (!msg.key || !msg.message) return;

    const messageId = msg.key.id;
    if (!messageId) return;

    const remoteJid = msg.key.remoteJid;
    if (!remoteJid) return;

    const fromMe = Boolean(msg.key.fromMe);
    const isGroup = remoteJid.endsWith('@g.us');
    const isStatus = remoteJid === 'status@broadcast';

    const session = db.getSession();
    const myPhone = session.phoneNumber || 'Me';
    const myName = session.accountName || 'Saya (Me)';

    const senderJid = fromMe
      ? (myPhone.includes('@') ? myPhone : `${myPhone}@s.whatsapp.net`)
      : (msg.key.participant || remoteJid);
    const senderPhone = fromMe ? myPhone.replace(/[^0-9]/g, '') : senderJid.split('@')[0];
    const senderName = fromMe ? myName : (msg.pushName || senderPhone || 'Unknown');

    // 1. Check if it's a Status Broadcast (Status WhatsApp)
    if (isStatus) {
      await this.processStatusMessage(msg, senderJid, senderPhone, senderName);
      return;
    }

    // 2. Identify message type and content with full recursive unwrapping
    const { unwrapped, isViewOnce } = this.unwrapMessage(msg.message);
    const msgContent = unwrapped;

    let messageType: MessageType = 'text';
    let textContent = '';
    let mimeType = '';
    let fileName = '';

    if (msgContent?.imageMessage) {
      messageType = 'image';
      textContent = msgContent.imageMessage.caption || '';
      mimeType = msgContent.imageMessage.mimetype || 'image/jpeg';
    } else if (msgContent?.videoMessage) {
      messageType = 'video';
      textContent = msgContent.videoMessage.caption || '';
      mimeType = msgContent.videoMessage.mimetype || 'video/mp4';
    } else if (msgContent?.audioMessage) {
      messageType = msgContent.audioMessage.ptt ? 'voice' : 'audio';
      mimeType = msgContent.audioMessage.mimetype || 'audio/ogg';
    } else if (msgContent?.documentMessage) {
      messageType = 'document';
      textContent = msgContent.documentMessage.caption || '';
      fileName = msgContent.documentMessage.fileName || 'document';
      mimeType = msgContent.documentMessage.mimetype || 'application/pdf';
    } else if (msgContent?.stickerMessage) {
      messageType = 'sticker';
      mimeType = msgContent.stickerMessage.mimetype || 'image/webp';
    } else if (msgContent?.conversation) {
      messageType = 'text';
      textContent = msgContent.conversation;
    } else if (msgContent?.extendedTextMessage) {
      messageType = 'text';
      textContent = msgContent.extendedTextMessage.text || '';
    } else if (msgContent?.locationMessage) {
      messageType = 'location';
      textContent = `Location: ${msgContent.locationMessage.degreesLatitude}, ${msgContent.locationMessage.degreesLongitude}`;
    } else if (msgContent?.contactMessage) {
      messageType = 'contact';
      textContent = `Contact: ${msgContent.contactMessage.displayName}`;
    } else if (msgContent?.reactionMessage) {
      messageType = 'reaction';
      textContent = msgContent.reactionMessage.text || '';
    } else if (msgContent?.pollCreationMessage) {
      messageType = 'poll';
      textContent = `Poll: ${msgContent.pollCreationMessage.name}`;
    }

    // Check quoted / reply message
    let quotedMessageId: string | undefined;
    let quotedText: string | undefined;
    const contextInfo =
      msgContent?.extendedTextMessage?.contextInfo ||
      msgContent?.imageMessage?.contextInfo ||
      msgContent?.videoMessage?.contextInfo ||
      msgContent?.documentMessage?.contextInfo;

    if (contextInfo) {
      quotedMessageId = contextInfo.stanzaId || undefined;
      if (contextInfo.quotedMessage?.conversation) {
        quotedText = contextInfo.quotedMessage.conversation || undefined;
      } else if (contextInfo.quotedMessage?.extendedTextMessage?.text) {
        quotedText = contextInfo.quotedMessage.extendedTextMessage.text || undefined;
      }
    }

    const timestamp = msg.messageTimestamp
      ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString();

    const chatName = isGroup ? (db.getGroup(remoteJid)?.subject || remoteJid) : (fromMe ? (remoteJid.split('@')[0]) : senderName);

    // Check if media download is needed
    let savedMediaPath: string | undefined;
    let savedMediaId: string | undefined;
    let savedFileSize: number | undefined;

    const isMedia = ['image', 'video', 'audio', 'voice', 'document', 'sticker'].includes(messageType) || isViewOnce;

    if (isMedia) {
      const mediaTypeArg =
        messageType === 'image'
          ? 'photo'
          : messageType === 'video'
            ? 'video'
            : messageType === 'audio' || messageType === 'voice'
              ? 'audio'
              : messageType === 'document'
                ? 'document'
                : 'sticker';

      // Provide normalized message to Baileys so deviceSentMessage does not cause Boom rejection
      const normalizedMsg: WAMessage = {
        ...msg,
        message: msgContent,
      };

      const mediaRecord = await mediaService.processAndSaveMedia(normalizedMsg, mediaTypeArg, {
        messageId,
        chatId: remoteJid,
        chatName,
        senderId: senderJid,
        senderName,
        isViewOnce,
        isStatus: false,
        caption: textContent,
      });

      if (mediaRecord) {
        savedMediaId = mediaRecord.id;
        savedMediaPath = mediaRecord.filePath;
        savedFileSize = mediaRecord.fileSize;
      }
    }

    const savedMsg: Message = {
      id: messageId,
      chatId: remoteJid,
      senderId: senderJid,
      senderName,
      fromMe,
      timestamp,
      messageType,
      textContent,
      mediaId: savedMediaId,
      mediaPath: savedMediaPath,
      mimeType,
      fileSize: savedFileSize,
      fileName,
      isDeleted: false,
      isViewOnce,
      quotedMessageId,
      quotedText,
      status: fromMe ? 'sent' : 'received',
    };

    db.upsertMessage(savedMsg);

    // Broadcast new message event to dashboard
    realtime.broadcast('message:new', savedMsg);

    if (!fromMe) {
      db.addNotification({
        type: 'new_message',
        title: `Pesan baru dari ${senderName}`,
        message: textContent || (isViewOnce ? '📷 Media Sekali Lihat' : `[${messageType}]`),
        referenceId: messageId,
      });
    }
  }

  // Handle WhatsApp Status (Stories)
  private async processStatusMessage(msg: WAMessage, senderJid: string, senderPhone: string, senderName: string) {
    const settings = db.getSettings();
    if (!settings.autoSaveStatus && !settings.autoSaveEverything) return;

    const messageId = msg.key.id || crypto.randomUUID();
    const { unwrapped } = this.unwrapMessage(msg.message);
    const msgContent = unwrapped;
    if (!msgContent) return;

    let mediaType: 'photo' | 'video' | 'text' = 'text';
    let caption = '';

    if (msgContent.imageMessage) {
      mediaType = 'photo';
      caption = msgContent.imageMessage.caption || '';
    } else if (msgContent.videoMessage) {
      mediaType = 'video';
      caption = msgContent.videoMessage.caption || '';
    } else if (msgContent.extendedTextMessage || msgContent.conversation) {
      mediaType = 'text';
      caption = msgContent.extendedTextMessage?.text || msgContent.conversation || '';
    }

    let mediaPath: string | undefined;
    let fileSize = 0;

    if (mediaType !== 'text') {
      const normalizedMsg: WAMessage = {
        ...msg,
        message: msgContent,
      };

      const mediaItem = await mediaService.processAndSaveMedia(
        normalizedMsg,
        mediaType === 'photo' ? 'photo' : 'video',
        {
          messageId,
          chatId: 'status@broadcast',
          chatName: 'Status WhatsApp',
          senderId: senderJid,
          senderName,
          isViewOnce: false,
          isStatus: true,
          caption,
        }
      );
      if (mediaItem) {
        mediaPath = mediaItem.filePath;
        fileSize = mediaItem.fileSize;
      }
    }

    const statusItem: WhatsAppStatusItem = {
      id: messageId,
      senderId: senderJid,
      senderName,
      senderPhone,
      mediaType,
      mediaPath,
      caption,
      timestamp: msg.messageTimestamp
        ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString(),
      savedAt: new Date().toISOString(),
      downloadStatus: mediaPath ? 'SAVED' : mediaType === 'text' ? 'SAVED' : 'PROCESSING',
      fileSize,
    };

    db.upsertStatus(statusItem);
    realtime.broadcast('status:new', statusItem);

    db.addNotification({
      type: 'new_status',
      title: '🌟 Status Baru Terdeteksi',
      message: `Status baru dari ${senderName} (${mediaType}) otomatis tersimpan!`,
      referenceId: messageId,
    });
    db.addLog('Status Saved', `Saved status from ${senderName} (${mediaType})`, 'INFO', 'BOT');
  }

  // Handle message updates / Revocations (Anti-Delete)
  private async processMessageUpdate(update: any) {
    const key = update.key;
    if (!key || !key.id) return;

    const messageId = key.id;

    // Check if this update indicates a deletion/revoke
    // In Baileys, revokes are either update.update?.messageStubType === WAMessageStubType.REVOKE
    // or update.update?.message?.protocolMessage?.type === 0 (REVOKE)
    const isRevoke =
      update.update?.messageStubType === 1 || // REVOKE stub
      update.update?.message?.protocolMessage?.type === 0 ||
      update.message?.protocolMessage?.type === 0;

    if (isRevoke) {
      const deletedItem = db.markMessageDeleted(messageId);
      if (deletedItem) {
        realtime.broadcast('message:deleted', deletedItem);
        db.addNotification({
          type: 'deleted_message',
          title: '⚠️ Pesan Dihapus Terdeteksi!',
          message: `Pesan dari ${deletedItem.senderName} (${deletedItem.chatName}) telah dihapus pengirim, arsip tersimpan!`,
          referenceId: deletedItem.id,
        });
        db.addLog(
          'Deleted Message Captured',
          `Captured deleted message ID ${messageId} from ${deletedItem.senderName}`,
          'WARNING',
          'BOT'
        );
      }
    }
  }

  // --- Actions ---
  public async sendTextMessage(jid: string, text: string, quotedMessageId?: string): Promise<Message | null> {
    if (!this.sock || db.getSession().status !== 'connected') {
      throw new Error('WhatsApp bot is not connected');
    }

    let quoted: any = undefined;
    if (quotedMessageId) {
      const original = db.getMessage(quotedMessageId);
      if (original) {
        quoted = {
          key: { id: quotedMessageId, remoteJid: jid, fromMe: original.fromMe },
          message: { conversation: original.textContent || '' },
        };
      }
    }

    const sent = await this.sock.sendMessage(jid, { text }, { quoted });
    if (!sent || !sent.key.id) return null;

    const outMsg: Message = {
      id: sent.key.id,
      chatId: jid,
      senderId: this.sock.user?.id || 'me',
      senderName: 'You',
      fromMe: true,
      timestamp: new Date().toISOString(),
      messageType: 'text',
      textContent: text,
      isDeleted: false,
      isViewOnce: false,
      quotedMessageId,
      status: 'sent',
    };

    db.upsertMessage(outMsg);
    realtime.broadcast('message:new', outMsg);
    db.addLog('Message Sent', `Sent text to ${jid}`, 'INFO', 'USER');
    return outMsg;
  }

  public async sendMediaMessage(
    jid: string,
    fileBuffer: Buffer,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    opts: { caption?: string; fileName?: string; quotedMessageId?: string }
  ): Promise<Message | null> {
    if (!this.sock || db.getSession().status !== 'connected') {
      throw new Error('WhatsApp bot is not connected');
    }

    let messagePayload: any = {};
    if (mediaType === 'image') {
      messagePayload = { image: fileBuffer, caption: opts.caption };
    } else if (mediaType === 'video') {
      messagePayload = { video: fileBuffer, caption: opts.caption };
    } else if (mediaType === 'audio') {
      messagePayload = { audio: fileBuffer, mimetype: 'audio/mp4' };
    } else if (mediaType === 'document') {
      messagePayload = {
        document: fileBuffer,
        mimetype: 'application/octet-stream',
        fileName: opts.fileName || 'file',
        caption: opts.caption,
      };
    }

    const sent = await this.sock.sendMessage(jid, messagePayload);
    if (!sent || !sent.key.id) return null;

    // Save media to disk
    const ext = mediaType === 'image' ? '.jpg' : mediaType === 'video' ? '.mp4' : mediaType === 'audio' ? '.mp3' : '.bin';
    const cleanFileName = `sent_${Date.now()}${ext}`;
    const targetFolder = mediaService.getSubdir(mediaType === 'image' ? 'photo' : mediaType, false, false);
    const fullPath = path.join(targetFolder, cleanFileName);
    await fs.promises.writeFile(fullPath, fileBuffer);

    const relativePath = path.relative(process.cwd(), fullPath);

    const outMsg: Message = {
      id: sent.key.id,
      chatId: jid,
      senderId: this.sock.user?.id || 'me',
      senderName: 'You',
      fromMe: true,
      timestamp: new Date().toISOString(),
      messageType: mediaType,
      textContent: opts.caption,
      mediaPath: relativePath,
      fileSize: fileBuffer.length,
      fileName: opts.fileName || cleanFileName,
      isDeleted: false,
      isViewOnce: false,
      quotedMessageId: opts.quotedMessageId,
      status: 'sent',
    };

    db.upsertMessage(outMsg);
    realtime.broadcast('message:new', outMsg);
    db.addLog('Media Sent', `Sent ${mediaType} to ${jid}`, 'INFO', 'USER');
    return outMsg;
  }

  public async disconnect(): Promise<void> {
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch (_) {}
      this.sock = null;
    }
    db.updateSession({
      status: 'disconnected',
      reconnectStatus: 'Disconnected by user.',
      qrCode: undefined,
    });
    realtime.broadcast('connection:update', db.getSession());
    db.addLog('WhatsApp Disconnect', 'User triggered disconnect', 'INFO', 'USER');
  }

  public async reconnect(): Promise<void> {
    await this.disconnect();
    this.reconnectAttempts = 0;
    await this.connect();
  }

  public async logout(): Promise<void> {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (_) {}
      this.sock = null;
    }
    this.clearAuth();
    db.updateSession({
      status: 'disconnected',
      phoneNumber: undefined,
      accountName: undefined,
      profilePicUrl: undefined,
      uptimeStarted: undefined,
      reconnectStatus: 'Logged out. Session cleared.',
      qrCode: undefined,
      pairingCode: undefined,
    });
    realtime.broadcast('connection:update', db.getSession());
    db.addLog('WhatsApp Logout', 'Logged out and session cleared', 'INFO', 'USER');
  }

  private clearAuth() {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to clear auth dir:', err);
    }
  }

  public getBotUptime(): string {
    if (!this.uptimeStarted) return 'Not running';
    const diff = Date.now() - new Date(this.uptimeStarted).getTime();
    const secs = Math.floor(diff / 1000) % 60;
    const mins = Math.floor(diff / (1000 * 60)) % 60;
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days > 0 ? days + 'd ' : ''}${hours}h ${mins}m ${secs}s`;
  }
}

export const waBot = new WhatsAppBotService();
