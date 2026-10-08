import React, { useState } from 'react';
import {
  ShieldAlert,
  Trash2,
  Lock,
  HardDrive,
  Database,
  CheckCircle2,
  AlertTriangle,
  FolderLock,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const PrivacyPage: React.FC = () => {
  const [confirmStep1, setConfirmStep1] = useState(false);
  const [confirmStep2, setConfirmStep2] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);

  const handlePurgeAllData = async () => {
    setPurging(true);
    try {
      await apiFetch('/api/storage/delete-all', { method: 'POST' });
      setPurgeSuccess(true);
    } catch (err: any) {
      alert(`Gagal menghapus data: ${err.message}`);
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <FolderLock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Privacy & Data Governance</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Kebijakan penyimpanan data lokal, enkripsi sesi, dan kontrol privasi data pemilik akun.
            </p>
          </div>
        </div>
      </div>

      {purgeSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Seluruh data percakapan, media, dan status lokal berhasil dihapus secara permanen.</span>
        </div>
      )}

      {/* Privacy Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
            <Database className="w-4 h-4 text-emerald-500" />
            <span>Data Yang Disimpan</span>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Pesan teks, metadata pengirim, stempel waktu, informasi grup, kontak, status WhatsApp, dan riwayat revisi pesan ditarik (Anti-Delete) disimpan di direktori lokal server.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
            <HardDrive className="w-4 h-4 text-blue-500" />
            <span>Lokasi Media Storage</span>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Semua file foto, video, audio, dan view once disimpan pada folder lokal <code>data/media/</code> di server host Anda, tidak pernah diunggah ke pihak ketiga.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
            <Lock className="w-4 h-4 text-purple-500" />
            <span>Keamanan Kredensial & Sesi</span>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Kunci sesi WhatsApp Multi-Device (Noise Protocol & Signal Protocol) disimpan di <code>data/auth_info_baileys/</code> dan tidak pernah diekspos secara mentah ke frontend.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Otorisasi Penggunaan</span>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Aplikasi ini hanya boleh digunakan untuk akun WhatsApp yang Anda miliki secara sah atau telah memperoleh izin eksplisit dari pemilik akun yang bersangkutan.
          </p>
        </div>
      </div>

      {/* Danger Zone: Delete All Data */}
      <div className="p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/10 shadow-xs space-y-4">
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h3 className="font-bold text-sm">Zona Bahaya: Hapus Seluruh Data Tersimpan</h3>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Tindakan ini akan menghapus secara permanen seluruh histori percakapan, kontak, grup, file media, status, dan arsip anti-delete dari server. Kredensial login WhatsApp tetap dipertahankan.
        </p>

        <button
          onClick={() => setConfirmStep1(true)}
          disabled={purging}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>{purging ? 'Menghapus Seluruh Data...' : 'Delete All Stored Data'}</span>
        </button>
      </div>

      {/* Confirmation Step 1 */}
      <ConfirmationModal
        isOpen={confirmStep1}
        title="Langkah 1: Konfirmasi Penghapusan Total"
        message="Apakah Anda benar-benar yakin ingin menghapus SEMUA pesan dan file media di server ini?"
        confirmLabel="Lanjutkan ke Konfirmasi Akhir"
        isDangerous={true}
        onConfirm={() => {
          setConfirmStep1(false);
          setConfirmStep2(true);
        }}
        onCancel={() => setConfirmStep1(false)}
      />

      {/* Confirmation Step 2 (Double-layered confirmation) */}
      <ConfirmationModal
        isOpen={confirmStep2}
        title="Langkah 2: PERINGATAN TERAKHIR"
        message="Semua file foto, video, voice note, arsip anti-delete, dan view once akan DIHAPUS PERMANEN dari disk server dan TIDAK DAPAT DIPULIHKAN. Lanjutkan?"
        confirmLabel="Ya, Hapus Semua Secara Permanen"
        isDangerous={true}
        onConfirm={async () => {
          setConfirmStep2(false);
          await handlePurgeAllData();
        }}
        onCancel={() => setConfirmStep2(false)}
      />
    </div>
  );
};
