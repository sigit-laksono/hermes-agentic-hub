# 📋 Actionable Tasks: Release v0.1.5
## Multi-Agent Group Deliberation Rooms & MCP Server Ecosystem

Dokumen task ini merupakan turunan teknis langsung dari [PRD.md](./PRD.md).

---

## 📊 Status Ringkasan Task

| ID Task | Judul Task | Prioritas | Target File | Status |
|---|---|:---:|---|:---:|
| **TASK-5.1** | Group Deliberation Rooms UI & Member Selector Modal | 🔴 Kritis | `src/components/ChatView.tsx`, `src/types.ts`, `server.py` | `[ ] Ready` |
| **TASK-5.2** | Multi-Round Turn Driver & Needs-You Mention Routing | 🟠 Tinggi | `src/components/ChatView.tsx`, `server.py` | `[ ] Ready` |
| **TASK-5.3** | Action: Convert Room Deliberation to Kanban Epic | 🔴 Kritis | `src/components/ChatView.tsx`, `src/components/NewIssueModal.tsx` | `[ ] Ready` |
| **TASK-5.4** | MCP Server Catalog Browser & 1-Click Installer | 🟠 Tinggi | `src/components/MCPView.tsx` (baru), `src/api/hermesApi.ts` | `[ ] Ready` |
| **TASK-5.5** | Custom MCP Server Configuration, Testing & Toggles | 🟡 Sedang | `src/components/MCPView.tsx`, `src/api/hermesApi.ts` | `[ ] Ready` |
| **TASK-5.6** | Project File Browser & Workspace Explorer | 🟡 Sedang | `src/components/FileBrowserModal.tsx` (baru), `server.py` | `[ ] Ready` |

---

## 🚀 Rincian Spesifikasi Pengerjaan

### TASK-5.1: Group Deliberation Rooms UI & Member Selector Modal
- **Target File:** `src/components/ChatView.tsx`, `src/types.ts`, `server.py`
- **Langkah Kerja:**
  1. Di `ChatView.tsx`, tambahkan tab "Rooms / Groups" di samping daftar obrolan agen individual.
  2. Sediakan tombol "+ New Group Room" yang membuka modal pemilih anggota (checklist 2–6 profil agen aktif).
  3. Simpan data room dan daftar anggota ke backend Hermes.
- **Kriteria Penerimaan:**
  - [ ] Room baru berhasil dibuat dengan nama dan avatar kustom serta menampilkan daftar anggota tim yang tergabung.

---

### TASK-5.2: Multi-Round Turn Driver & Needs-You Mention Routing
- **Target File:** `src/components/ChatView.tsx`, `server.py`
- **Langkah Kerja:**
  1. Implementasikan visual transcript room: bubble chat menampilkan avatar dan label profil pengirim (`sa-aws`, `sa-microsoft`).
  2. Alur giliran diskusi: setelah pengguna mengirim pesan, sistem mengizinkan hingga 3 giliran serial antar-agen.
  3. Jika agen me-mention `@user`: nyalakan badge **"Needs You"** di daftar room dan tampilkan highlight kuning pada pesan tersebut.
- **Kriteria Penerimaan:**
  - [ ] Agen dapat berdiskusi secara bergantian dan memunculkan notifikasi saat memerlukan intervensi manusia.

---

### TASK-5.3: Action: Convert Room Deliberation to Kanban Epic
- **Target File:** `src/components/ChatView.tsx`, `src/components/NewIssueModal.tsx`
- **Langkah Kerja:**
  1. Di toolbar atas Group Room, sediakan tombol **"Create Epic from Room"**.
  2. Saat diklik, panggil endpoint backend untuk merangkum kesimpulan teknis diskusi menjadi judul Epic dan deskripsi dengan acceptance criteria.
  3. Buka `NewIssueModal` dengan data yang sudah terisi dan pilihan board proyek aktif.
  4. Setelah disimpan, jalankan `AI Decompose` otomatis jika diizinkan oleh setting.
- **Kriteria Penerimaan:**
  - [ ] Hasil diskusi perencanaan tim langsung tertransformasi menjadi tiket tugas konkret di kolom `Triage`.

---

### TASK-5.4: MCP Server Catalog Browser & 1-Click Installer
- **Target File:** `src/components/MCPView.tsx` (baru), `src/api/hermesApi.ts`
- **Langkah Kerja:**
  1. Buat komponen baru `src/components/MCPView.tsx` dan tambahkan tab `mcp` di navigasi sidebar.
  2. Tambah method `getMCPCatalog()` dan `installMCPFromCatalog(id)` di `hermesApi.ts`.
  3. Tampilkan kartu katalog MCP: GitHub, Postgres, Puppeteer, Brave Search, dll. lengkap dengan tombol "Install".
- **Kriteria Penerimaan:**
  - [ ] Mengklik install secara otomatis mengonfigurasi dan mengaktifkan MCP server di `~/.hermes/config.yaml`.

---

### TASK-5.5: Custom MCP Server Configuration, Testing & Toggles
- **Target File:** `src/components/MCPView.tsx`, `src/api/hermesApi.ts`
- **Langkah Kerja:**
  1. Buat form tambah server MCP manual: Name, Command (e.g. `npx`, `python`), Args, dan Env vars.
  2. Tambah tombol "Test Connection" (`POST /api/mcp/servers/{name}/test`): tampilkan status hijau jika server merespons JSON-RPC tools list.
  3. Sediakan sakelar toggle enable/disable per server terpasang.
- **Kriteria Penerimaan:**
  - [ ] Operator dapat memasang server MCP custom dan memverifikasi koneksi alat sebelum didelegasikan ke agen.

---

### TASK-5.6: Project File Browser & Workspace Explorer
- **Target File:** `src/components/FileBrowserModal.tsx` (baru), `server.py`
- **Langkah Kerja:**
  1. Mount router `files.py` dari `hermes_cli.web_routers.files`.
  2. Buat modal penjelajah berkas pohon direktori untuk melihat isi folder proyek.
  3. Dukung pratinjau teks (*markdown, json, yaml, code*) dengan sintaksis rapi.
- **Kriteria Penerimaan:**
  - [ ] Pengguna dapat menelusuri file proyek langsung dari antarmuka web tanpa membuka file manager OS.
