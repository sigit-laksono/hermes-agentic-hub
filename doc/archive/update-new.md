# 🚀 Proposal Arsitektur & Roadmap: Hermes Agentic Hub v2.5
## Penyatuan Native Projects, Kanban Task Orchestration, dan Bot Mode Multi-Agent

* **Target Dokumen:** `doc/update-new.md`
* **Status:** Proposal & Rencana Arsitektur
* **Tanggal:** 21 September 2026
* **Versi:** 2.5.0-draft

---

## 1. Executive Summary & Visi Evolusi

Hermes Agentic Hub berawal sebagai **Kanban Command Center** bergaya Linear/Multica untuk memantau pengerjaan tugas oleh agen AI Hermes. Fondasi awal ini berhasil memetakan siklus hidup tugas (*lifecycle*) 8 status kanonikal, dependency DAG (`task_links`), dan verifikasi *Human-in-the-Loop* (Inbox).

Namun, audit mendalam terhadap kapabilitas native **Hermes Agent Core** (`~/.hermes/hermes-agent`) menunjukkan bahwa Hermes memiliki 3 pilar yang saat ini belum terhubung secara organik di dalam Hub:
1. **First-Class Projects (`projects.db`):** Entitas proyek asli yang mengikat repositori Git fisik (`primary_path`), menyuntikkan *Project Shared Context* (`AGENTS.md`), dan mengisolasi eksekusi tugas ke dalam **Git Worktrees** terisolasi dengan penamaan branch deterministik (`slug-taskId`).
2. **Autonomous Kanban Engine (`kanban.db`):** Mesin orkestrasi tugas deterministik dengan dispatcher, respawn circuit-breaker, dan task dependency DAG.
3. **Conversational Bot Mode & Sessions (`state.db`):** Kolaborasi percakapan antar-bot menggunakan *canonical Bot Chat*, tool native `message_agent`, `@mentions`, dan *Group Chat Rooms* dengan giliran bertingkat (turn driver).

Proposal ini menyusun arsitektur penyatuan ketiga pilar tersebut: **Projects sebagai wadah repositori & konteks, Kanban sebagai pengendali alur status kerja, dan Bot Mode/Sessions sebagai mesin komunikasi serta eksekusi tugas interaktif.**

---

## 2. Analisis Komparasi: Fitur Kode Saat Ini vs Fitur Native Hermes

| Dimensi | Implementasi di Kode Kita Saat Ini (`hermes-agentic-hub`) | Kapabilitas Native Hermes Core (`hermes-agent`) | Analisis & Gap yang Teridentifikasi |
|---|---|---|---|
| **Manajemen Proyek (Projects)** | `ProjectsView.tsx` membaca daftar board dari `GET /boards` (Kanban). Konsep "Project" disamakan dengan "Kanban Board Slug". | Hermes memiliki `projects.db` independen (`hermes_cli/projects_db.py`). Project memiliki `primary_path` (lokasi repo Git), `board_slug`, dan cache repo discovery. | **Gap Arsitektur:** Saat ini aplikasi kita belum memanfaatkan `projects.db`. Agen tidak tahu path repositori Git tempat kode harus ditulis, sehingga default ke temporary scratch workspace. |
| **Workspace & Eksekusi Git** | Eksekusi task menggunakan `workspace_kind: 'scratch'` di direktori `~/.hermes/kanban/workspaces/{task_id}`. | Jika task terikat ke `project_id`, Hermes otomatis mengubah workspace menjadi `workspace_kind: 'worktree'` di `<repo>/.worktrees/<task-id>` dengan branch git mandiri. | **Peluang Besar:** Mengikat task ke Project memungkinkan agen membuat git branch & commits riil, lalu menghasilkan git diff asli di review center. |
| **Siklus Tugas (Kanban)** | 8 Kolom Status kanonikal (`triage` s/d `done`), Drag-drop HTML5, AI Specify, AI Decompose, Bulk Actions, Table View. | Engine `kanban.db`, auto-promote children saat parent done, link DAG, worker logging, telemetry psutil, per-profile concurrency cap. | **Sangat Selaras (100% Match):** Pondasi Kanban kita sudah sesuai dengan standar backend Hermes. |
| **Interaksi Chat & Sesi** | `ChatView.tsx` memanggil `/api/sessions` dan `/api/chat/ws`. Sesi obrolan bersifat umum (*generic chat*), terpisah total dari tugas Kanban. | Hermes memiliki sesi berbasis `state.db`. Setiap eksekusi task (`hermes -p <bot> chat -q "work kanban task..."`) sebenarnya adalah sebuah session. | **Gap Intervensi:** Saat ini task berjalan secara headless non-interaktif (hanya baca log stdout). Belum ada fitur intervensi langsung ke sesi task yang sedang running. |
| **Koordinasi Multi-Agent** | Orkestrasi berbasis squad statis di `AITeamViews.tsx`. Pemecahan tugas manual via `AI Decompose`. | **Bot Mode:** Tiap agen punya *canonical Bot Chat*, tool `message_agent`, `@mention`, serta Group Chat Room yang deliberatif (bisa saling diskusi). | **Gap Kolaborasi:** Agen belum bisa memanggil agen lain secara dinamis (Bot-to-Bot) di tengah pengerjaan sebuah tiket Kanban. |

