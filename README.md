# WhatsApp Bot Monitoring & Management Dashboard

Aplikasi pemantauan dan pengelolaan bot WhatsApp modern berbasis web dengan dukungan penuh **Auto Save All**, **View Once Recovery**, **Anti-Delete Archive**, **Status Downloader**, dan **Live Chat Management** secara real-time.

---

## 🌟 Fitur Utama

1. **WhatsApp Connection Hub**
   - **QR Code Realtime**: Tampilan QR code dengan status live (Menunggu QR, QR tersedia, QR kedaluwarsa, Menghubungkan, Terhubung, Terputus).
   - **Pairing Code (OTP)**: Alternatif menghubungkan WhatsApp menggunakan pairing code 8 digit langsung dengan nomor telepon.
   - **Informasi Sesi**: Nomor telepon, nama akun, foto profil, uptime bot, versi protokol Baileys, dan auto-reconnect.
   - **Multi-Device Session Persistence**: Sesi disimpan lokal di `data/auth_info_baileys/` sehingga tidak perlu scan ulang setiap server restart.

2. **Auto Save All Media & Messages**
   - Simpan otomatis: Pesan teks, foto, video, audio, voice note (PTT), dokumen/PDF, stiker, GIF, kontak, lokasi, replied message, dan reaction.
   - Konfigurasi granular per tipe media dengan toggle master "Auto Save Everything".

3. **Auto Save View Once (Media Sekali Lihat)**
   - Mendeteksi dan langsung mengamankan buffer foto, video, dan audio sekali lihat sebelum media kedaluwarsa atau hilang.
   - Brankas khusus View Once dengan filter tipe, pemutar video/audio, dan tombol download.

4. **Anti-Delete Message Vault (Deteksi Pesan Ditarik)**
   - Menyimpan salinan pesan asli saat pertama kali diterima.
   - Ketika pengirim menarik pesan ("Delete for Everyone"), sistem menandai pesan sebagai `DELETED` dengan bukti stempel waktu penghapusan tanpa menghapus konten asli dari server.

5. **WhatsApp Status (Stories) Downloader**
   - Memantau broadcast status WhatsApp dari kontak (`status@broadcast`).
   - Menyimpan foto, video, dan teks status dengan caption dan informasi kontak.

6. **Modern Web Chat Interface**
   - Tampilan interaktif WhatsApp Web modern dengan sidebar kategori (Semua, Pribadi, Grup, Diarsipkan, Belum Dibaca).
   - Kirim pesan teks dan upload media (foto, video, audio, dokumen) dengan quoted reply.
   - Banner visual untuk pesan yang telah dihapus oleh pengirim.

7. **Media Center & Storage Manager**
   - Galeri seluruh file media dengan pencarian, filter kategori, preview modal, dan bulk delete.
   - Pengaturan retensi data (selamanya, 7 hari, 30 hari, 90 hari) dan pembersihan disk.

8. **End-to-End Diagnostics Test Suite**
   - Uji verifikasi langsung: Integritas database, folder storage, koneksi Baileys, WebSocket broadcast, pipeline normal media, pipeline view once, anti-delete archiving, dan retry queue.

---

## 🚀 Panduan Menjalankan Aplikasi

### Kredensial Login Default
- **Username**: `admin`
- **Password**: `admin123`
*(Dapat diubah kapan saja di menu Settings > Keamanan Akun)*

### Menjalankan dalam Mode Pengembangan (Development)
```bash
# 1. Install dependencies
npm install

# 2. Jalankan full-stack dev server (Port 3000)
npm run dev
```

Buka browser di: `http://localhost:3000`

---

### Menjalankan dengan Docker & Docker Compose
```bash
# Build dan jalankan container
docker compose up -d --build

# Periksa log aplikasi
docker compose logs -f
```

---

## 📁 Struktur Direktori

```
├── data/                       # Penyimpanan lokal persistent
│   ├── auth_info_baileys/      # Kredensial sesi WhatsApp multi-device
│   ├── db/                     # Koleksi database file terindeks (JSON)
│   └── media/                  # File fisik foto, video, audio, view once
├── server/                     # Backend API & Services
│   ├── db/
│   │   ├── database.ts         # Storage engine atomik dengan in-memory index
│   │   └── schema.ts           # Tipe data & interface TypeScript
│   ├── routes/
│   │   └── api.ts              # Endpoint REST API Express
│   └── services/
│       ├── auth.ts             # Password hash & session tokens
│       ├── diagnostics.ts      # Suite pengujian diagnostik otomatis
│       ├── media.ts            # Media downloader & retry queue worker
│       ├── realtime.ts         # WebSocket server broadcast
│       └── whatsapp.ts         # WhatsApp Baileys socket integration
├── src/                        # Frontend React + Tailwind CSS
│   ├── components/             # Navbar, Sidebar, MediaModal, ConfirmationModal
│   ├── context/                # AuthContext, ThemeContext, WebSocketContext
│   ├── pages/                  # Halaman aplikasi dashboard
│   ├── types/                  # Tipe data TypeScript frontend
│   └── utils/                  # Helper API client & fetcher
├── server.ts                   # Entry point full-stack Express + Vite
├── package.json
└── vite.config.ts
```
