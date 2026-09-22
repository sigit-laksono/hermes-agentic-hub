# 🧪 User Acceptance Testing (UAT) & Use Case Guide
## Hermes Agentic Hub — Release v0.1.2 (Settings Hub)

Dokumen ini berisi panduan skenario pengujian langkah-demi-langkah (*step-by-step test cases*) bagi pengguna untuk menguji dan memvalidasi seluruh fungsionalitas baru pada **Settings Hub (v0.1.2)**.

---

## 🚀 1. Prasyarat & Menjalankan Lingkungan Uji

Sebelum memulai pengujian, jalankan kedua service berikut pada terminal terpisah:

### Terminal 1: Jalankan Backend FastAPI Bridge
```bash
cd /home/sigit/hermes-agentic-hub
python3 server.py
# Pastikan server berjalan di: http://127.0.0.1:9120
```

### Terminal 2: Jalankan Frontend Vite Web UI
```bash
cd /home/sigit/hermes-agentic-hub
npm run dev
# Buka URL yang muncul di browser, biasanya: http://localhost:5173
```

---

## 📋 2. Matriks Skenario Pengujian (Use Cases)

| ID Use Case | Judul Skenario | Fitur yang Diuji | Estimasi Waktu |
|---|---|---|:---:|
| **UC-01** | Navigasi Sub-Menu Settings Hub | Sub-Navigation Framework | 1 menit |
| **UC-02** | General Configuration Editor & Search | General Config (`config.yaml`) | 3 menit |
| **UC-03** | Mode Raw JSON Editor | Raw Editor with Syntax Validation | 2 menit |
| **UC-04** | Environment Variables & Secret Masking | .env Masking & Reveal Toggle | 3 menit |
| **UC-05** | Penambahan & Penghapusan Variable .env | Environment CRUD | 2 menit |
| **UC-06** | Models & Custom Providers Inspector | Model Settings & Endpoints | 2 menit |
| **UC-07** | Gateway Telemetry & Messaging Platforms | Daemon Status & Telemetry | 2 menit |
| **UC-08** | Credentials & API Key Pool Management | Provider API Key Management | 3 menit |
| **UC-09** | Memory Management Inspector | Persistent Memory Settings | 1 menit |
| **UC-10** | Hermes System Doctor Health Audit | 1-Click Diagnostics | 2 menit |

---

## 📝 3. Detail Langkah Pengujian

---

### 🔹 UC-01: Navigasi Sub-Menu Settings Hub
* **Tujuan:** Memastikan halaman Settings terbuka sempurna dan perpindahan antar sub-menu berjalan mulus dan instan.
* **Langkah-langkah:**
  1. Buka aplikasi web di browser (`http://localhost:5173`).
  2. Klik menu **Settings** di bagian bawah sidebar kiri (ikon roda gigi ⚙️).
  3. Perhatikan sub-sidebar internal yang memiliki 7 menu:
     - `General`
     - `Environment`
     - `Models`
     - `Gateway`
     - `Credentials`
     - `Memory`
     - `Doctor`
  4. Klik satu per satu menu tersebut secara bergantian.
* **Hasil yang Diharapkan:**
  - [ ] Halaman tidak lagi menampilkan placeholder kosong "Settings Management".
  - [ ] Konten di panel kanan berganti secara instan sesuai sub-menu yang diklik.
  - [ ] Sub-menu yang aktif memiliki highlight warna oranye khas tema Aura (`#F97316`).

---

### 🔹 UC-02: General Configuration Editor & Search
* **Tujuan:** Memverifikasi formulir pengaturan umum, pengelompokan kategori, dan fitur pencarian.
* **Langkah-langkah:**
  1. Pada Settings Hub, pilih sub-menu **General**.
  2. Perhatikan kartu-kartu pengaturan yang terkelompok berdasarkan kategori (misal: *general, agent, terminal, display, dll.*).
  3. Ketik kata kunci pada kotak input pencarian `"Search settings..."` di bagian atas (contoh: ketik `model` atau `timeout`).
  4. Hapus teks pencarian dengan menekan tombol silang (❌).
  5. Ubah salah satu nilai pengaturan (misal toggle switch boolean atau ketik nilai baru).
  6. Perhatikan munculnya tombol oranye **"Save Changes"** di kanan atas.
  7. Klik **"Save Changes"**.
* **Hasil yang Diharapkan:**
  - [ ] Nilai konfigurasi terbaca dari `~/.hermes/config.yaml`.
  - [ ] Pencarian menyaring pengaturan secara instan.
  - [ ] Tombol "Save Changes" hanya muncul ketika ada perubahan nilai (*dirty state*).
  - [ ] Muncul notifikasi toast hijau `"Configuration saved - Settings updated successfully"`.

---

