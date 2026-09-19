# Product Requirements Document (PRD)
# Hermes Agentic Hub (Multica-Style Work Management)

## 1. Overview & Vision
Hermes Agentic Hub adalah web application command-center bergaya modern (dark mode, keyboard-driven seperti Linear/Multica) yang mengintegrasikan alur kerja manusia dan agen AI berbasis **Hermes Agent**.

Sistem ini memungkinkan pengguna untuk:
1. Mengelola tugas teknis melalui papan Kanban visual (*My Issues* dan *Issues*).
2. Mendelegasikan tugas ke **Squad AI** dengan pola **Lead Orchestrator + Specialist Members**.
3. Memantau eksekusi otomatis berkala melalui modul **Autopilot** (Hermes Cron).
4. Melakukan review hasil pekerjaan agen di panel **Inbox** sebelum dinyatakan selesai (*Human-in-the-Loop*).

---

## 2. System Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│          FRONTEND: Vite + React 19 + TypeScript             │
│    Tailwind CSS v4 + Radix UI / Lucide + TanStack Query     │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API + WebSocket
┌──────────────────────────────▼──────────────────────────────┐
│                    HERMES AGENT ENGINE                      │
│                                                             │
│ • Kanban Engine: hermes_cli/kanban_db.py & plugin_api.py   │
│ • Web Routers: /api/plugins/kanban, /api/cron, /api/skills  │
│ • Cron Scheduler: cron/scheduler.py                        │
│ • Multi-Profile Fleet: ~/.hermes/profiles/<name>/           │
│ • Shared Storage: ~/.hermes/kanban/kanban.db, state.db     │
└─────────────────────────────────────────────────────────────┘
```

### Stack Detail
* **Frontend:** Vite, React 19, TypeScript, Tailwind CSS, Lucide React, TanStack Query, Zustand.
* **Backend Harness:** Hermes Agent Web Server (FastAPI) via router `/api/plugins/kanban` dan `/api/cron`.
* **State & Persistence:** SQLite database (`kanban.db`), file konfigurasi profil Hermes (`config.yaml`), dan skills repository.

---

## 3. UI/UX & Design Guidelines
* **Multi-Theme Support:**
  * **Themes:** Light Mode, Dark Mode, dan System Default Preference.
  * **Dark Mode Palette:** Background `#0D0F12`, Card/Surface `#16191E`, Border `#23272F`, Text `#F3F4F6`, Accent `#3B82F6` / `#6366F1`.
  * **Light Mode Palette:** Background `#F8FAFC`, Card/Surface `#FFFFFF`, Border `#E2E8F0`, Text `#0F172A`, Accent `#2563EB` / `#4F46E5`.
  * **Theme Switcher:** Tersedia di Header dan Settings (bisa switch instant via toggle button atau shortcut).
* **Typography:** Inter / sans-serif, monospaced untuk kode tiket dan status (`DIK-55`).
* **Keyboard Shortcuts:**
  * `Ctrl + K`: Global Search modal
  * `C`: Quick create new issue
  * `B`: Switch to Board view
  * `T`: Switch to Table/List view

---

## 4. Detailed Module Specifications

### 4.1. Global Navigation & Header
* **Sidebar:**
  * Workspace selector (`DikstraCloud`).
  * Quick Actions: Search (`Ctrl K`), New Issue (`C`).
  * Personal: `Inbox` (badge unread count), `My Issues`, `Chat`.
  * Work: `Issues` (global), `Projects`, `Autopilot`.
  * AI Team: `Agents`, `Squads`, `Skills`, `Runtimes`, `Analytics`, `Settings`.
* **Header Bar:**
  * Dynamic breadcrumb navigation.
  * Live Agent Status: `X agents working` (terhubung ke endpoint `GET /workers/active`).
  * Action controls: Theme Switcher (Light/Dark/System toggle), Filter, Display options, Board/List toggle.

### 4.2. Issues & Kanban Board (`My Issues` & `Issues`)
* **Kanban Columns (Mapping status Hermes Kanban):**
  1. `Backlog`: Tugas baru yang belum dialokasikan untuk sprint/eksekusi.
  2. `Todo / Ready`: Tugas siap dieksekusi manual atau diklaim oleh agen.
  3. `In Progress`: Tugas aktif yang sedang diproses agen atau manusia.
  4. `In Review`: Tugas yang telah diselesaikan agen dan butuh verifikasi user.
  5. `Blocked`: Tugas terhambat (ketergantungan belum selesai atau dispatcher breaker).
  6. `Done`: Tugas yang telah diverifikasi dan ditutup.
* **Card Attributes:**
  * Task ID (`DIK-XX`), Judul, Snippet Deskripsi.
  * Assignee: Avatar manusia atau identitas Agen (`AWS Solution Architect`, dll).
  * Project Tag (*e.g.* `KPC-Cloud-Managed Services`, `Email Management`).
  * Priority indicator: Urgent (merah), High (kuning), Medium, Low, None.
  * Relative timestamp (*e.g.* `Updated 2d ago`).