---

## 3. Arsitektur Terpadu (Unified 3-Layer Architecture)

```mermaid
graph TB
    subgraph Layer 1: Context & Repository Anchor (projects.db)
        P[Native Project: projects.db]
        P -->|primary_path| REPO[Git Repository: ~/code/my-service]
        P -->|Project Context| CTX[AGENTS.md / Project Architecture Guidelines]
        P -->|Binds to| KB[Kanban Board: board_slug]
    end

    subgraph Layer 2: Work & State Orchestration (kanban.db)
        KB --> T1[Parent Task: Backend API]
        KB --> T2[Child Task: Auth Middleware]
        T1 -.->|Dependency Link| T2
        T1 --> DISP[Dispatcher & Circuit Breaker]
        T1 --> WT[Git Worktree: .worktrees/t_123]
        T1 --> HITL[Inbox Review: Code Diff & Deliverables]
    end

    subgraph Layer 3: Agent Collaboration & Execution (state.db)
        T1 -->|Dispatched Execution| SESS[Task Interactive Session]
        BM[Bot Mode Roster] -->|message_agent| SESS
        BM --> GRP[Group Chat Room: Team Deliberation]
        GRP -.->|Convert Decision to Task| T1
        SESS -->|Live Log & Intervention| UI[Web Cockpit Inspector]
    end
```

### Prinsip Utama Penyatuan:
1. **Project adalah Rumah Kode:** Project menentukan path repositori Git dan petunjuk kerja (`AGENTS.md`).
2. **Kanban Task adalah Kontrak Kerja:** Task menentukan target hasil, kriteria penerimaan, dependensi, dan status verifikasi.
3. **Session adalah Ruang Gerak Agen:** Ketika task berjalan di worktree project, agen bekerja di dalam session yang dapat diajak berinteraksi dan dapat memanggil bot lain via `message_agent`.

---

## 4. Rencana Implementasi Bertahap (Roadmap)

### 📌 FASE 1: Penyatuan Native Projects (`projects.db`) & Git Worktrees
**Fokus:** Menghubungkan modul Projects di UI langsung ke `projects.db` native Hermes dan mengaktifkan isolasi Git worktree.

1. **Backend Bridge Updates (`server.py`):**
   - Mount router native projects dari `hermes_cli.projects_db`.
   - Endpoint: `GET /api/projects`, `POST /api/projects`, `PATCH /api/projects/{id}`, `GET /api/projects/discovered-repos`.
2. **Frontend Projects Overhaul (`ProjectsView.tsx`):**
   - Menampilkan daftar Proyek asli dengan path repositori (`primary_path`) dan status Git branch.
   - Fitur "Browse / Pick Local Repo" untuk menghubungkan repositori lokal ke project.
3. **Worktree Task Creation (`NewIssueModal.tsx` & `kanban_db.py`):**
   - Saat membuat task di dalam Project, task otomatis diikat dengan `project_id`.
   - Backend Hermes otomatis mengeset `workspace_kind: 'worktree'`.
   - Agen bekerja di branch terpisah (misal `feat-t_663b67e`), mencegah konflik git di branch utama.

---

### 📌 FASE 2: Integrasi Bot Mode & Direct Agent Messaging
**Fokus:** Mengaktifkan komunikasi Bot-to-Bot dan roster agen pintar di antarmuka web.

1. **Roster Awareness & Protocol Injection:**
   - Menghubungkan profil agen ke `ui_meta: { hermes-bots: {} }` agar Hermes mengaktifkan tool native `message_agent`.
   - Memastikan canonical `Bot Chat` tersedia untuk setiap bot spesialis (`sa-aws`, `sa-microsoft`, `technical-writer`, dll.).