### 🔹 UC-03: Mode Raw JSON/YAML Editor
* **Tujuan:** Menguji pengeditan konfigurasi tingkat lanjut dalam bentuk text editor langsung.
* **Langkah-langkah:**
  1. Pada sub-menu **General**, klik tombol **"Raw JSON"** di samping tombol Save.
  2. Tampilan form akan berganti menjadi text editor besar.
  3. Lakukan pengeditan kecil yang valid (contoh: ubah salah satu string).
  4. Klik kembali tombol **"Form Mode"** untuk kembali ke tampilan form.
* **Hasil yang Diharapkan:**
  - [ ] Mode Raw menampilkan struktur JSON/YAML konfigurasi secara utuh dan terformat rapi.
  - [ ] Toggle antara Form Mode dan Raw JSON berjalan mulus tanpa kehilangan perubahan.

---

### 🔹 UC-04: Environment Variables & Secret Masking
* **Tujuan:** Memastikan nilai rahasia/secret terlindungi secara default dan tombol reveal bekerja.
* **Langkah-langkah:**
  1. Klik sub-menu **Environment**.
  2. Perhatikan daftar variabel lingkungan yang muncul.
  3. Periksa kolom nilai: Nilai secret harus tersamar dengan bulatan (`••••••••••••`).
  4. Pilih salah satu variabel secret, lalu klik ikon mata (**Reveal** 👁️) di sisi kanan.
  5. Setelah nilai asli terlihat, klik kembali ikon mata coret (**Hide** 🙈) untuk menutupnya kembali.
* **Hasil yang Diharapkan:**
  - [ ] Kunci API tidak bocor/terpampang terbuka secara default.
  - [ ] Tombol intip (Reveal) menampilkan nilai asli yang diambil secara aman melalui endpoint `/api/env/reveal`.
  - [ ] Mengklik kembali ikon mata akan menyamarkan nilai kembali ke `••••••••••••`.

---

### 🔹 UC-05: Penambahan & Penghapusan Variable .env
* **Tujuan:** Menambah variabel baru ke `.env` dan menghapusnya.
* **Langkah-langkah:**
  1. Di sub-menu **Environment**, klik tombol **"+ Add Variable"**.
  2. Masukkan nama variabel pada field kiri (contoh: `TEST_HERMES_FEATURE`).
  3. Masukkan nilainya pada field kanan (contoh: `enabled_v012`).
  4. Klik **"Save"**.
  5. Cari variabel `TEST_HERMES_FEATURE` di daftar variabel untuk memverifikasi sudah tersimpan.
  6. Arahkan kursor (*hover*) pada baris variabel tersebut hingga ikon tempat sampah (🗑️) muncul.
  7. Klik ikon tempat sampah untuk menghapusnya.
* **Hasil yang Diharapkan:**
  - [ ] Toast hijau muncul mengonfirmasi variabel berhasil disimpan.
  - [ ] Variabel baru langsung muncul di tabel.
  - [ ] Menghapus variabel memicu toast konfirmasi dan variabel hilang dari tabel.

---

### 🔹 UC-06: Models & Custom Providers Inspector
* **Tujuan:** Memeriksa informasi model default yang aktif dan daftar endpoint kustom.
* **Langkah-langkah:**
  1. Klik sub-menu **Models**.
  2. Perhatikan kartu **Active Model** di bagian atas (menampilkan nama model aktif dan provider default, misalnya Anthropic).
  3. Perhatikan daftar **Custom Endpoints** di bagian bawah.
* **Hasil yang Diharapkan:**
  - [ ] Nama model dan provider aktif ditampilkan dengan badge bergaya Aura.
  - [ ] Jika ada custom endpoint (seperti Ollama, vLLM, atau OpenAI-compatible), status aktif/inaktifnya tertera dengan jelas.

---

### 🔹 UC-07: Gateway Telemetry & Messaging Platforms
* **Tujuan:** Memantau kesehatan daemon messaging dan integrasi chat app.
* **Langkah-langkah:**
  1. Klik sub-menu **Gateway**.
  2. Periksa kartu status utama:
     - Badge indikator status (**Online** warna hijau dengan titik berkedip / **Offline** abu-abu).
     - Kotak metrik: **PID**, **Uptime**, dan jumlah **Platforms**.
  3. Periksa daftar platform di bagian **Connected Platforms** (WhatsApp, Telegram, Discord).
  4. Klik tombol **"Refresh"** di kanan atas untuk memicu pembacaan ulang telemetry.
* **Hasil yang Diharapkan:**
  - [ ] Status gateway terdeteksi secara otomatis (Online/Offline).
  - [ ] Tombol Refresh memutar ikon spinner dan memperbarui metrik secara instan.

---

