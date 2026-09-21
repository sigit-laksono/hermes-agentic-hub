# Product Requirements Document (PRD) — Release v0.1.6
# Advanced Ecosystem: Usage Analytics, Messaging Onboarding & Voice AI

* **Versi Rilis:** `v0.1.6`
* **Status:** Draft / Planned
* **Prasyarat:** `v0.1.5`
* **Kategori:** Telemetry, Analytics, Omnichannel Messaging & Voice AI

---

## 1. Executive Summary & Tujuan

Sebagai rilis penutup siklus evolusi arsitektur terpadu, **v0.1.6** melengkapi Hermes Agentic Hub dengan observabilitas finansial (*usage & cost analytics*), onboarding saluran pesan instan (Telegram & WhatsApp bot gateway), serta interaksi multimodal berbasis suara (*Audio STT & TTS*).

Dengan rilis ini, Hermes Agentic Hub bukan hanya command center manajemen proyek multi-agen, melainkan sistem operasi agen mandiri yang lengkap, dapat diakses dari mana saja, hemat biaya, dan siap produksi.

---

## 2. Ruang Lingkup Fitur (Feature Scope)

### 2.1. Analytics Dashboard — Usage & Cost Intelligence
1. **Summary Metrics Cards:** Total token terpakai (prompt + completion), perkiraan total biaya (USD), total task runs, dan rata-rata token per eksekusi.
2. **Visual Breakdown Charts:**
   - Tren konsumsi token harian/mingguan (grafik batang).
   - Distribusi biaya per Model (Claude 3.7 Sonnet, DeepSeek, GPT-4o).
   - Distribusi pemakaian per Agen Spesialis (`sa-aws`, `sa-microsoft`, dll.).
3. **Period Filter:** Opsi rentang analisis: 7 hari terakhir, 30 hari, 90 hari, atau semua waktu.

### 2.2. Messaging Platform Onboarding Wizard
1. **Telegram Gateway Setup Wizard:**
   - Input bot token dari `@BotFather`.
   - Konfigurasi allowed user ID dan tombol aktivasi koneksi live.
2. **WhatsApp Gateway Onboarding:**
   - Tampilan QR-Code pairing untuk menghubungkan nomor WhatsApp asisten ke Hermes gateway.
3. **Home Channel Subscription:**
   - Notifikasi otomatis hasil task review langsung dikirimkan ke grup Telegram atau WhatsApp yang terhubung.

### 2.3. Audio & Voice Multimodal Integration
1. **Speech-to-Text (STT) Input:** Tombol mikrofon di input chat untuk mendikte instruksi suara yang otomatis ditranskripsi ke teks.
2. **Text-to-Speech (TTS) Readout:** Tombol speaker pada pesan agen untuk membacakan kesimpulan teknis atau ringkasan arsitektur.
3. **Voice Persona Picker:** Pemilihan suara suara ElevenLabs atau model suara lokal di Settings.

### 2.4. Production Hardening & E2E Polish
1. **Production Build Cleanliness:** Bundle audit bebas peringatan dan optimalisasi chunk splitting.
2. **Security & Permission Gate:** Verifikasi pemfilteran secret token pada seluruh response bridge.

---

## 3. Arsitektur & Kontrak API Backend

| Modul | Method & Endpoint | Keterangan |
|---|---|---|
| **Analytics** | `GET /api/analytics/usage` | Data agregasi konsumsi token harian |
| **Analytics** | `GET /api/analytics/models` | Data breakdown token & biaya per model |
| **Messaging** | `GET /api/messaging/status` | Status koneksi WhatsApp & Telegram |
| **Messaging** | `POST /api/messaging/telegram/setup` | Simpan token & start Telegram bot |
| **Messaging** | `GET /api/messaging/whatsapp/qr` | Ambil QR code pairing WhatsApp |
| **Audio** | `POST /api/audio/transcribe` | Transkripsi berkas suara menjadi teks |
| **Audio** | `POST /api/audio/speak` | Sintesis teks menjadi stream audio |
| **Audio** | `GET /api/audio/elevenlabs/voices` | Daftar suara ElevenLabs tersedia |

---

## 4. Kriteria Keberhasilan (Acceptance Criteria)

- [ ] Halaman Analytics menampilkan metrik biaya riil berdasarkan log eksekusi Hermes.
- [ ] Operator dapat menghubungkan Telegram Bot langsung dari form wizard di web UI.
- [ ] Transkripsi suara melalui tombol mikrofon di chat berhasil menginput teks ke composer.
- [ ] Seluruh suite pengujian lolos verifikasi dan build produksi (`npm run build`) berjalan bersih.
