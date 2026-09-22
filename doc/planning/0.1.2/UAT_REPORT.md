# 📊 User Acceptance Testing (UAT) & Verification Report
## Release v0.1.2 — Settings Hub & Full System Configuration Cockpit

- **Tanggal Pengujian:** 22 September 2026
- **Penguji:** Hermes Agent (Automated End-User QA Driver)
- **Status:** **ALL 10 USE CASES PASSED (100%)**
- **Target URL:** `http://localhost:5173/`
- **Backend API:** `http://127.0.0.1:9120/`
- **Browser Engine:** Chromium Headless (1440x900 viewport) via Puppeteer Core
- **Direktori Bukti Screenshot:** `doc/planning/0.1.2/screenshots/`

---

## 📑 1. Ringkasan Eksekutif (Executive Summary)

Pengujian UAT (*User Acceptance Testing*) end-user dilakukan terhadap rilis **v0.1.2 (Settings Hub)** untuk memvalidasi fungsionalitas pusat konfigurasi sistem terpadu. Pengujian mencakup navigasi 7 sub-menu internal, editor formulir umum (*General*), mode raw JSON, masking dan *reveal* kredensial `.env`, penambahan & penghapusan variabel, inspeksi model LLM & *custom endpoints*, telemetri *gateway daemon*, pengelolaan kolam kunci API (*credentials pool*), manajemen memori persisten, serta diagnostik 1-klik *Hermes System Doctor*.

Seluruh 10 skenario pengujian (**UC-01** hingga **UC-10**) berhasil diselesaikan dengan hasil **PASS (10/10)** tanpa ada crash aplikasi, regresi UI, ataupun kebocoran data rahasia.

---

## 🎯 2. Matriks Hasil Pengujian (Test Results Matrix)

| ID | Skenario Pengujian | Target Komponen | Hasil | Bukti Tangkapan Layar |
|:---:|---|---|:---:|---|
| **UC-01** | Navigasi Sub-Menu Settings Hub | Sub-Navigation (7 Menu) | **PASS** | `screenshots/uc01-01-general.png` <br> `screenshots/uc01-02-env.png` <br> `screenshots/uc01-03-models.png` <br> `screenshots/uc01-04-gateway.png` <br> `screenshots/uc01-05-credentials.png` <br> `screenshots/uc01-06-memory.png` <br> `screenshots/uc01-07-doctor.png` |
| **UC-02** | General Config Editor & Search | `GeneralSection.tsx` (`config.yaml`) | **PASS** | `screenshots/uc02-01-general-search.png` <br> `screenshots/uc02-02-general-dirty-save.png` |
| **UC-03** | Mode Raw JSON Editor | `GeneralSection.tsx` (Raw Mode) | **PASS** | `screenshots/uc03-01-raw-json-mode.png` <br> `screenshots/uc03-02-form-mode-restored.png` |
| **UC-04** | Environment Variables & Secret Masking | `EnvSection.tsx` (`.env`) | **PASS** | `screenshots/uc04-01-env-masked.png` <br> `screenshots/uc04-02-env-revealed.png` |
| **UC-05** | Penambahan & Penghapusan Variable `.env` | `EnvSection.tsx` (CRUD) | **PASS** | `screenshots/uc05-01-env-added.png` <br> `screenshots/uc05-02-env-deleted.png` |
| **UC-06** | Models & Custom Providers Inspector | `ModelsSection.tsx` | **PASS** | `screenshots/uc06-models-inspector.png` |
| **UC-07** | Gateway Telemetry & Messaging Platforms | `GatewaySection.tsx` | **PASS** | `screenshots/uc07-gateway-telemetry.png` |
| **UC-08** | Credentials & API Key Pool Management | `CredentialsSection.tsx` | **PASS** | `screenshots/uc08-01-credentials-pool.png` <br> `screenshots/uc08-02-credentials-add-modal.png` |
| **UC-09** | Memory Management Inspector | `MemorySection.tsx` | **PASS** | `screenshots/uc09-memory-inspector.png` |
| **UC-10** | Hermes System Doctor Health Audit | `DoctorSection.tsx` (Diagnostics) | **PASS** | `screenshots/uc10-01-doctor-ready.png` <br> `screenshots/uc10-02-doctor-audit-result.png` |

