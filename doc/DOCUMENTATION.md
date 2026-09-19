# Dokumentasi Implementasi: Hermes Agentic Hub

## 1. Ringkasan Proyek
* **Nama Aplikasi:** Hermes Agentic Hub (Workspace: `DikstraCloud`)
* **Live Public URL:** `https://hermes.dikstracloud.my.id`
* **Direktori Proyek:** `/home/ubuntu/hermes-agentic-hub`
* **Tujuan:** Antarmuka web terpadu (*command center*) bergaya **Linear / Multica** yang memfasilitasi kolaborasi antara manusia dan tim agen AI berbasis **Hermes Agent** secara *human-in-the-loop*.

---

## 2. Arsitektur Sistem & Integrasi Hermes Agent

Sistem dibangun dalam 3 lapisan arsitektur yang terhubung secara modular:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 LAPISAN 1: FRONTEND WEB APPLICATION                     │
│               (Vite 6 + React 19 + TypeScript + Tailwind v4)            │
│  • Dark/Light Multi-Theme    • Kanban Board View    • Split Inbox View   │
│  • Projects Overview         • Autopilot UI         • AI Team Management │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / HTTP Proxy (/api/*)
┌────────────────────────────────────▼────────────────────────────────────┐
│                 LAPISAN 2: HERMES HARNESS BRIDGE API                    │
│                        (FastAPI - Port 9120)                            │
│  File: /home/ubuntu/hermes-agentic-hub/server.py                        │
│  • Router Kanban: /api/plugins/kanban/ (Tasks, Boards, Events, Workers) │
│  • Router Cron:   /api/cron/jobs       (Jadwal Autopilot)               │
│  • Router Profiles: /api/profiles      (Hermes Profiles Fleet)          │
│  • Router Skills:   /api/skills        (Katalog Skill Terinstal)        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Native Python Binding & IPC
┌────────────────────────────────────▼────────────────────────────────────┐
│                 LAPISAN 3: HERMES AGENT CORE ENGINE                     │
│  • SQLite Storage: ~/.hermes/kanban.db & state.db                       │
│  • Multi-Profile Fleet: ~/.hermes/profiles/<profile>/config.yaml        │
│    - sa-aws (AWS Solutions Architect)                                   │
│    - sa-microsoft (Azure Specialist)                                    │
│    - technical-writer (Dokumentasi & POC)                               │
│    - database-engineer & default                                        │
│  • Scheduler: cron/scheduler.py & jobs.py                               │
│  • Background Dispatcher: hermes kanban dispatch / gateway loop         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Fitur-Fitur yang Telah Diimplementasikan

### A. Tampilan & UI/UX (Multi-Theme)
1. **Dukungan Tema Penuh (Dark / Light / System Preference):**
   * **Dark Mode:** Tema gelap modern khas Multica/Linear (`#0D0F12`, `#16191E`, `#23272F`).
   * **Light Mode:** Tema terang berdaya kontras tinggi (`#F8FAFC`, `#FFFFFF`, `#E2E8F0`).
   * **Theme Switcher:** Tombol toggle instan di header kanan (Sun / Moon / Monitor icon).
2. **Keyboard-Centric Navigation:**
   * Menekan tombol `C` membuka modal pembuatan tiket baru (*New Issue*).
   * Responsif untuk perangkat desktop maupun mobile (smartphone).
3. **Pembersihan Menu Sesuai Arahan:**
   * Menu yang tidak diminta (`Runtimes`, `Analytics`, dan footer `Join our Discord`) telah dihapus total.

---

### B. Modul Work Management

#### 1. Issues & My Issues (Papan Kanban Visual)
* **6 Kolom Alur Kerja Standar Hermes Kanban:**
  1. `Backlog` (Triage): Tiket yang baru masuk dan belum dijadwalkan.
  2. `Todo` (Ready): Tiket siap dieksekusi manual atau siap diklaim oleh agen AI.
  3. `In Progress` (Running): Tiket yang sedang aktif dikerjakan.
  4. `In Review` (Review): Tiket yang telah selesai dikerjakan agen dan menunggu persetujuan manusia.
  5. `Blocked`: Tiket yang tertunda (*circuit breaker* atau ketergantungan task lain).
  6. `Done`: Tiket yang telah disetujui dan ditutup.
* **Fitur Kartu Tiket:**
  * Kode tiket unik (*e.g.* `DIK-55`, `DIK-58`).
  * Badge prioritas (`Urgent`, `High`, `Medium`, `Low`, `None`).
  * Badge pelaksana (*Assignee*) dengan avatar profil agen atau anggota manusia.
  * Tag Proyek (*e.g.* `KPC-Cloud-Managed Services`, `Email Management`).
  * Filter cepat: `All`, `Members`, `Agents`.
  * Tombol aksi navigasi status cepat saat kursor di-hover.

#### 2. Inbox (Human-in-the-Loop Review Center)
* **Two-Pane Split View:**
  * **Panel Kiri (Daftar Notifikasi):** Menampilkan tiket berstatus `In Review` dan `Done` yang memerlukan review atau baru selesai.
  * **Panel Kanan (Ruang Verifikasi):** Menampilkan laporan detail dari agen AI (*Markdown report*, checklist verifikasi, ringkasan output teknis).
* **Tombol Aksi Keputusan:**
  * **`Approve & Done`**: Menyetujui hasil kerja agen dan memindahkan status tiket ke `Done`.
  * **`Request Changes`**: Mengembalikan tiket ke agen dengan status `In Progress` untuk diperbaiki.
  * **Feedback Box**: Kolom komentar/instruksi revisi tambahan.

#### 3. Projects (Multi-Workstream & Context Isolation)
* **Tampilan Tabel Proyek:**
  * Menampilkan nama proyek, status (`Active`, `Paused`, `Planned`), progres penyelesaian tugas (`Done/Total`), dan penanggung jawab (*Lead*).
  * Deskripsi proyek berfungsi sebagai *shared context* yang diinjeksi ke sistem prompt agen Hermes yang bekerja pada proyek tersebut.

---

### C. Modul AI Team & Autopilot (Integrasi Engine Hermes)

#### 1. Autopilot (Hermes Cron Scheduler)
* Terhubung langsung ke modul `hermes cron` bawaan sistem (`cron/scheduler.py`).
* Mengambil jadwal cron riil dari server:
  * **AWS-assessment-Weekly**: Skrip asesmen berkala akun AWS milik profil `sa-aws`.
  * **Daily Cost Monitoring**: Skrip monitoring tagihan harian AWS.
* Menampilkan waktu eksekusi terakhir (*Last Run*), jadwal berikutnya (*Next Run*), status aktif/pause, dan tombol pemicu manual (*Run now*).

#### 2. Agents (Hermes Multi-Profiles Fleet)
* Memetakan data dinamis dari direktori profil Hermes di mesin lokal (`~/.hermes/profiles/`).
* Menampilkan profil agen riil: `sa-aws`, `sa-microsoft`, `technical-writer`, `database-engineer`, dan `default`.
* Menampilkan runtime model, status gateway, dan deskripsi keahlian masing-masing profil.

#### 3. Squads (Multi-Agent Orchestrator)
* Menampilkan struktur tim agen dengan pola **1 Team Lead (Orchestrator)** dan **Specialist Members**.
* Mendukung alur kerja dekomposisi task: Lead Agent memecah issue (`hermes kanban decompose`) menjadi sub-tugas yang didistribusikan ke spesialis.

#### 4. Skills (Katalog Kemampuan Hermes)
* Mengambil daftar seluruh modul kemampuan yang terpasang di `~/.hermes/skills/` (seperti *aws-architecture-diagram*, *aws-cloudformation*, *aws-cdk*, *aws-security*, dll.) dalam format tabel katalog.

---

### D. Konfigurasi Jaringan & Akses Publik

1. **Vite 6 Security Host Whitelist:**
   * Konfigurasi `allowedHosts: true` pada `vite.config.ts` untuk mengizinkan request dari domain publik `hermes.dikstracloud.my.id`.
2. **Reverse Proxy Internal:**
   * Vite meneruskan request `/api/*` secara transparan ke backend bridge port `9120` (`http://127.0.0.1:9120`).
   * Browser mobile/publik memanggil API melalui *relative path* (`/api/...`), sehingga sepenuhnya terlindung di balik enkripsi SSL/TLS (HTTPS) Nginx.
3. **Persistensi Data:**
   * Setiap pembuatan tiket baru di UI otomatis tersimpan ke SQLite asli Hermes di `/home/ubuntu/.hermes/kanban.db`.
   * Dispatcher background Hermes dapat langsung mengeksekusi tiket secara otonom.

---
*Dokumen ini dibuat otomatis oleh Hermes Helper sebagai dokumentasi teknis resmi repositori.*
