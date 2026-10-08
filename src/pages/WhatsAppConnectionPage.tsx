import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  LogOut,
  Power,
  Zap,
  Clock,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { apiFetch } from '../utils/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const WhatsAppConnectionPage: React.FC = () => {
  const { session, refreshSession } = useWebSocket();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  const [activeTab, setActiveTab] = useState<'qr' | 'pairing'>('qr');
  const [actionLoading, setActionLoading] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingCodeDisplay, setPairingCodeDisplay] = useState<string | null>(null);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      await apiFetch('/api/whatsapp/connect', { method: 'POST' });
      await refreshSession();
    } catch (err: any) {
      alert(`Gagal menghubungkan: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    try {
      await apiFetch('/api/whatsapp/disconnect', { method: 'POST' });
      await refreshSession();
    } catch (err: any) {
      alert(`Gagal memutus koneksi: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconnect = async () => {
    setActionLoading(true);
    try {
      await apiFetch('/api/whatsapp/reconnect', { method: 'POST' });
      await refreshSession();
    } catch (err: any) {
      alert(`Gagal reconnect: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setActionLoading(true);
    try {
      await apiFetch('/api/whatsapp/logout', { method: 'POST' });
      await refreshSession();
    } catch (err: any) {
      alert(`Gagal logout: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setPairingLoading(true);
    setPairingError(null);
    try {
      const res = await apiFetch<{ success: boolean; pairingCode?: string; session?: any }>('/api/whatsapp/pairing-code', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });
      if (res.pairingCode) {
        setPairingCodeDisplay(res.pairingCode);
      }
      await refreshSession();
    } catch (err: any) {
      setPairingError(err.message || 'Gagal meminta kode pairing. Pastikan nomor diawali kode negara.');
    } finally {
      setPairingLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConnected = session?.status === 'connected';

  const getStatusDisplay = () => {
    switch (session?.status) {
      case 'connected':
        return {
          label: 'Terhubung',
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          icon: CheckCircle2,
          desc: 'Bot sedang aktif dan memantau seluruh percakapan secara realtime.',
        };
      case 'connecting':
        return {
          label: 'Sedang Menghubungkan',
          color: 'text-amber-500',
          bg: 'bg-amber-500/10 border-amber-500/20',
          icon: RefreshCw,
          desc: 'Membuat koneksi WebSocket multi-device ke server WhatsApp...',
        };
      case 'qr_ready':
        return {
          label: 'QR Tersedia',
          color: 'text-blue-500',
          bg: 'bg-blue-500/10 border-blue-500/20',
          icon: QrCode,
          desc: 'Pindai QR code di bawah menggunakan aplikasi WhatsApp Anda.',
        };
      case 'qr_expired':
        return {
          label: 'QR Kedaluwarsa',
          color: 'text-amber-500',
          bg: 'bg-amber-500/10 border-amber-500/20',
          icon: AlertTriangle,
          desc: 'QR Code telah kedaluwarsa. Klik "Muat Ulang QR" untuk membuat baru.',
        };
      case 'auth_failure':
        return {
          label: 'Login Gagal',
          color: 'text-rose-500',
          bg: 'bg-rose-500/10 border-rose-500/20',
          icon: XCircle,
          desc: 'Autentikasi sesi ditolak atau dicabut dari perangkat utama.',
        };
      case 'waiting_qr':
        return {
          label: 'Menunggu QR',
          color: 'text-zinc-500',
          bg: 'bg-zinc-500/10 border-zinc-500/20',
          icon: Clock,
          desc: 'Menyiapkan handshake enkripsi...',
        };
      default:
        return {
          label: 'Terputus',
          color: 'text-zinc-500',
          bg: 'bg-zinc-500/10 border-zinc-500/20',
          icon: Power,
          desc: 'Bot tidak terhubung ke akun WhatsApp saat ini.',
        };
    }
  };

  const statusInfo = getStatusDisplay();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">WhatsApp Connection Hub</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Hubungkan akun WhatsApp dengan QR Code atau Pairing Code 8 digit (Multi-Device API).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Power className="w-4 h-4" />
              <span>Connect</span>
            </button>
          ) : (
            <>
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: 'Putus Koneksi WhatsApp',
                    message: 'Apakah Anda yakin ingin memutus koneksi bot WhatsApp sementara?',
                    action: handleDisconnect,
                  })
                }
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
              >
                <Power className="w-4 h-4 text-amber-500" />
                <span>Disconnect</span>
              </button>

              <button
                onClick={handleReconnect}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-blue-500" />
                <span>Reconnect</span>
              </button>

              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: 'Logout WhatsApp Session',
                    message:
                      'Keluar akan menghapus kredensial sesi lokal. Anda harus memindai QR ulang untuk terhubung kembali.',
                    action: handleLogout,
                  })
                }
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </>
          )}

          <button
            onClick={() => refreshSession()}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title="Refresh Session Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: Connection Interface (QR / Pairing Code) */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Status Indicator Bar */}
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${statusInfo.bg} mb-6`}>
              <StatusIcon className={`w-5 h-5 ${statusInfo.color} shrink-0`} />
              <div>
                <div className={`font-semibold text-xs ${statusInfo.color}`}>
                  Status: {statusInfo.label}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {session?.reconnectStatus || statusInfo.desc}
                </div>
              </div>
            </div>

            {/* If Connected: Show Active Profile Banner */}
            {isConnected ? (
              <div className="text-center py-8 space-y-4">
                <div className="relative inline-block">
                  {session?.profilePicUrl ? (
                    <img
                      src={session.profilePicUrl}
                      alt="Profile"
                      className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-emerald-500 shadow-xl"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full mx-auto bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-3xl border-4 border-emerald-500 shadow-xl">
                      WA
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                    {session?.accountName || 'WhatsApp User'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    +{session?.phoneNumber || 'Akun Terhubung'}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sesi Multi-Device Aktif & Auto-Save Berjalan</span>
                </div>
              </div>
            ) : (
              <div>
                {/* Method selector tabs */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
                  <button
                    onClick={() => setActiveTab('qr')}
                    className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'qr'
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan QR Code</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('pairing')}
                    className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'pairing'
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pairing Code (OTP)</span>
                  </button>
                </div>

                {/* QR Code Tab View */}
                {activeTab === 'qr' && (
                  <div className="flex flex-col items-center justify-center p-4">
                    {session?.qrCode ? (
                      <div className="p-4 bg-white rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700">
                        <img src={session.qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                      </div>
                    ) : (
                      <div className="w-64 h-64 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                        <QrCode className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-600 animate-pulse" />
                        <span className="text-xs font-medium">
                          {session?.status === 'connecting'
                            ? 'Menghasilkan QR Code...'
                            : 'Klik "Connect" untuk memuat QR Code'}
                        </span>
                      </div>
                    )}

                    <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400 max-w-sm space-y-1">
                      <p className="font-semibold text-zinc-700 dark:text-zinc-300">Cara Menghubungkan:</p>
                      <p>1. Buka aplikasi WhatsApp di HP Anda</p>
                      <p>2. Tekan menu Titik Tiga (Android) atau Pengaturan (iOS)</p>
                      <p>3. Pilih <b>Perangkat Tertaut (Linked Devices)</b> &gt; <b>Tautkan Perangkat</b></p>
                      <p>4. Arahkan kamera HP ke QR Code di atas</p>
                    </div>

                    <button
                      onClick={handleConnect}
                      className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Muat Ulang QR
                    </button>
                  </div>
                )}

                {/* Pairing Code Tab View */}
                {activeTab === 'pairing' && (
                  <div className="p-4 space-y-6">
                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Koneksi Resmi WhatsApp Pairing Code</span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        Kode yang dihasilkan adalah <b>kode resmi 8 karakter</b> dari protokol WhatsApp Web (bukan kode palsu/acak). Di HP Anda, pilih menu <i>Perangkat Tertaut &gt; Tautkan Perangkat &gt; Tautkan dengan nomor telepon saja</i>.
                      </p>
                    </div>

                    <form onSubmit={handleRequestPairingCode} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Nomor WhatsApp (diawali kode negara 62..., tanpa tanda +)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Contoh: 6289519450908 atau 089519450908"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="submit"
                            disabled={pairingLoading || !phoneNumber.trim()}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                            <span>{pairingLoading ? 'Menghubungkan...' : 'Minta Kode Pairing'}</span>
                          </button>
                        </div>
                      </div>
                    </form>

                    {pairingError && (
                      <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{pairingError}</span>
                      </div>
                    )}

                    {(pairingCodeDisplay || session?.pairingCode) && (
                      <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                          Kode Pairing Anda:
                        </div>
                        <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-zinc-900 dark:text-white select-all">
                          {pairingCodeDisplay || session?.pairingCode}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(pairingCodeDisplay || session?.pairingCode!)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors shadow-xs"
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Tersalin ke Clipboard' : 'Salin Kode'}</span>
                        </button>

                        <div className="text-left mt-4 p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs">
                          <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-emerald-500" />
                            <span>Cara Memasukkan Kode di HP:</span>
                          </div>
                          <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                            <li>Buka WhatsApp di HP &gt; menu Titik Tiga (Android) / Pengaturan (iOS).</li>
                            <li>Pilih <b>Perangkat Tertaut (Linked Devices)</b> &gt; <b>Tautkan Perangkat</b>.</li>
                            <li>Pada layar pemindai kamera QR, ketuk link di bagian bawah: <b className="text-emerald-600 dark:text-emerald-400">"Tautkan dengan nomor telepon saja"</b>.</li>
                            <li>Ketik 8 karakter kode di atas. WhatsApp di HP akan otomatis menghubungkan sesi bot.</li>
                          </ol>
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-1 border-t border-zinc-100 dark:border-zinc-700">
                            ⚠️ Jangan klik "Minta Kode" ulang sebelum mencoba di HP, karena kode lama akan langsung dibatalkan oleh server WhatsApp.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Connection Metadata & Diagnostic Status */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">
              Connection Information
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Rincian metadata sesi multi-device WhatsApp
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400">Nomor WhatsApp</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                {session?.phoneNumber ? `+${session.phoneNumber}` : 'Belum Terhubung'}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400">Nama Akun</span>
              <span className="font-medium text-zinc-900 dark:text-white">
                {session?.accountName || '-'}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400">Status Koneksi</span>
              <span className={`font-semibold capitalize ${statusInfo.color}`}>{statusInfo.label}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400">Waktu Terakhir Aktif</span>
              <span className="text-zinc-900 dark:text-white">
                {session?.lastActive ? new Date(session.lastActive).toLocaleString() : '-'}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400">Bot Uptime</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                {session?.uptimeStarted ? new Date(session.uptimeStarted).toLocaleString() : 'Offline'}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400">Versi Koneksi Baileys</span>
              <span className="font-mono text-zinc-900 dark:text-white">
                v{session?.connectionVersion || '2.3000.x'} (Multi-Device)
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-zinc-500 dark:text-zinc-400">Penyimpanan Sesi</span>
              <span className="text-zinc-900 dark:text-white font-medium">
                data/auth_info_baileys/ (Multi-File)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Keamanan Sesi:</span>
            <p>
              Kredensial disimpan secara terenkripsi di server lokal. Bot akan otomatis melakukan reconnect ketika server restart tanpa perlu scan QR ulang.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={true}
        onConfirm={async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          await confirmModal.action();
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