---

## 🔍 3. Rincian Eksekusi & Bukti per Skenario

### 🔹 UC-01: Navigasi Sub-Menu Settings Hub
- **Langkah Uji:**
  1. Pengguna membuka URL `http://localhost:5173/` dan mengklik menu **Settings** pada sidebar kiri.
  2. Berpindah ke 7 sub-menu secara bergantian: `General`, `Environment`, `Models`, `Gateway`, `Credentials`, `Memory`, `Doctor`.
- **Hasil & Observasi:**
  - Halaman Settings Hub terbuka seketika tanpa menampilkan placeholder lama.
  - Sub-menu aktif menampilkan indikator warna oranye khas tema Aura (`#F97316`) dengan latar belakang transparan beraksen oranye (`bg-orange-500/10`).
  - Perpindahan antar panel berlangsung instan (<100ms) tanpa reload halaman.
- **Tangkapan Layar:**
  - General: `doc/planning/0.1.2/screenshots/uc01-01-general.png`
  - Environment: `doc/planning/0.1.2/screenshots/uc01-02-env.png`
  - Models: `doc/planning/0.1.2/screenshots/uc01-03-models.png`
  - Gateway: `doc/planning/0.1.2/screenshots/uc01-04-gateway.png`
  - Credentials: `doc/planning/0.1.2/screenshots/uc01-05-credentials.png`
  - Memory: `doc/planning/0.1.2/screenshots/uc01-06-memory.png`
  - Doctor: `doc/planning/0.1.2/screenshots/uc01-07-doctor.png`

---

### 🔹 UC-02: General Configuration Editor & Search
- **Langkah Uji:**
  1. Pada sub-menu General, melakukan pencarian dengan kata kunci `model` pada kolom *"Search settings..."*.
  2. Memverifikasi pemfilteran kartu konfigurasi secara instan.
  3. Mengubah salah satu nilai konfigurasi untuk memicu *dirty state*.
  4. Memverifikasi kemunculan tombol oranye **"Save Changes"** di kanan atas dan menyimpannya.
- **Hasil & Observasi:**
  - Seluruh parameter dari `~/.hermes/config.yaml` terpetakan rapi ke dalam kartu kategori (*General, Agent, Terminal, Display, Model, dll.*).
  - Filter pencarian menyaring entri secara reaktif.
  - Tombol **"Save Changes"** hanya muncul ketika ada perubahan data (*dirty state detection* bekerja dengan akurat).
  - Toast notifikasi sukses `"Configuration saved - Settings updated successfully"` muncul saat penyimpanan berhasil.
- **Tangkapan Layar:**
  - Search: `doc/planning/0.1.2/screenshots/uc02-01-general-search.png`
  - Dirty State & Save: `doc/planning/0.1.2/screenshots/uc02-02-general-dirty-save.png`

---

### 🔹 UC-03: Mode Raw JSON/YAML Editor
- **Langkah Uji:**
  1. Pada sub-menu General, mengklik tombol **"Raw JSON"**.
  2. Memeriksa editor teks area yang memuat JSON terformat utuh.
  3. Mengklik tombol **"Form Mode"** untuk kembali ke mode visual.
- **Hasil & Observasi:**
  - Textarea editor muncul dengan format indentasi JSON 2 spasi yang rapi.
  - Sakelar toggle Form Mode ↔ Raw JSON berfungsi mulus tanpa kehilangan state perubahan.