### 🔹 UC-08: Credentials & API Key Pool Management
* **Tujuan:** Mengelola kunci API untuk berbagai penyedia AI (Anthropic, OpenAI, DeepSeek, Google, Groq).
* **Langkah-langkah:**
  1. Klik sub-menu **Credentials**.
  2. Perhatikan tabel penyedia:
     - Anthropic (`ANTHROPIC_API_KEY`)
     - OpenAI (`OPENAI_API_KEY`)
     - DeepSeek (`DEEPSEEK_API_KEY`)
     - Google (`GOOGLE_API_KEY`)
     - Groq (`GROQ_API_KEY`)
  3. Periksa badge status di sisi kanan: bernilai `active` (hijau) jika kunci terpasang, atau `missing` (abu-abu) jika belum diset.
  4. Uji tombol intip (👁️) pada provider yang memiliki kunci aktif.
  5. Coba tambahkan kunci baru dengan mengklik **"+ Add Key"**, pilih provider dari dropdown, masukkan nilai kunci simulasi, lalu simpan.
* **Hasil yang Diharapkan:**
  - [ ] Status masing-masing provider terbaca akurat.
  - [ ] Nilai kunci terproteksi masking.
  - [ ] Penambahan atau pembaruan key memperbarui status provider menjadi `active`.

---

### 🔹 UC-09: Memory Management Inspector
* **Tujuan:** Memeriksa status sistem memori persisten Hermes.
* **Langkah-langkah:**
  1. Klik sub-menu **Memory**.
  2. Periksa kartu **Memory Provider**:
     - Nama provider memori yang digunakan (contoh: `none`, `honcho`, `mem0`, dll.).
     - Status memori: Enabled atau Disabled.
  3. Periksa tabel rincian parameter konfigurasi memori di bagian bawah.
* **Hasil yang Diharapkan:**
  - [ ] Informasi konfigurasi memori terbaca dengan rapi.
  - [ ] Status aktif/inaktif memori terindikasi dengan badge yang sesuai.

---

### 🔹 UC-10: Hermes System Doctor Diagnostic (1-Click Health Audit)
* **Tujuan:** Menjalankan audit diagnostik kesehatan sistem secara terpadu dalam satu klik.
* **Langkah-langkah:**
  1. Klik sub-menu **Doctor**.
  2. Pada kondisi awal, perhatikan tampilan *placeholder* `"Ready to Diagnose"`.
  3. Klik tombol oranye **"Run Health Check"** (ikon stetoskop 🩺) di kanan atas.
  4. Amati proses diagnosis (spinner loading muncul sejenak).
  5. Periksa hasil audit yang muncul:
     - Banner status keseluruhan (*Overall Status*): **Healthy** (hijau), **Warning** (kuning), atau **Critical** (merah).
     - Checklist komponen sistem:
       - ✅ Backend API Connectivity
       - ✅ Python Runtime
       - ✅ Hermes Core Version
       - ✅ Gateway Daemon
       - ✅ Database Integrity
       - ✅ Active Sessions
       - ✅ Disk Space
     - Panel metrik sistem (*System Stats*) di bagian bawah.
* **Hasil yang Diharapkan:**
  - [ ] Tombol Run Health Check memicu pemeriksaan semua subsistem tanpa crash.
  - [ ] Muncul notifikasi toast biru: `"Health check complete - X checks performed"`.
  - [ ] Setiap komponen menampilkan indikator visual centang hijau atau tanda peringatan/error beserta rincian penjelasannya.

---

## 🎯 4. Formulir Checklist Hasil Pengujian Pengguna

Beri tanda centang `[x]` setelah Anda menyelesaikan pengujian di browser:

- [x] **UC-01:** Navigasi 7 sub-menu Settings Hub berfungsi mulus dan responsif.
- [x] **UC-02:** Pengaturan General dapat dicari, diubah, dan disimpan ke `config.yaml`.
- [x] **UC-03:** Mode Raw JSON editor dapat dibuka dan diedit.
- [x] **UC-04:** Kunci di tab Environment tersamar secara default dan tombol reveal berfungsi.
- [x] **UC-05:** Tambah dan hapus variabel di Environment berjalan normal.
- [x] **UC-06:** Informasi model aktif dan custom endpoints tampil dengan baik.
- [x] **UC-07:** Status Gateway daemon dan platform pesan dapat dipantau serta di-refresh.
- [x] **UC-08:** Daftar API key credentials pool tampil rapi dengan badge status.
- [x] **UC-09:** Konfigurasi memori persisten tampil sesuai pengaturan sistem.
- [x] **UC-10:** Hermes Doctor berhasil menjalankan audit diagnostik 1-klik dengan checklist warna.

---

> 💡 **Tips Pengujian:**
> Jika menemukan kendala backend tidak merespons, pastikan proses `server.py` sedang berjalan di port `9120` dan tidak terblokir oleh firewall lokal Anda.
