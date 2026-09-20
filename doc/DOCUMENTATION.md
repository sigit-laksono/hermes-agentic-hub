# Dokumentasi Implementasi: Hermes Agentic Hub

## 1. Ringkasan Proyek
* **Nama Aplikasi:** Hermes Agentic Hub (Workspace: `DikstraCloud`)
* **Live Public URL:** `https://hermes.dikstracloud.my.id`
* **Direktori Proyek:** `hermes-agentic-hub`
* **Tujuan:** Antarmuka web terpadu (*command center*) bergaya **Linear / Multica** yang memfasilitasi kolaborasi antara manusia dan tim agen AI berbasis **Hermes Agent** secara *human-in-the-loop*.

---

## 2. Arsitektur Sistem & Integrasi Hermes Agent

Sistem dibangun dalam 3 lapisan arsitektur modular dengan persistensi data murni dan integrasi langsung ke core database Hermes:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               LAPISAN 1: FRONTEND WEB APPLICATION                               │
│                         (Vite 6 + React 19 + TypeScript 5.7 + Tailwind v4)                      │
│  • Linear / Multica UI Cockpit   • Kanban Board View               • Split Inbox Review Center  │
│  • Multica Issue Detail Drawer   • Execution Log & Timeline Trace  • Run Inspector & Telemetry  │
│  • Deliverables Code Previewer   • Projects & Autopilot Schedulers • ErrorBoundary Resilience   │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │ HTTPS / HTTP Proxy (/api/*)
┌────────────────────────────────────────────────▼────────────────────────────────────────────────┐
│                             LAPISAN 2: HERMES HARNESS BRIDGE API                                │
│                                    (FastAPI - Port 9120)                                        │
│  File: server.py                                                                                │
│  • Router Kanban:    /api/plugins/kanban/tasks/ (Tasks, Boards, Events, Comments, Attachments)  │
│  • Router Execution: /api/plugins/kanban/runs/  (Inspect Telemetry, Emergency Terminate)        │
│  • Router Run Task:  /api/plugins/kanban/tasks/{id}/run (Live Dispatcher Trigger)              │
│  • Router Cron:      /api/cron/jobs             (Jadwal Autopilot Hermes)                       │
│  • Router Profiles:  /api/profiles              (Hermes Profiles Fleet)                         │
│  • Router Skills:    /api/skills                (Katalog Kemampuan Agen)                        │
│  • WebSocket Token:  /api/ws-token              (Sesi Token untuk /events stream)               │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │ Native Python Binding & IPC
┌────────────────────────────────────────────────▼────────────────────────────────────────────────┐
│                             LAPISAN 3: HERMES AGENT CORE ENGINE                                 │
│  • SQLite Storage: ~/.hermes/kanban.db & state.db (Tabel: tasks, task_comments, task_events,    │
│    task_runs, task_attachments)                                                                 │
│  • Multi-Profile Fleet: ~/.hermes/profiles/<profile>/config.yaml                                │
│    - sa-aws (AWS Solutions Architect)                                                           │
│    - sa-microsoft (Azure Specialist)                                                            │
│    - technical-writer (Dokumentasi & POC)                                                       │
│    - database-engineer & default                                                                │
│  • Worker Log Storage: ~/.hermes/kanban/logs/{task_id}.log                                      │
│  • Workspaces: ~/.hermes/kanban/workspaces/{task_id}/                                           │
│  • Background Dispatcher: hermes kanban dispatch / gateway loop                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Fitur-Fitur & Modul Sistem

### A. Tampilan & Desain UI/UX (Linear / Multica Style)
1. **Dukungan Tema Penuh (Dark / Light / System Preference):**
   * **Dark Mode:** Tema gelap kontras tinggi khas Multica/Linear (`#0D0F12`, `#14171D`, `#23272F`).
   * **Light Mode:** Tampilan bersih dengan kontras jelas (`#F8FAFC`, `#FFFFFF`, `#E2E8F0`).
   * **Theme Toggle:** Penggantian tema instan di header kanan atas.
2. **Keyboard-Centric Navigation:**
   * Menekan tombol `C` membuka modal pembuatan tiket baru (*New Issue*).
   * Menekan tombol `Ctrl+K` atau `Cmd+K` membuka *Global Search Modal* di seluruh task, project, agent, dan skill.
3. **Stabilitas Aplikasi & Error Handling:**
   * Komponen aplikasi dibungkus oleh `<ErrorBoundary>` untuk menangkap runtime exception secara elegan dan mencegah terjadinya layar putih kosong (*blank white screen*).
   * Kepatuhan penuh pada *React Rules of Hooks* memastikan performa rendering tetap deterministik.

---

### B. Modul Work Management (Kanban & Issue Details)

#### 1. Kanban Board Interaktif (`KanbanBoard.tsx`)
* **6 Kolom Alur Kerja Standar Hermes Kanban:**
  1. `Backlog` (Triage): Tiket yang baru masuk dan belum dijadwalkan.
  2. `Todo` (Ready): Tiket siap dieksekusi manual atau siap diklaim oleh agen AI.
  3. `In Progress` (Running): Tiket yang sedang aktif dikerjakan.
  4. `In Review` (Review): Tiket yang telah selesai dikerjakan agen dan menunggu persetujuan manusia.
  5. `Blocked`: Tiket yang tertunda (*circuit breaker* atau ketergantungan task lain).
  6. `Done`: Tiket yang telah disetujui dan ditutup.
* **Fitur Kartu Kanban:**
  * Tombol **⚡ Run Agent** instan langsung pada kartu untuk memicu agen tanpa membuka terminal.
  * Drag-and-Drop HTML5 murni antar-kolom status tanpa dependensi library eksternal berat.
  * State tracking berbasis `selectedTaskId` memastikan sinkronisasi data modal selalu segar (*fresh*) saat ada update di background.

#### 2. Multica / Linear Issue Detail Drawer (`TaskDetailModal.tsx`)
* **Struktur 2 Kolom:**
  * **Kolom Kiri (Main Issue Content):**
    * **Judul Besar & Deskripsi Asli:** Mendukung teks berformat panjang dan chat transcript (misal WhatsApp/Slack) dengan penyorotan alamat IP (`10.x.x.x/xx`).
    * **Activity Feed Real-time:** Menampilkan rekam jejak event tiket asli dari database Hermes (`task_events`) melalui accordion *X activities recorded by Hermes*.
    * **Thread Komentar Dinamis:** Membaca dan menampilkan komentar dari `task_comments` (lengkap dengan avatar `👑` Team Lead, `🤖` AWS Engineer, `👤` Operator, dan timestamp).
    * **Bottom Comment Composer:** Kotak input *"Leave a comment..."* dengan tombol upload lampiran (paperclip), emoji, dan tombol kirim instan (`↑`) yang langsung memanggil `POST /api/plugins/kanban/tasks/{id}/comments`.
  * **Kolom Kanan (Sidebar Properties - Collapsible):**
    * **Status:** Dropdown pemilih status interaktif yang langsung mengupdate status tiket di backend via `PATCH /api/plugins/kanban/tasks/{id}`.
    * **Assignee:** Dropdown pemilih agen dinamis yang terhubung ke daftar profil Hermes riil (`/api/profiles`).
    * **Project:** Nama workspace/board Hermes aktif.
    * **Execution Log Widget:** Ringkasan log dan tombol **`> Show past runs (X)`** yang membuka tampilan *Execution Log Drawer*.
    * **Details:** Pembuat tiket (*created_by*), tanggal pembuatan (*created*), dan pembaruan (*updated*).

---

### C. Observabilitas Agen & Live Execution Controls

#### 1. Live Worker Log Streaming
* Mengambil output terminal worker secara langsung dari `GET /api/plugins/kanban/tasks/{id}/log`.
* Dilengkapi kontrol:
  * **Auto-scroll sticky** (tetap di baris terbawah saat log baru masuk).
  * **Copy Log** & **Download Log** (`{task_id}-worker.log`).
  * **Elapsed Runtime Timer** (durasi menit & detik berjalan secara live saat agen berstatus `in_progress`).
  * **Toggle Tampilan:** Beralih antara *Parsed Tool Steps* atau *Raw Terminal Output*.

#### 2. Execution Log & Timeline Trace Drawer (Screenshot 4 Style)
Ketika operator membuka log run dari sidebar (*Show past runs*):
* **Status Bar:** Badge status (`✔ Completed` / `Running`), avatar profil pelaksana (`👑 AWS Team Lead`), durasi eksekusi (`Took 41s`), dan indikator log size.
* **Produced Metrics Bar:** Indikator file yang dihasilkan (`📄 1 file +39`) dan jumlah perintah yang dijalankan (`>_ 5 commands`).
* **Visual Timeline Chart:** Diagram visual model latency vs tools latency secara proporsional.
* **Chronological Step-by-Step Trace:** Mem-parsing log worker nyata menjadi langkah-langkah terstruktur (`>_ Terminal / PowerShell / Bash`, `Write`, `Read`, `kanban_*`, `skill_*`) beserta durasi per langkahnya.
* **Kartu Laporan Akhir Agen:** Ringkasan eksekutif beraksen garis hijau (`border-l-4 border-l-emerald-500`) yang merangkum kesimpulan, rekomendasi, dan status issue.

#### 3. Run Inspector & Host Telemetry
* Terintegrasi dengan endpoint `GET /api/plugins/kanban/runs/{run_id}/inspect` yang mengambil telemetri host (`psutil`):
  * **CPU Usage %:** Konsumsi prosesor dengan visual progress bar adaptif.
  * **Memory RSS in MB:** Pemakaian memori fisik (`rss_bytes`) dan memori virtual (`vms_bytes`).
  * **Process ID (PID) & Threads:** Identitas PID proses worker di Linux dan jumlah threads aktif.
  * **State & Heartbeat:** Status proses (`running`, `sleeping`, `terminated`) dengan animasi denyut live.

#### 4. Emergency Stop / Terminate Worker
* Tombol darurat berwarna merah **🛑 Stop Worker / Terminate Worker** tersedia di header modal dan widget Run Inspector.
* Dilengkapi *two-stage confirmation dialog* dan input alasan terminasi.
* Mengirimkan sinyal `SIGTERM`/`SIGKILL` melalui `POST /api/plugins/kanban/runs/{run_id}/terminate` atau `POST /api/plugins/kanban/tasks/{id}/reclaim` untuk menghentikan proses worker seketika dan mengembalikan tiket ke status `blocked`.

---

### D. Deliverables & Work Artifacts Management

#### 1. In-App Code & Document Previewer
* Terhubung langsung dengan tabel `task_attachments` melalui `GET /api/plugins/kanban/tasks/{id}/attachments` dan `/attachments/{id}`.
* Pengkategorian file otomatis:
  * 🟧 **Terraform (`.tf`, `.tfvars`, `.hcl`)**
  * 🟦 **CloudFormation & Config (`.yaml`, `.json`)**
  * 📄 **Technical Documentation (`.md`, `.txt`)**
  * 🖼️ **Architecture Diagrams (`.svg`, `.png`, `.jpg`)**
  * 🟣 **Automation Scripts (`.py`, `.sh`, `.sql`)**
* Fitur drawer preview kode bawaan dengan nomor baris (*line numbering*), format monospace bersih, dan tombol salin kode satu-klik.
* Render visual langsung untuk diagram arsitektur format SVG/PNG.

#### 2. Human-in-the-Loop Inbox Review Center (`InboxView.tsx`)
* Panel review kanan tiket di Inbox dibagi menjadi sistem **Dual Tab**:
  1. **Tab Executive Summary:** Ringkasan temuan asesmen, narasi rekomendasi agen, dan form catatan revisi.
  2. **Tab Deliverables & Files:** Galeri file teknis yang dihasilkan oleh agen (Terraform, script, atau diagram arsitektur) dengan opsi preview dan unduh langsung.
* Reviewer dapat memeriksa artefak kode teknis secara langsung sebelum menekan tombol **`Approve & Done`** atau mengisi catatan instruksi perbaikan lalu menekan **`Request Changes`**.

---

### E. Integrasi Dynamic Engine Hermes

1. **Auto-Dispatch & Instant Run Trigger:**
   * Di `NewIssueModal`, tersedia toggle:
     `[✓] ⚡ Run Agent immediately after creation (Dispatch Now)`
   * Di `server.py`, endpoint `POST /api/plugins/kanban/tasks/{task_id}/run` memindahkan status tiket ke `ready` dan langsung memanggil `kbd.dispatch_once(conn, board=board)` untuk men-spawn worker Hermes di background secara otonom.
2. **Dynamic Assignee & Project Mapping:**
   * Dropdown *Assignee* dan *Project* mengambil data live dari server:
     * Assignee: profil aktif dari `/api/profiles` (`sa-aws`, `sa-microsoft`, `database-engineer`, `technical-writer`, `default`).
     * Project: board aktif dari `/api/plugins/kanban/boards`.
   * Logika penugasan langsung menyimpan ID profil Hermes yang bersangkutan tanpa ada fallback yang mengembalikan ke default secara keliru.
3. **Konfigurasi Path Universal & Portabel:**
   * `server.py` secara dinamis mendeteksi lokasi instalasi Hermes melalui variabel `HERMES_AGENT_ROOT` atau `Path.home() / ".hermes/hermes-agent"`.
   * Mendukung instalasi di berbagai environment Linux/WSL (`/home/sigit`, `/home/ubuntu`, dll.) tanpa error hardcoded path.

---

## 4. Panduan Menjalankan Layanan

### Langkah 1: Jalankan Backend Bridge (Port 9120)
Masuk ke direktori proyek dan jalankan script bridge menggunakan Python virtualenv Hermes:
```bash
cd ~/hermes-agentic-hub
~/.hermes/hermes-agent/venv/bin/python server.py
```

### Langkah 2: Jalankan Frontend Dev Server (Port 5173)
Buka terminal baru, masuk ke direktori proyek, dan jalankan Vite:
```bash
cd ~/hermes-agentic-hub
npm run dev
```

Aplikasi dapat langsung diakses melalui browser di:
👉 **http://localhost:5173**

---
*Dokumentasi ini mencerminkan status implementasi terkini dari repositori Hermes Agentic Hub.*