2. **Antarmuka Bot Chat di Web (`ChatView.tsx`):**
   - Tab khusus untuk melihat Canonical Bot Chat permanen per agen.
   - Autocomplete `@mention` di chat composer untuk memanggil bot lain (`@sa-aws`, `@writer`).
3. **Visualisasi Inter-Agent Activity:**
   - Menampilkan kartu khusus ketika sebuah bot memanggil bot lain menggunakan `message_agent`:
     `[🤖 sa-aws memanggil 📝 technical-writer untuk membuat draft dokumentasi]`.

---

### 📌 FASE 3: Task-to-Session Interactive Bridge
**Fokus:** Mengubah pemantauan worker dari log teks pasif menjadi sesi interaktif yang bisa diintervensi manusia.

1. **Interactive Session Terminal di Task Drawer (`TaskDetailModal.tsx`):**
   - Selain tab "Execution Log" (stdout pasif), sediakan tab **"Live Session"**.
   - Operator dapat mengirimkan input atau koreksi langsung ke agen yang sedang berjalan di tengah eksekusi task tanpa harus mematikan proses (*emergency stop*).
2. **Git Diff Viewer di Review Inbox (`InboxView.tsx`):**
   - Membaca perubahan git (`git diff`) langsung dari worktree task yang berstatus `review`.
   - Menampilkan visual diff (side-by-side / inline) sebelum operator menekan tombol "Approve & Done".

---

### 📌 FASE 4: Multi-Agent Group Deliberation Rooms
**Fokus:** Ruang diskusi kelompok multi-agen untuk perencanaan arsitektur sebelum tiket dipecah.

1. **Group Chat Management:**
   - Membuat Group Chat Room berisi 2–6 bot (misal Room "Cloud Migration": `sa-aws` + `sa-microsoft` + `database-engineer`).
   - Mendukung turn driver otomatis (maksimal 3 putaran diskusi cerdas).
2. **Action "Convert Deliberation to Kanban Epic":**
   - Tombol satu klik untuk mengekspor hasil kesepakatan diskusi tim menjadi 1 Epic Task di kolom `Triage`, lengkap dengan child tasks yang otomatis ter-decompose.

---

## 5. Skema Data & Kontrak API Tambahan

### A. Endpoint Proyek Native (`server.py`)
```http
GET    /api/projects                  -> List semua proyek dari projects.db
POST   /api/projects                  -> Buat proyek baru (nama, slug, primary_path, board_slug)
GET    /api/projects/{id}/repos       -> Deteksi repositori lokal
PATCH  /api/projects/{id}             -> Update konfigurasi proyek & context
```

### B. Payload Pembuatan Task Terikat Proyek
```json
{
  "title": "Setup S3 Glacier Lifecycle Policy",
  "body": "Implementasikan bucket policy sesuai kepatuhan...",
  "assignee": "sa-aws",
  "project_id": "proj_dikstracloud_01",
  "workspace_kind": "worktree"
}
```

---

## 6. Jaminan Kompatibilitas (Backward Compatibility)

1. **Zero Breaking Changes pada Kanban:**
   Seluruh tabel `kanban.db` (`tasks`, `task_runs`, `task_comments`, `task_links`) tetap menjadi *single source of truth* untuk papan tugas. Task tanpa `project_id` tetap berjalan normal di workspace `scratch`.
2. **Non-Destructive Database Updates:**
   Menggunakan API resmi `hermes_cli.projects_db` dan `hermes_cli.kanban_db` tanpa memodifikasi schema SQLite secara langsung.
3. **Graceful Fallback:**
   Jika repositori git proyek tidak valid atau worktree gagal dibuat, backend otomatis fallback ke direktori *scratch* yang aman.

---

## 7. Indikator Keberhasilan (Success Metrics)

- [ ] Proyek yang dibuat di UI terdaftar secara resmi di `~/.hermes/projects.db` dan dapat diakses via CLI `hermes project list`.
- [ ] Task yang di-run di dalam Project otomatis membuat git worktree dan commit di branch proyek.
- [ ] Agen di antarmuka chat dapat mengirimkan direct message ke agen lain via `message_agent` tanpa error unhandled tool call.
- [ ] Perubahan kode dari task yang selesai dapat di-review secara visual berupa git diff di tab Inbox sebelum di-approve ke branch utama.
- [ ] Lolos verifikasi build `npm run build` dan pembaruan Knowledge Graph `graphify update .`.
