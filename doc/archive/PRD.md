# Product Requirements Document (PRD)
# Hermes Agentic Hub: Multica-Inspired AI Agent Orchestration Platform

* **Workspace Target:** `DikstraCloud`
* **Core Harness:** [Hermes Agent Core Engine](https://github.com/NousResearch/hermes-agent) (Nous Research)
* **Status Dokumen:** Living Document (Updated)
* **Versi:** 2.0.0

---

## 1. Executive Summary & Visi Produk

### 1.1. Latar Belakang
Pengelolaan agen AI otonom modern membutuhkan antarmuka yang melampaui sekadar kotak obrolan (*chatbot*). Pengguna membutuhkan ekosistem kerja terstruktur seperti **Multica / Linear** yang memadukan:
1. **Papan Manajemen Tugas (Kanban):** Mendelegasikan tugas teknis kompleks ke berbagai profil agen spesialis.
2. **Koordinasi Multi-Agen (Squad Orchestration):** Agen orkestrator (Team Lead) yang memecah masalah besar menjadi sub-tugas (*child tasks*) untuk agen spesialis.
3. **Observabilitas & Intervensi Live:** Memantau eksekusi perintah terminal secara real-time, melihat konsumsi memori/CPU, serta intervensi darurat (*Emergency Stop / Terminate*).
4. **Verifikasi Manusia (Human-in-the-Loop):** Ruang inspeksi hasil kerja agen (Inbox) sebelum kode atau arsitektur diterapkan ke sistem produksi.
5. **Diskusi Interaktif Langsung (Chat & Sessions):** Ruang konsultasi dan eksplorasi real-time dengan agen yang dapat dikonversi langsung menjadi tiket pekerjaan.

### 1.2. Tujuan Integrasi Hermes Agent Harness
Membangun satu kesatuan utuh (*seamless integration*) antara tampilan modern bergaya Multica/Linear dengan seluruh kapabilitas asli (*native*) **Hermes Agent** yang berjalan di Linux/WSL (`~/.hermes/hermes-agent`):
* Mengeliminasi data *mock / placeholder* pada modul Chat, Squads, dan Settings.
* Mengaktifkan kemampuan *native AI* Hermes yang sudah ada di backend: **AI Task Decompose**, **AI Task Specify**, **Complexity Estimator**, dan **Task Dependency Linking**.
* Mendukung pemisahan ruang kerja berbasis **Multi-Board (Projects)** dengan *Project Shared Context*.

---

## 2. Arsitektur Sistem 3-Tier

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          TIER 1: FRONTEND WEB APPLICATION                              │
│                  (Vite 6 + React 19 + TypeScript 5.7 + Tailwind CSS v4)                │
│                                                                                        │
│  • Keyboard-Centric Navigation (C, Ctrl+K)    • Interactive Kanban Board (HTML5 DND)  │
│  • Multica Issue Detail Drawer                • Live Interactive Agent Chat (WS)      │
│  • AI Actions (Specify, Decompose, Estimate)  • Split-Pane HITL Inbox Review Center    │
│  • Project Board Switcher                     • Telemetry & Process Terminal Inspector│
│  • Multi-Profile Fleet & Squad Manager        • Autopilot Cron Schedule Controller     │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ HTTP/REST & WebSocket (/api/*)
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                       TIER 2: HERMES HARNESS BRIDGE API SERVICE                        │
│                             (FastAPI Uvicorn - Port 9120)                              │
│                                                                                        │
│  File: server.py                                                                       │
│  ├── /api/plugins/kanban/ : Tasks, Boards, Runs, Events, Attachments, Decompose, etc.  │
│  ├── /api/cron/           : Scheduled Autopilot Jobs (List, Create, Trigger, Pause)    │
│  ├── /api/skills/         : Capabilities & Tool Instructions Catalog                   │
│  ├── /api/profiles/       : Agent Profile Fleet & Metadata Configurations              │
│  ├── /api/chat/ & /ws/    : Interactive Real-time WebSocket Chat with Hermes Engine   │
│  ├── /api/sessions/       : Agent Session Management, History, & Transcripts          │
│  └── /api/ws-token        : Authenticated Session Token for Live Dashboard Stream      │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Direct Python Binding & SQLite IPC
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                            TIER 3: HERMES AGENT CORE ENGINE                            │
│  • Core Database: ~/.hermes/kanban.db & state.db                                       │
│    - Tabel: tasks, task_comments, task_events, task_runs, task_attachments, task_links │
│  • Multi-Profile Engine: ~/.hermes/profiles/<profile_name>/                            │
│    - Config: config.yaml (Model, Provider, Tools, Workdir)                             │
│    - Persona: SOUL.md (System Instructions & Operating Philosophy)                     │
│  • Workspaces & Storage: ~/.hermes/kanban/workspaces/ & logs/                          │
│  • Auxiliary LLM Client: Task decompose, auto-specification, complexity estimation    │
│  • Gateway & Background Dispatcher: hermes kanban dispatch loop                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Spesifikasi Fitur Detail (Feature Requirements)

### 3.1. Modul Work Management (Kanban & Issues)

#### A. Interactive Kanban Board (`KanbanBoard.tsx`)
* **6 Tahapan Status Hermes:**
  1. `Backlog` (`triage`): Tiket yang baru dibuat dan belum dijadwalkan.
  2. `Todo` (`todo` / `ready`): Tiket yang siap dieksekusi oleh agen atau operator.
  3. `In Progress` (`running`): Tiket yang sedang aktif dikerjakan oleh worker agent.
  4. `In Review` (`review`): Tiket yang telah diselesaikan agen dan menunggu verifikasi manusia.
  5. `Blocked`: Tiket yang tertunda karena ketergantungan tiket lain atau *circuit breaker*.
  6. `Done`: Tiket yang telah disetujui dan ditutup.
* **Fitur Utama Kartu:**
  * **⚡ Quick Run Agent:** Tombol langsung pada kartu untuk memicu eksekusi agen instan tanpa membuka terminal.
  * **Sub-tasks Progress Indicator:** Menampilkan progres anak tugas (misal `☑ 2/4 subtasks`).
  * **Dependency Badge:** Menampilkan ikon gembok jika tiket berstatus *blocked by* tiket lain.
  * **Drag & Drop Murni:** Pemindahan kolom status menggunakan native HTML5 Drag and Drop dengan auto-sync backend.

#### B. Multica Issue Detail Drawer (`TaskDetailModal.tsx`)
* **Struktur 2 Kolom:**
  * **Kolom Utama (Kiri):**
    * Judul tiket & deskripsi markdown yang dapat diedit (*inline editing*).
    * **AI Action Toolbar:**
      * 🪄 **Specify Task (`POST /api/plugins/kanban/tasks/{id}/specify`):** Meminta agen mengeksplorasi dan melengkapi deskripsi tiket dengan *acceptance criteria*, prasyarat arsitektur, dan checklist langkah teknis.
      * 🧩 **Decompose Task (`POST /api/plugins/kanban/tasks/{id}/decompose`):** Membedah tiket besar menjadi *child tasks* yang otomatis ditambahkan ke board dan di-assign ke spesialis terkait.
      * 📊 **Estimate Complexity (`POST /api/plugins/kanban/tasks/{id}/estimate`):** Menganalisis estimasi token, tingkat kerumitan, dan model yang disarankan.
    * **Child Tasks Tree / Sub-tasks List:** Menampilkan daftar sub-tugas yang terhubung dengan tiket induk beserta status pengerjaannya.
    * **Real-time Activity Feed (`task_events`):** Menampilkan riwayat event sistem (perubahan status, trigger run, worker claim).
    * **Dynamic Comment Thread (`task_comments`):** Diskusi kolaboratif manusia dan agen dengan upload lampiran (gambar/file).
  * **Sidebar Properties (Kanan - Collapsible):**
    * **Status Dropdown:** Pemilih status langsung (`PATCH /api/plugins/kanban/tasks/{id}`).
    * **Assignee Dropdown:** Pemilih agen dinamis berbasis profil Hermes aktif (`/api/profiles`).
    * **Project / Board:** Penanda workspace board tempat tiket berada.
    * **Priority Selector:** Urgent (merah), High (kuning), Medium, Low, None.
    * **Dependencies / Links (`/api/plugins/kanban/links`):** Menambahkan relasi `blocks` atau `blocked_by` terhadap tiket lain.
    * **Execution Log & Telemetry Drawer:** Tombol untuk membuka log output terminal worker dan host telemetry (`psutil` CPU & RAM).
    * **🛑 Emergency Stop Button:** Terminasi proses worker aktif seketika (`/runs/{id}/terminate`).

---

### 3.2. Modul Interactive Chat & Sessions (`ChatView.tsx`)

* **Tujuan:** Menghilangkan placeholder kosong pada menu Chat dengan mengintegrasikannya ke engine obrolan interaktif Hermes (`hermes_cli.web_routers.chat_ws` dan `sessions`).
* **Fitur Utama:**
  1. **Multi-Profile Selector:** Pengguna dapat memilih profil agen yang diajak bicara (misal `sa-aws`, `sa-microsoft`, atau `default`).
  2. **Streaming Real-Time Chat:** Komunikasi dua arah berbasis WebSocket dengan rendering output streaming token per token.
  3. **Tool Call & Thought Trace:** Menampilkan visual accordion saat agen menjalankan tool (misal: *Reading files...*, *Executing bash command...*).
  4. **Session History Manager:**
     * Menampilkan daftar sesi percakapan sebelumnya (`GET /api/sessions`).
     * Kemampuan membuat sesi baru (*New Chat*) atau melanjutkan sesi lama.
  5. **Convert Chat to Kanban Issue:**
     * Tombol *"Convert to Issue"* pada pesan agen atau rangkuman chat untuk langsung membuat tiket Kanban baru tanpa perlu *copy-paste* manual.

---

### 3.3. Modul Multi-Board & Workspace Isolation (Projects)

* **Tujuan:** Mengaktifkan isolasi papan kerja per proyek sesuai fitur native Hermes Agent (`hermes kanban boards switch <slug>`).
* **Fitur Utama:**
  1. **Global Board Context Switcher:**
     * Dropdown pemilih Board aktif di Header aplikasi (misal: `Default Board`, `KPC-Managed-Services`, `Infrastructure-Migration`).
     * Navigasi Kanban otomatis menyesuaikan query `?board=<slug>`.
  2. **Interaktif Projects Table (`ProjectsView.tsx`):**
     * Mengklik baris proyek langsung mengarahkan pengguna ke Kanban board proyek tersebut.
  3. **Project Shared Context:**
     * Setiap project/board memiliki konfigurasi deskripsi & instruksi arsitektur khusus yang secara otomatis disuntikkan ke dalam *system prompt* agen saat menjalankan tiket di board tersebut.
  4. **Board Management Modal:**
     * Membuat board baru (`POST /api/plugins/kanban/boards`).
     * Ekspor & Impor board dalam format JSON untuk backup/restore.

---

### 3.4. Modul AI Team Fleet & Squad Orchestration (`AITeamViews.tsx`)

#### A. Agents Management (Hermes Profiles)
* Terhubung langsung ke direktori profil Hermes (`~/.hermes/profiles/<profile_name>/` dan `~/.hermes/` untuk default).
* **Agent Profile Inspector Drawer (`AgentDetailDrawer`):**
  * **Header & Metadata Profil:** Nama display, status live (online/busy/offline), avatar, jenis profil (Default Core vs Specialist), working directory, dan path profil.
  * **Persona & Instructions Editor (`SOUL.md`):**
    * Membaca isi persona via `GET /api/profiles/{name}/soul`.
    * Mengedit dan menyimpan pembaruan persona via `PUT /api/profiles/{name}/soul` (atomic write).
    * Opsi *"Insert Recommended Template"* jika `SOUL.md` kosong untuk membantu menyusun persona standar (Role, Core Principles, Deliverables Quality).
  * **Model & Provider Configuration:**
    * Mengambil katalog model aktif melalui `GET /api/plugins/kanban/model-options`.
    * Memilih provider dan model LLM per profil via `PUT /api/profiles/{name}/model`.
  * **Per-Profile Allowed Skills:** Mengatur dan menonaktifkan skill spesifik profil melalui `PUT /api/skills/toggle?profile={name}`.
  * **Completed Tasks History:** Menampilkan riwayat tiket tugas yang pernah diselesaikan oleh agen ini (berstatus `done`).
* **Create New Agent Modal (`NewAgentModal`):**
  * Memungkinkan pembuatan profil agen baru melalui `POST /api/profiles`.
  * Opsi clone konfigurasi dari profil `default`, penentuan provider, model, dan deskripsi peran agen.

#### B. Squad Orchestrator Cockpit (Pipeline & Knobs Controller)
* Menggantikan tabel mock multi-squad dengan **Orchestration Cockpit** terpadu yang terhubung langsung ke `GET` & `PUT /api/plugins/kanban/orchestration`:
  * **Pipeline Flow Visualizer:** Diagram alur koordinasi tugas otonom: `Lead Orchestrator (Decompose)` ➔ `Specialist Workers Fleet (Execute)` ➔ `Human-in-the-Loop Reviewer (Verify)`.
  * **Orchestrator Knobs Form:**
    * **Team Lead / Orchestrator Profile:** Profil penanggung jawab yang memecah tiket triage menjadi sub-tugas.
    * **Default Assignee Profile:** Profil penampung tiket baru yang dibuat tanpa assignee eksplisit.
    * **Toggle Auto Decompose on Triage:** Mengaktifkan pemecahan tiket otomatis saat issue masuk ke Backlog/Triage.
    * **Toggle Auto Promote Children:** Otomatis memindahkan anak tugas ke kolom `Ready/Todo` ketika dependensi pendahulunya selesai.

#### C. Skills Catalog & Tool Management (`SkillsView`)
* Terhubung ke katalog skill Hermes (`~/.hermes/skills/`) via `/api/skills`.
* **Skill Detail Drawer:**
  * Klik pada kartu/baris skill membuka drawer inspeksi instruksi teknis lengkap dari `SKILL.md` via `GET /api/skills/content?name={name}`.
  * Menampilkan metadata: Kategori, counter pemakaian (*usage counter*), dan asal usul (*provenance: hub / bundled / agent*).
* **Global Master Switch:** Sakelar toggle enable/disable skill secara global via `PUT /api/skills/toggle`.

---

### 3.5. Modul Human-in-the-Loop (HITL) Inbox (`InboxView.tsx`)

* **Tujuan:** Pusat persetujuan hasil kerja agen sebelum ditutup atau diterapkan.
* **Fitur Utama:**
  1. **Dual-Tab Review Workspace:**
     * **Tab 1: Executive Summary:** Laporan temuan, narasi eksekutif, dan rangkuman penyelesaian tugas dari agen.
     * **Tab 2: Deliverables & Files:** Galeri file teknis yang dihasilkan (`.tf`, `.yaml`, `.py`, `.sh`, `.json`, `.svg`, `.md`).
  2. **In-App Code & Artifact Previewer:**
     * Penampil kode bawaan dengan *syntax highlighting*, nomor baris, dan tombol salin kode satu-klik.
     * Penampil visual instan untuk diagram arsitektur format SVG/PNG.
  3. **Aksi Verifikasi:**
     * **`Approve & Done`:** Menyelesaikan tiket dan mengubah status menjadi `done`.
     * **`Request Changes`:** Memasukkan catatan revisi/perbaikan yang otomatis diposting sebagai komentar baru, lalu mengembalikan tiket ke status `in_progress` agar dikerjakan ulang oleh agen.

---

### 3.6. Modul Autopilot (Autonomous Cron Scheduler)

* Terhubung ke engine scheduler Hermes (`hermes cron` via `/api/cron/jobs`).
* **Fitur:**
  * Melihat jadwal rutin yang terpasang (Nama, Assignee Agent, Jadwal Cron/Interval, Status Aktif/Pause).
  * **Run Now:** Memicu eksekusi jadwal saat itu juga tanpa menunggu jam cron.
  * **Pause / Resume:** Menghentikan sementara atau melanjutkan jadwal.
  * **New Autopilot Modal:** Membuat jadwal otomatis baru dengan prompt dan profil pelaksana yang ditentukan.

---

## 4. Pemetaan API Backend Bridge (`server.py`)

| Modul UI | Endpoint Hermes API | Metode | Deskripsi Fungsional |
|---|---|---|---|
| **Kanban Board** | `/api/plugins/kanban/board` | `GET` | Mengambil struktur kolom dan kartu tugas |
| **Task Create** | `/api/plugins/kanban/tasks` | `POST` | Membuat tugas baru dengan assignee & board |
| **Task Update** | `/api/plugins/kanban/tasks/{id}` | `PATCH` | Mengubah status, judul, assignee, priority |
| **Task Run** | `/api/plugins/kanban/tasks/{id}/run` | `POST` | Memicu eksekusi agen worker secara langsung |
| **Task Specify** | `/api/plugins/kanban/tasks/{id}/specify` | `POST` | **[NEW]** AI melengkapi rincian & acceptance criteria |
| **Task Decompose** | `/api/plugins/kanban/tasks/{id}/decompose` | `POST` | **[NEW]** AI memecah tiket menjadi sub-tugas |
| **Task Estimate** | `/api/plugins/kanban/tasks/{id}/estimate` | `POST` | **[NEW]** Estimasi token & kompleksitas tugas |
| **Task Links** | `/api/plugins/kanban/links` | `POST/DEL` | **[NEW]** Mengatur dependensi blocking antar tiket |
| **Task Comments** | `/api/plugins/kanban/tasks/{id}/comments` | `POST` | Menambahkan komentar / revisi pada tiket |
| **Task Log** | `/api/plugins/kanban/tasks/{id}/log` | `GET` | Mengambil streaming log worker mentah |
| **Run Inspect** | `/api/plugins/kanban/runs/{run_id}/inspect` | `GET` | Telemetri host proses worker (CPU/RAM `psutil`) |
| **Run Terminate** | `/api/plugins/kanban/runs/{run_id}/terminate` | `POST` | Menghentikan paksa proses worker (SIGTERM/KILL) |
| **Deliverables** | `/api/plugins/kanban/tasks/{id}/attachments` | `GET/POST` | Mengelola artefak hasil kerja agen |
| **Multi-Boards** | `/api/plugins/kanban/boards` | `GET/POST` | Mengambil & membuat board kerja terisolasi |
| **Orchestration** | `/api/plugins/kanban/orchestration` | `GET/PUT` | Mengatur profil Orchestrator, Default Assignee, Auto-Decompose |
| **Model Options** | `/api/plugins/kanban/model-options` | `GET` | Mengambil katalog curated providers dan model options |
| **Profile Soul** | `/api/profiles/{name}/soul` | `GET/PUT` | Membaca & menyimpan atomic write file `SOUL.md` profil |
| **Profile Model** | `/api/profiles/{name}/model` | `PUT` | Mengubah provider dan model LLM profil agen |
| **Profile Create** | `/api/profiles` | `POST` | Membuat/clone profil agen Hermes baru |
| **Skills Content** | `/api/skills/content` | `GET` | Membaca instruksi teknis file `SKILL.md` |
| **Skills Toggle** | `/api/skills/toggle` | `PUT` | Mengaktifkan/menonaktifkan skill (global atau per-profile) |
| **Interactive Chat** | `/api/chat/ws` & `/api/sessions` | `WS/GET` | Obrolan interaktif real-time dengan agen |
| **Profiles** | `/api/profiles` | `GET/PATCH` | Mengelola konfigurasi profil armada agen |
| **Skills** | `/api/skills` | `GET` | Katalog kemampuan dan tools agen |
| **Autopilot** | `/api/cron/jobs` | `GET/POST` | Mengelola jadwal cron otonom |

---

## 5. Roadmap Pelaksanaan Implementasi (Phased Plan)

```
[Phase 1: Native AI Task Actions] ──► [Phase 2: Live Interactive Chat] ──► [Phase 3: Multi-Board Switching]
                │                                    │                                  │
                ▼                                    ▼                                  ▼
[Phase 4: Squads & Profile Config] ─► [Phase 5: Markdown & Polish UI] ────► [Production Release v2.0]
```

### Phase 1: Native Hermes AI Task Actions
* **Target:** Task Detail Modal & Kanban Cards
* **Deliverables:**
  1. Tambahkan tombol **🪄 Specify** di `TaskDetailModal`: Mengisi dan merapikan deskripsi tiket secara otomatis.
  2. Tambahkan tombol **🧩 Decompose** di `TaskDetailModal`: Membedah tiket menjadi sub-tugas dan menampilkan daftar *child tasks*.
  3. Tambahkan widget **📊 Complexity Estimate** untuk menampilkan analisis token dan model rekomendasi.
  4. Integrasikan API `/api/plugins/kanban/links` untuk mengelola dependensi tugas.

### Phase 2: Live Interactive Chat & Sessions
* **Target:** Halaman `ChatView.tsx` dan Backend Bridge
* **Deliverables:**
  1. Mount router `chat_ws.py` dan `sessions.py` pada `server.py`.
  2. Implementasikan komponen obrolan interaktif dengan pilihan profil agen, tampilan streaming token, dan tool call accordion.
  3. Buat fitur tombol *"Convert to Kanban Issue"* dari pesan obrolan.

### Phase 3: Dynamic Multi-Board & Project Workspaces
* **Target:** Global Navigation, Header, dan `ProjectsView.tsx`
* **Deliverables:**
  1. Tambahkan dropdown *Board Switcher* di Topbar Header.
  2. Hubungkan klik baris proyek di `ProjectsView` untuk langsung beralih ke Kanban board proyek yang dipilih (`?board=<slug>`).
  3. Sediakan panel editor *Project Shared Context* (instruksi arsitektur per project).

### Phase 4: Deep Profile & Squad Orchestration Management
* **Target:** `AITeamViews.tsx` (Agents, Squads, Skills) dan API Clients
* **Deliverables:**
  1. **Agent Profile Inspector Drawer:** Membaca/mengedit persona `SOUL.md` (atomic write + template), switcher Model & Provider LLM terintegrasi katalog, manajemen skill terpasang per profil, serta riwayat tugas terselesaikan.
  2. **Squad Orchestrator Cockpit:** Merombak tampilan mock multi-squad menjadi Cockpit Pipeline Orkestrasi terpadu (visualisasi Lead ➔ Workers ➔ Reviewer) dan form pengaturan 4 knobs (`orchestrator_profile`, `default_assignee`, `auto_decompose`, `auto_promote_children`).
  3. **Skills Catalog Drawer & Master Toggle:** Pratinjau instruksi teknis file `SKILL.md` dan sakelar toggle enable/disable global.
  4. **Create New Agent Modal:** Modal pembuatan profil agen baru melalui `POST /api/profiles` dengan opsi cloning.

### Phase 5: Markdown Rendering, Syntax Highlighting, & Polish
* **Target:** Task Detail, Deliverables Preview, dan Inbox View
* **Deliverables:**
  1. Integrasi parser Markdown lengkap dengan *syntax highlighting* untuk format file kode teknis (`.tf`, `.yaml`, `.py`, `.sh`, `.json`, `.sql`).
  2. Penampil diagram arsitektur format `.svg` secara langsung di canvas aplikasi.
  3. Optimasi keyboard shortcut dan transisi UI bertema Multica/Linear.

---

## 6. Kriteria Keberhasilan (Definition of Done)

1. **Zero Phantom / Mock Tasks:** Seluruh data yang tampil di Kanban, Projects, Agents, dan Autopilot bersumber 100% dari database Hermes asli (`kanban.db`, `state.db`, `config.yaml`).
2. **End-to-End Autonomy:** Pengguna dapat membuat tugas ringkas, menekan *Specify* atau *Decompose*, lalu menekan *Run Agent* hingga agen menyelesaikan pekerjaan dan memunculkan hasilnya di *Inbox* untuk di-approve.
3. **Interactive Collaboration:** Pengguna dapat berdiskusi langsung di tab Chat dengan profil spesialis dan membuat tiket pekerjaan langsung dari riwayat percakapan.
4. **Workspace Stability:** Aplikasi bebas dari error blank-screen (didukung Error Boundary), sinkronisasi real-time instan melalui WebSocket, dan mendukung pergantian tema gelap/terang secara konsisten.

---
*Dokumen PRD ini disusun untuk Hermes Agentic Hub (DikstraCloud Workspace).*