- **Tangkapan Layar:**
  - Mode Raw: `doc/planning/0.1.2/screenshots/uc03-01-raw-json-mode.png`
  - Kembali ke Form: `doc/planning/0.1.2/screenshots/uc03-02-form-mode-restored.png`

---

### 🔹 UC-04: Environment Variables & Secret Masking
- **Langkah Uji:**
  1. Membuka sub-menu Environment dan memeriksa kolom nilai.
  2. Menguji masking default pada variabel bertipe rahasia.
  3. Mengklik ikon mata (**Reveal** 👁️) pada variabel secret untuk membuka nilai aslinya.
  4. Mengklik ikon mata coret (**Hide** 🙈) untuk menyamarkan kembali.
- **Hasil & Observasi:**
  - Seluruh kunci rahasia terlindungi dengan masking bulatan (`••••••••`) secara default sehingga aman dari intipan layar (*shoulder surfing*).
  - Menekan tombol intip memanggil endpoint backend `/api/env/reveal` secara aman dan menampilkan nilai plaintext seketika.
  - Menekan tombol hide mengembalikan masking ke semula.
- **Tangkapan Layar:**
  - Masked State: `doc/planning/0.1.2/screenshots/uc04-01-env-masked.png`
  - Revealed State: `doc/planning/0.1.2/screenshots/uc04-02-env-revealed.png`

---

### 🔹 UC-05: Penambahan & Penghapusan Variable .env
- **Langkah Uji:**
  1. Mengklik tombol **"+ Add Variable"**.
  2. Memasukkan Nama: `TEST_HERMES_FEATURE` dan Nilai: `enabled_v012`.
  3. Mengklik **"Save"**.
  4. Memverifikasi baris variabel baru pada tabel.
  5. Mengarahkan kursor dan mengklik ikon tempat sampah (🗑️) untuk menghapus variabel tersebut.
- **Hasil & Observasi:**
  - Variabel baru berhasil disimpan ke dalam file `.env` dan langsung muncul di antarmuka tabel.
  - Tombol hapus menghapus variabel dari server dan UI secara reaktif diiringi toast konfirmasi.
- **Tangkapan Layar:**
  - Variabel Ditambahkan: `doc/planning/0.1.2/screenshots/uc05-01-env-added.png`
  - Variabel Dihapus: `doc/planning/0.1.2/screenshots/uc05-02-env-deleted.png`

---

### 🔹 UC-06: Models & Custom Providers Inspector
- **Langkah Uji:**
  1. Membuka sub-menu Models.
  2. Memeriksa kartu **Active Model** dan daftar **Custom Endpoints**.
- **Hasil & Observasi:**
  - Kartu Active Model menampilkan ikon CPU oranye dengan nama model aktif (`Claude 3.5 Sonnet`) dan nama provider default (`anthropic`).
  - Bagian Custom Endpoints menampilkan daftar endpoint khusus dan status badge aktif/inaktif secara terstruktur.
- **Tangkapan Layar:**
  - Models Inspector: `doc/planning/0.1.2/screenshots/uc06-models-inspector.png`

---

### 🔹 UC-07: Gateway Telemetry & Messaging Platforms
- **Langkah Uji:**
  1. Membuka sub-menu Gateway.
  2. Memeriksa indikator status daemon, metrik PID, Uptime, dan platform terhubung.
  3. Mengklik tombol **"Refresh"** untuk memicu pembacaan ulang telemetri.
- **Hasil & Observasi:**
  - Status gateway terdeteksi (**Online** warna hijau dengan badge status menyala).
  - PID dan Uptime terbaca dari sistem.
  - Tombol Refresh memutar spinner ikon dan memperbarui telemetri tanpa error.
- **Tangkapan Layar:**
  - Gateway Telemetry: `doc/planning/0.1.2/screenshots/uc07-gateway-telemetry.png`

---