### 4.3. Inbox (Human-in-the-Loop Review Center)
* **Split-View Layout:**
  * **Left Pane (Notification List):**
    * Daftar notifikasi dari agen: perubahan status ke *In Review*, mention, atau permintaan input.
    * Indikator status (lingkaran warna) dan waktu update.
  * **Right Pane (Detail & Verification):**
    * Tampilan hasil kerja agen (Markdown formatted report, diagram, log ringkasan).
    * Action buttons:
      * `Approve / Mark Done`: Memanggil `kanban_complete`.
      * `Request Changes`: Memanggil `kanban_request_changes` untuk mengembalikan ke agen implementer dengan catatan revisi.
      * `Comment`: Menambahkan umpan balik di thread tiket.

### 4.4. Projects (Workstream & Board Management)
* **Table View:**
  * Daftar proyek dengan kolom: Name, Status (`Planned`, `Active`, `Paused`), Priority, Progress (`Done/Total`), Lead, Created date.
* **Project Board View:**
  * Papan Kanban terisolasi per proyek (`hermes kanban boards switch <slug>`).
  * Project Shared Context: Kolom deskripsi proyek yang secara otomatis menjadi system context bagi semua agen di proyek tersebut.
  * Resources: Tombol untuk melampirkan folder lokal (`Add local directory`) dan repositori Git.

### 4.5. Autopilot (Autonomous Scheduler)
* **Tabel Jadwal Rutin:**
  * Kolom: Name, Assignee (Agent), Trigger (`Schedule` interval/cron expression), Last run, Next run.
  * Integrasi: Terhubung ke engine `hermes cron` (`cron/scheduler.py`).
  * Contoh use case: Pengecekan email berkala (setiap 2 jam), backup arsitektur, sinkronisasi cloud.

### 4.6. AI Team (Agents, Squads, Skills)
* **Agents (Hermes Profiles):**
  * Memetakan ke direktori profil Hermes (`~/.hermes/profiles/<name>/`).
  * Tabel profil dengan kolom: Agent Name, Status (Online/Idle), Role Description (`hermes profile describe`), Model Runtime, Working Directory (`terminal.cwd`).
* **Squads (Multi-Agent Orchestrator):**
  * Struktur: 1 Team Lead (Orchestrator) + N Member Specialists.
  * Mekanisme: Tiket yang di-assign ke Squad diproses oleh Team Lead menggunakan fitur `hermes kanban decompose`, memecah issue menjadi child tasks yang diserahkan ke agen spesialis sesuai profil keahliannya.
* **Skills (Skill Catalog):**
  * Katalog modul skill (`~/.hermes/skills/`).
  * Informasi penggunaan (*Used by agents*, *Added by*).
  * Manajemen enable/disable skill per profil.

---

## 5. API Contracts & Hermes Harness Mapping

| Modul UI | Endpoint Hermes API | Metode | Fungsi Backend |
|---|---|---|---|
| **Kanban Board** | `/api/plugins/kanban/board` | `GET` | Mengambil seluruh task dan kolom status |
| **Task Create** | `/api/plugins/kanban/tasks` | `POST` | Membuat task baru dengan assignee & tags |
| **Task Update** | `/api/plugins/kanban/tasks/{id}` | `PATCH` | Drag & drop status, ganti priority/assignee |
| **Task Review** | `/api/plugins/kanban/tasks/{id}` | `POST/PATCH`| Trigger `request-review` atau `complete` |
| **Active Agents**| `/api/plugins/kanban/workers/active` | `GET` | Mengambil daftar agen yang sedang bekerja |
| **Event Stream** | `/api/plugins/kanban/events` | `WebSocket` | Real-time push update task & notifikasi inbox |
| **Boards** | `/api/plugins/kanban/boards` | `GET/POST` | Mengambil & membuat board/project terisolasi |
| **Autopilot** | `/api/cron` | `GET/POST` | Mengelola scheduled cron jobs |
| **Profiles** | `/api/plugins/kanban/profiles` | `GET/PATCH`| Mengambil profil Hermes & role description |
| **Skills** | `/api/skills` | `GET` | Mengambil katalog skill terinstal |

---

## 6. Implementation Roadmap

### Phase 1: Project Setup & Core Shell
* Inisialisasi Vite + React + TypeScript + Tailwind CSS.
* Setup multi-theme provider (Dark, Light, System) & responsive layout: persistent sidebar, top navigation bar, theme switcher, status pill agen aktif.
* Konfigurasi routing untuk semua view: `My Issues`, `Inbox`, `Issues`, `Projects`, `Autopilot`, `Agents`, `Squads`, `Skills`.

### Phase 2: Kanban & Issues Engine
* Integrasi REST client dan mock/live data mapping ke schema Hermes Kanban.
* Komponen Papan Kanban visual dengan drag-and-drop antar status.
* Modal pembuatan tiket baru (`New Issue`) lengkap dengan pemilihan assignee & project.

### Phase 3: Inbox & Review Center
* Implementasi split view Inbox (list notifikasi kiri, detail preview kanan).
* Markdown renderer untuk laporan hasil analisis agen.
* Aksi interaktif: Approve (`Done`), Request Changes, dan thread komentar.

### Phase 4: AI Team & Autopilot
* Halaman Agents (tabel profil Hermes dengan status).
* Halaman Squads (orkestrasi Lead + Member).
* Halaman Skills (katalog tools & instruksi).
* Halaman Autopilot (scheduler list & trigger cron).

---
*Dokumen ini merupakan acuan resmi pengembangan antarmuka Hermes Agentic Hub.*
