import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Lock,
  Smartphone,
  HardDrive,
  Bell,
  Sliders,
  EyeOff,
} from 'lucide-react';
import { AppSettings } from '../types';
import { apiFetch } from '../utils/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'autosave' | 'whatsapp' | 'storage' | 'notifications' | 'security'>(
    'autosave'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Security pass state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch<{ settings: AppSettings }>('/api/settings');
      setSettings(data.settings);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Gagal menyimpan pengaturan: ${err.message}`);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg({ text: 'Password berhasil diperbarui!', isError: false });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Gagal mengubah password', isError: true });
    }
  };

  if (loading || !settings) {
    return <div className="text-center py-20 text-xs text-zinc-400">Memuat konfigurasi...</div>;
  }

  const ToggleSwitch: React.FC<{ label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }> = ({
    label,
    desc,
    checked,
    onChange,
  }) => (
    <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
      <div>
        <div className="font-semibold text-xs text-zinc-900 dark:text-white">{label}</div>
        {desc && <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{desc}</div>}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
          checked ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">System Settings</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Konfigurasi aturan auto-save, manajemen sesi WhatsApp, retensi penyimpanan, dan keamanan akun.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Perubahan</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Pengaturan berhasil disimpan!</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold overflow-x-auto no-scrollbar">
        {[
          { id: 'autosave', label: 'Auto Save All', icon: Sliders },
          { id: 'whatsapp', label: 'WhatsApp Core', icon: Smartphone },
          { id: 'storage', label: 'Penyimpanan', icon: HardDrive },
          { id: 'notifications', label: 'Notifikasi', icon: Bell },
          { id: 'security', label: 'Keamanan Akun', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Auto Save Configs */}
      {activeTab === 'autosave' && (
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <ToggleSwitch
              label="🌟 Auto Save Everything (Simpan Seluruh Data)"
              desc="Jika aktif, semua jenis pesan, foto, video, voice note, dokumen, status, dan view once diproses otomatis."
              checked={settings.autoSaveEverything}
              onChange={(v) => setSettings({ ...settings, autoSaveEverything: v })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToggleSwitch
              label="Auto Save Messages (Pesan Teks)"
              checked={settings.autoSaveMessages}
              onChange={(v) => setSettings({ ...settings, autoSaveMessages: v })}
            />
            <ToggleSwitch
              label="Auto Save Photos (Foto Normal)"
              checked={settings.autoSavePhotos}
              onChange={(v) => setSettings({ ...settings, autoSavePhotos: v })}
            />
            <ToggleSwitch
              label="Auto Save Videos (Video)"
              checked={settings.autoSaveVideos}
              onChange={(v) => setSettings({ ...settings, autoSaveVideos: v })}
            />
            <ToggleSwitch
              label="Auto Save Audio & Voice Note"
              checked={settings.autoSaveAudio}
              onChange={(v) => setSettings({ ...settings, autoSaveAudio: v })}
            />
            <ToggleSwitch
              label="Auto Save Documents (Dokumen/PDF)"
              checked={settings.autoSaveDocuments}
              onChange={(v) => setSettings({ ...settings, autoSaveDocuments: v })}
            />
            <ToggleSwitch
              label="Auto Save Stickers"
              checked={settings.autoSaveStickers}
              onChange={(v) => setSettings({ ...settings, autoSaveStickers: v })}
            />
            <ToggleSwitch
              label="Auto Save Deleted Messages (Anti-Delete)"
              desc="Tetap pertahankan pesan di server jika pengirim menarik pesan"
              checked={settings.autoSaveDeletedMessages}
              onChange={(v) => setSettings({ ...settings, autoSaveDeletedMessages: v })}
            />
            <ToggleSwitch
              label="Auto Save Status (Cerita WhatsApp)"
              desc="Unduh otomatis status foto & video sebelum 24 jam lenyap"
              checked={settings.autoSaveStatus}
              onChange={(v) => setSettings({ ...settings, autoSaveStatus: v })}
            />
            <ToggleSwitch
              label="Auto Save Group Messages"
              checked={settings.autoSaveGroupMessages}
              onChange={(v) => setSettings({ ...settings, autoSaveGroupMessages: v })}
            />
            <ToggleSwitch
              label="Auto Save Private Messages"
              checked={settings.autoSavePrivateMessages}
              onChange={(v) => setSettings({ ...settings, autoSavePrivateMessages: v })}
            />
            <ToggleSwitch
              label="Auto Save Archived Chats"
              desc="Tetap pantau obrolan yang sedang diarsipkan"
              checked={settings.autoSaveArchivedChats}
              onChange={(v) => setSettings({ ...settings, autoSaveArchivedChats: v })}
            />
            <ToggleSwitch
              label="Auto Save Non-Archived Chats"
              checked={settings.autoSaveNonArchivedChats}
              onChange={(v) => setSettings({ ...settings, autoSaveNonArchivedChats: v })}
            />
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
            <h4 className="font-bold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <EyeOff className="w-4 h-4" />
              <span>Pengaturan Khusus View Once (Sekali Lihat)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ToggleSwitch
                label="Save All View Once (Semua Media 1x)"
                checked={settings.saveAllViewOnce}
                onChange={(v) => setSettings({ ...settings, saveAllViewOnce: v })}
              />
              <ToggleSwitch
                label="Save View Once Photos"
                checked={settings.saveViewOncePhotos}
                onChange={(v) => setSettings({ ...settings, saveViewOncePhotos: v })}
              />
              <ToggleSwitch
                label="Save View Once Videos"
                checked={settings.saveViewOnceVideos}
                onChange={(v) => setSettings({ ...settings, saveViewOnceVideos: v })}
              />
              <ToggleSwitch
                label="Save View Once Audio (Sekali Dengar)"
                checked={settings.saveViewOnceAudio}
                onChange={(v) => setSettings({ ...settings, saveViewOnceAudio: v })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: WhatsApp Settings */}
      {activeTab === 'whatsapp' && (
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
          <ToggleSwitch
            label="Auto Reconnect"
            desc="Otomatis sambungkan ulang bot dengan exponential backoff jika koneksi internet terputus"
            checked={settings.autoReconnect}
            onChange={(v) => setSettings({ ...settings, autoReconnect: v })}
          />
        </div>
      )}

      {/* Tab 3: Storage */}
      {activeTab === 'storage' && (
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-900 dark:text-white mb-1">Lokasi Penyimpanan Media</label>
            <input
              type="text"
              value={settings.storageLocation}
              disabled
              className="w-full px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono text-xs"
            />
          </div>

          <ToggleSwitch
            label="Auto Cleanup File Lama"
            desc="Jalankan pembersihan terjadwal untuk file yang melewati batas retensi"
            checked={settings.autoCleanup}
            onChange={(v) => setSettings({ ...settings, autoCleanup: v })}
          />
        </div>
      )}

      {/* Tab 4: Notifications */}
      {activeTab === 'notifications' && (
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <ToggleSwitch
            label="Aktifkan Seluruh Notifikasi"
            checked={settings.enableNotifications}
            onChange={(v) => setSettings({ ...settings, enableNotifications: v })}
          />
          <ToggleSwitch
            label="Notifikasi Pesan Dihapus (Anti-Delete)"
            checked={settings.notifyDeletedMessages}
            onChange={(v) => setSettings({ ...settings, notifyDeletedMessages: v })}
          />
          <ToggleSwitch
            label="Notifikasi Status Baru"
            checked={settings.notifyNewStatus}
            onChange={(v) => setSettings({ ...settings, notifyNewStatus: v })}
          />
          <ToggleSwitch
            label="Notifikasi Media View Once Tersimpan"
            checked={settings.notifyViewOnce}
            onChange={(v) => setSettings({ ...settings, notifyViewOnce: v })}
          />
          <ToggleSwitch
            label="Notifikasi Perubahan Status Koneksi"
            checked={settings.notifyConnection}
            onChange={(v) => setSettings({ ...settings, notifyConnection: v })}
          />
        </div>
      )}

      {/* Tab 5: Security */}
      {activeTab === 'security' && (
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Ganti Password Dashboard</h3>

          {passwordMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                passwordMsg.isError
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              }`}
            >
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
            <div>
              <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Password Saat Ini</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Password Baru (min. 6 karakter)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Ubah Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
