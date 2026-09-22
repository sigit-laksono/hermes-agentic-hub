# Product Requirements Document (PRD) — Release v0.1.2
# Settings Hub & Full System Configuration Cockpit

* **Versi Rilis:** `v0.1.2`
* **Status:** Completed / Implemented
* **Prasyarat:** `v0.1.1`
* **Kategori:** Configuration, Security & System Administration

---

## 1. Executive Summary & Tujuan

Saat ini tab "Settings" pada antarmuka web masih berupa tampilan placeholder kosong tanpa fungsionalitas riil. Setiap konfigurasi parameter model, API keys, variabel lingkungan (.env), dan status gateway harus diubah langsung melalui terminal atau penyuntingan berkas manual.

Rilis **v0.1.2** bertujuan membangun pusat kontrol sistem (**Settings Hub**) yang terpadu, aman, dan modular. Pengguna dapat mengonfigurasi pengaturan global Hermes, menyunting kredensial dengan aman, memantau *gateway daemon*, mengelola kolam kunci API (*credentials pool*), serta menjalankan diagnostik sistem (*Hermes Doctor*).

---

## 2. Ruang Lingkup Fitur (Feature Scope)

### 2.1. Navigasi & Tata Letak Modular (`SettingsView.tsx`)
Struktur navigasi internal berbasis sub-menu sidebar:
- **General:** Konfigurasi utama `~/.hermes/config.yaml`.
- **Environment:** Penyunting aman variabel lingkungan `~/.hermes/.env`.
- **Models & Providers:** Pemilihan model default, penyedia LLM (Anthropic, OpenAI, DeepSeek, Ollama), dan konfigurasi model lokal.
- **Gateway Daemon:** Pemantauan status live gateway messaging, tombol restart/stop/start, dan port bindings.
- **Credentials Pool:** Manajemen rotasi API keys multi-akun untuk mencegah rate-limit.
- **Memory & System Doctor:** Pengaturan provider memori persisten, reset memori, dan pemeriksaan kesehatan sistem (Doctor / Audit).

### 2.2. General Config & Environment (.env) Editor
1. **Interactive Config Editor:** Formulir ramah pengguna untuk pengaturan umum (default timeout, terminal backend, interface preference).
2. **Raw YAML/ENV Editor with Backup:** Toggle ke mode raw text editor dengan validasi sintaksis sebelum disimpan, disertai backup otomatis ke `.config.yaml.bak` atau `.env.bak`.
3. **Secret Masking:** Nilai kunci API di form ter-mask secara default (`••••••••`) dengan tombol intip (*reveal toggle*).

### 2.3. Gateway Controller & Background Services
1. **Gateway Status Card:** Menampilkan status running/stopped, PID, uptime, dan platform messaging yang sedang aktif terhubung.
2. **Service Controls:** Tombol Start, Stop, dan Restart daemon gateway.

### 2.4. Memory Management & System Doctor
1. **Memory Inspector:** Menampilkan ringkasan memori jangka panjang agen (*facts & conventions*) dengan opsi reset atau ekspor.
2. **Hermes Doctor:** Tombol diagnostik satu klik yang menjalankan audit kesehatan dependensi (Python, CLI tools, SQLite, konektivitas provider).

---

## 3. Arsitektur & Kontrak API Backend

| Modul | Method & Endpoint | Keterangan |
|---|---|---|
| **Config** | `GET /api/config` | Baca konfigurasi `config.yaml` aktif |
| **Config** | `PUT /api/config` | Simpan perubahan konfigurasi |
| **Env** | `GET /api/env` | Baca environment variables (masked) |
| **Env** | `PUT /api/env` | Simpan variabel environment `.env` |
| **Gateway** | `GET /api/gateway/status` | Cek status background gateway |
| **Gateway** | `POST /api/gateway/{action}` | Kontrol daemon (`start`, `stop`, `restart`) |
| **Credentials** | `GET /api/credentials/pool` | Daftar API key pool & status rotasi |
| **Credentials** | `POST /api/credentials/pool` | Tambah/update API key ke pool |
| **Memory** | `GET /api/memory` | Ambil data memori tersimpan |
| **Memory** | `POST /api/memory/reset` | Hapus/reset memori |
| **Doctor** | `GET /api/system/doctor` | Jalankan health audit sistem |

---

## 4. Kriteria Keberhasilan (Acceptance Criteria)

- [x] Tab Settings menampilkan navigasi internal yang mulus dan responsif.
- [x] Perubahan setting di antarmuka berhasil terupdate di `~/.hermes/config.yaml` atau `.env`.
- [x] Kunci API tidak terekspos sembarangan (masked secara default).
- [x] Status gateway dapat dipantau dan di-restart langsung dari UI.
- [x] Hasil audit Hermes Doctor muncul dengan indikator centang hijau atau peringatan kuning/merah.
