# 📋 Actionable Tasks: Release v0.1.2
## Settings Hub & Full System Configuration Cockpit

Dokumen task ini merupakan turunan teknis langsung dari [PRD.md](./PRD.md).

---

## 📊 Status Ringkasan Task

| ID Task | Judul Task | Prioritas | Target File | Status |
|---|---|:---:|---|:---:|
| **TASK-2.1** | Settings Page Layout & Sub-Navigation Framework | 🔴 Kritis | `src/components/SettingsView.tsx`, `src/App.tsx`, `src/types.ts` | `[ ] Ready` |
| **TASK-2.2** | General Config.yaml Interactive & Raw Editor | 🟠 Tinggi | `src/api/hermesApi.ts`, `src/components/SettingsView.tsx` | `[ ] Ready` |
| **TASK-2.3** | Environment Variables (.env) Masked Editor | 🔴 Kritis | `src/api/hermesApi.ts`, `src/components/SettingsView.tsx` | `[ ] Ready` |
| **TASK-2.4** | Gateway Service Controller & Telemetry Card | 🟠 Tinggi | `src/api/hermesApi.ts`, `src/components/SettingsView.tsx` | `[ ] Ready` |
| **TASK-2.5** | Credentials & API Key Pool Management | 🟡 Sedang | `src/api/hermesApi.ts`, `src/components/SettingsView.tsx` | `[ ] Ready` |
| **TASK-2.6** | Memory Inspector & Hermes Doctor Diagnostic | 🟡 Sedang | `src/api/hermesApi.ts`, `src/components/SettingsView.tsx` | `[ ] Ready` |

---

## 🚀 Rincian Spesifikasi Pengerjaan

### TASK-2.1: Settings Page Layout & Sub-Navigation Framework
- **Target File:** `src/components/SettingsView.tsx`, `src/App.tsx`, `src/types.ts`
- **Langkah Kerja:**
  1. Buat komponen baru `src/components/SettingsView.tsx` dengan sidebar navigasi sub-menu:
     - General, Environment, Models, Gateway, Credentials, Memory, System Doctor.
  2. Tambahkan tab aktif internal di `SettingsView` (`general` | `env` | `models` | `gateway` | `credentials` | `memory` | `doctor`).
  3. Ganti placeholder settings di `App.tsx` agar merender `<SettingsView />`.
- **Kriteria Penerimaan:**
  - [ ] Membuka tab Settings menampilkan navigasi internal yang rapi dan berganti section secara instan.

---

### TASK-2.2: General Config.yaml Interactive & Raw Editor
- **Target File:** `src/api/hermesApi.ts`, `src/components/SettingsView.tsx`
- **Langkah Kerja:**
  1. Mount router `config_env` di `server.py` jika belum ter-mount.
  2. Tambah method `getConfig()` dan `updateConfig(yamlOrJson)` di `hermesApi.ts`.
  3. Di section General, sediakan form interaktif untuk key umum (model default, terminal timeout, tema tampilan).
  4. Sediakan sakelar toggle "Raw YAML Mode" untuk mengedit isi file secara manual dengan validasi sintaksis.
- **Kriteria Penerimaan:**
  - [ ] Form dapat membaca isi `config.yaml` dan menyimpan perubahannya secara persisten.

---

### TASK-2.3: Environment Variables (.env) Masked Editor
- **Target File:** `src/api/hermesApi.ts`, `src/components/SettingsView.tsx`
- **Langkah Kerja:**
  1. Tambah method `getEnv()` dan `updateEnv(payload)` di `hermesApi.ts`.
  2. Tampilkan daftar key-value environment variable dengan proteksi masked input (`••••••••`).
  3. Sediakan tombol mata (reveal) untuk melihat secret tertentu.
  4. Sediakan tombol "+ Add Variable" dan tombol "Save Environment".
- **Kriteria Penerimaan:**
  - [ ] Secret API key tersimpan aman di `~/.hermes/.env` dan tidak bocor ke log frontend.

---

### TASK-2.4: Gateway Service Controller & Telemetry Card
- **Target File:** `src/api/hermesApi.ts`, `src/components/SettingsView.tsx`
- **Langkah Kerja:**
  1. Tambah method `getGatewayStatus()` (`GET /api/gateway/status`) dan `controlGateway(action: 'start' | 'stop' | 'restart')` di `hermesApi.ts`.
  2. Buat kartu status Gateway: badge status (Online / Offline), PID proses, port, dan durasi uptime.
  3. Sediakan tombol aksi: "Start Gateway", "Stop Gateway", "Restart Gateway" dengan feedback toast loading.
- **Kriteria Penerimaan:**
  - [ ] Mengklik Restart Gateway mengirimkan instruksi ke daemon dan mengupdate status kartu setelah service hidup kembali.

---

### TASK-2.5: Credentials & API Key Pool Management
- **Target File:** `src/api/hermesApi.ts`, `src/components/SettingsView.tsx`
- **Langkah Kerja:**
  1. Tambah method `getCredentialPool()` dan `addCredentialToPool(provider, key)` di `hermesApi.ts`.
  2. Tampilkan tabel kolam kunci per provider (Anthropic, OpenAI, DeepSeek).
  3. Tampilkan metrik rotasi (jumlah kunci aktif, kuota tersisa, status sehat).
- **Kriteria Penerimaan:**
  - [ ] Operator dapat menambahkan secondary backup API key ke dalam pool rotasi otomatis.

---

### TASK-2.6: Memory Inspector & Hermes Doctor Diagnostic
- **Target File:** `src/api/hermesApi.ts`, `src/components/SettingsView.tsx`
- **Langkah Kerja:**
  1. Tambah method `getMemoryOverview()`, `resetMemory()`, dan `runHermesDoctor()` di `hermesApi.ts`.
  2. Sediakan card Memory: menampilkan daftar entri memori dan tombol "Clear All Memory" dengan konfirmasi.
  3. Sediakan panel Doctor: tombol "Run Health Check" yang menampilkan daftar checklist komponen sistem (Python runtime, git, SQLite db, internet connection, providers).
- **Kriteria Penerimaan:**
  - [ ] Laporan Hermes Doctor menampilkan status hijau/kuning/merah untuk setiap subsistem.