### 🔹 UC-08: Credentials & API Key Pool Management
- **Langkah Uji:**
  1. Membuka sub-menu Credentials.
  2. Memeriksa tabel penyedia: Anthropic (`ANTHROPIC_API_KEY`), OpenAI, DeepSeek, Google, Groq.
  3. Mengklik tombol **"+ Add Key"** untuk membuka modal/formulir penambahan kunci.
- **Hasil & Observasi:**
  - Kunci terdeteksi dengan badge status `active` hijau untuk provider yang terpasang dan `missing` abu-abu untuk yang belum diisi.
  - Formulir penambahan kredensial baru dapat dibuka dan dibatalkan dengan mulus.
- **Tangkapan Layar:**
  - Credentials Pool: `doc/planning/0.1.2/screenshots/uc08-01-credentials-pool.png`
  - Add Key Modal: `doc/planning/0.1.2/screenshots/uc08-02-credentials-add-modal.png`

---

### 🔹 UC-09: Memory Management Inspector
- **Langkah Uji:**
  1. Membuka sub-menu Memory.
  2. Memeriksa kartu **Memory Provider** (status Enabled/Disabled, nama provider).
  3. Memeriksa tabel parameter konfigurasi memori persisten.
- **Hasil & Observasi:**
  - Kartu Memory Provider menampilkan status aktif/inaktif dan nama provider yang digunakan (`none` / disabled).
  - Parameter terkait memori dan kurasi model ditampilkan dalam tabel detail yang rapi.
- **Tangkapan Layar:**
  - Memory Inspector: `doc/planning/0.1.2/screenshots/uc09-memory-inspector.png`

---

### 🔹 UC-10: Hermes System Doctor Diagnostic (1-Click Health Audit)
- **Langkah Uji:**
  1. Membuka sub-menu Doctor dan melihat tampilan awal *"Ready to Diagnose"*.
  2. Mengklik tombol oranye **"Run Health Check"** (🩺).
  3. Memeriksa hasil audit diagnostik komprehensif.
- **Hasil & Observasi:**
  - Audit berjalan lancar dan menghasilkan banner **Overall Status: HEALTHY** (hijau berkedip).
  - Timestamp pemeriksaan tercatat akurat.
  - Seluruh komponen utama menampilkan centang hijau:
    - ✅ **Backend API Connectivity:** *"Connected to Hermes backend"*
    - ✅ **Python Runtime:** *"Python 3.10.12"*
    - ✅ **Hermes Version:** *"v0.1.2"*
    - ✅ **Gateway Daemon:** *"Gateway is running"*
    - ✅ **Database Integrity:** *"State DB available"*
    - ✅ **Active Sessions:** *"0 active session(s)"*
  - Kartu *System Statistics* menampilkan ringkasan model LLM, backend terminal lokal, dan status online.
- **Tangkapan Layar:**
  - State Awal: `doc/planning/0.1.2/screenshots/uc10-01-doctor-ready.png`
  - Hasil Audit Lengkap: `doc/planning/0.1.2/screenshots/uc10-02-doctor-audit-result.png`

---

## 🛡️ 4. Log Masalah & Keamanan (Issues & Safety Log)

- **Crash Aplikasi:** 0
- **Console Errors Kritis:** 0
- **Kebocoran Secret Plaintext:** 0 (Seluruh kunci API tersamar di DOM dan hanya dipanggil via endpoint aman `/api/env/reveal`).
- **Kesesuaian Desain:** 100% konsisten dengan Aura Design System (warna primer `#F97316`, font monospace JetBrains Mono, kartu rounded 16px).

---

## 🏁 5. Kesimpulan & Rekomendasi

Fitur **Settings Hub (v0.1.2)** telah teruji secara menyeluruh melalui browser nyata sebagai pengguna akhir (*end-user*). Seluruh kriteria keberhasilan pada PRD dan skenario UAT pada dokumen panduan telah terpenuhi dengan predikat **READY FOR PRODUCTION / MERGE**.
