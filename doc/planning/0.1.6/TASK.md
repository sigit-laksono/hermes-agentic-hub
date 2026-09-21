# 📋 Actionable Tasks: Release v0.1.6
## Advanced Ecosystem: Usage Analytics, Messaging Onboarding & Voice AI

Dokumen task ini merupakan turunan teknis langsung dari [PRD.md](./PRD.md).

---

## 📊 Status Ringkasan Task

| ID Task | Judul Task | Prioritas | Target File | Status |
|---|---|:---:|---|:---:|
| **TASK-6.1** | Analytics Dashboard: Usage & Cost Intelligence View | 🔴 Kritis | `src/components/AnalyticsView.tsx` (baru), `src/api/hermesApi.ts`, `src/App.tsx` | `[ ] Ready` |
| **TASK-6.2** | Telegram Gateway Onboarding Wizard | 🟠 Tinggi | `src/components/SettingsView.tsx` (atau `IntegrationsView`), `server.py` | `[ ] Ready` |
| **TASK-6.3** | WhatsApp Pairing QR & Gateway Connect Flow | 🟠 Tinggi | `src/components/SettingsView.tsx`, `server.py` | `[ ] Ready` |
| **TASK-6.4** | Speech-to-Text (STT) Voice Dictation di Chat Composer | 🟡 Sedang | `src/components/ChatView.tsx`, `src/api/hermesApi.ts` | `[ ] Ready` |
| **TASK-6.5** | Text-to-Speech (TTS) Message Readout & Voice Picker | 🟡 Sedang | `src/components/ChatView.tsx`, `src/components/SettingsView.tsx` | `[ ] Ready` |
| **TASK-6.6** | Production Hardening, Chunk Splitting & End-to-End Audit | 🔴 Kritis | `vite.config.ts`, `package.json`, `server.py` | `[ ] Ready` |

---

## 🚀 Rincian Spesifikasi Pengerjaan

### TASK-6.1: Analytics Dashboard: Usage & Cost Intelligence View
- **Target File:** `src/components/AnalyticsView.tsx` (baru), `src/api/hermesApi.ts`, `src/App.tsx`
- **Langkah Kerja:**
  1. Mount router `analytics.py` dari `hermes_cli.web_routers.analytics` di `server.py`.
  2. Tambah method `getUsageAnalytics(period)` dan `getModelAnalytics(period)` di `hermesApi.ts`.
  3. Buat komponen `AnalyticsView.tsx` dengan:
     - 4 Summary KPI Cards: Total Tokens, Total Cost (USD), Total Runs, Avg Tokens/Run.
     - Token Trend Bar Chart (CSS-based responsive layout).
     - Breakdown donut/bar per Model dan per Profil Agen.
     - Filter rentang waktu: 7d, 30d, 90d, All Time.
  4. Tambah tab `analytics` pada Sidebar dan render di `App.tsx`.
- **Kriteria Penerimaan:**
  - [ ] Tab Analytics menampilkan visualisasi pemakaian token dan estimasi biaya secara akurat.

---

### TASK-6.2: Telegram Gateway Onboarding Wizard
- **Target File:** `src/components/SettingsView.tsx`, `server.py`, `src/api/hermesApi.ts`
- **Langkah Kerja:**
  1. Mount router `messaging.py` dari `hermes_cli.web_routers.messaging`.
  2. Di sub-section Integrations pada `SettingsView.tsx`, buat kartu "Telegram Integration".
  3. Sediakan formulir: Bot Token, Allowed User IDs, dan tombol "Connect Bot".
  4. Tampilkan status koneksi bot real-time (Online / Polling / Offline).
- **Kriteria Penerimaan:**
  - [ ] Bot Telegram dapat dihubungkan langsung dari browser dan mulai merespons pesan pengguna.

---

### TASK-6.3: WhatsApp Pairing QR & Gateway Connect Flow
- **Target File:** `src/components/SettingsView.tsx`, `server.py`
- **Langkah Kerja:**
  1. Buat kartu "WhatsApp Integration" dengan tombol "Start Pairing".
  2. Tampilkan gambar QR Code dari endpoint `/api/messaging/whatsapp/qr` untuk discan via aplikasi WhatsApp di smartphone.
  3. Setelah terhubung, tampilkan nomor WhatsApp yang aktif dan tombol "Disconnect".
- **Kriteria Penerimaan:**
  - [ ] Gateway WhatsApp ter-pair dengan sukses dan siap menerima/mengirim notifikasi task.

---

### TASK-6.4: Speech-to-Text (STT) Voice Dictation di Chat Composer
- **Target File:** `src/components/ChatView.tsx`, `src/api/hermesApi.ts`
- **Langkah Kerja:**
  1. Tambah tombol mikrofon di samping input obrolan `ChatView.tsx`.
  2. Saat ditekan, mulai perekaman suara via browser MediaRecorder API.
  3. Saat selesai, kirim audio blob ke `POST /api/audio/transcribe`.
  4. Masukkan hasil teks transkripsi ke dalam composer obrolan.
- **Kriteria Penerimaan:**
  - [ ] Operator dapat mendiktekan prompt menggunakan suara dan teks langsung terisi di input chat.

---

### TASK-6.5: Text-to-Speech (TTS) Message Readout & Voice Picker
- **Target File:** `src/components/ChatView.tsx`, `src/components/SettingsView.tsx`
- **Langkah Kerja:**
  1. Tambah tombol ikon speaker kecil pada setiap bubble jawaban agen di obrolan.
  2. Saat diklik, panggil `POST /api/audio/speak` dengan teks jawaban dan putar audio via HTML5 Audio element.
  3. Sediakan pilihan suara (ElevenLabs / system voice) di tab Audio Settings.
- **Kriteria Penerimaan:**
  - [ ] Pengguna dapat mendengarkan jawaban agen yang dibacakan dengan suara alami.

---

### TASK-6.6: Production Hardening, Chunk Splitting & End-to-End Audit
- **Target File:** `vite.config.ts`, `package.json`, `server.py`
- **Langkah Kerja:**
  1. Optimalisasi `manualChunks` di `vite.config.ts` untuk memecah bundle besar (`cytoscape`, `katex`, `elkjs`) agar loading web secepat kilat.
  2. Lakukan audit menyeluruh pada penanganan exception di `server.py`.
  3. Verifikasi build produksi: `npm run build` dan perbarui Knowledge Graph `graphify update .`.
- **Kriteria Penerimaan:**
  - [ ] Build produksi menghasilkan chunk yang terisolasi rapi (<500 kB) tanpa error kompilasi.
