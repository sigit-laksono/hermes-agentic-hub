# 🗺️ Master Release Roadmap: Hermes Agentic Hub

Dokumen ini adalah **peta jalan resmi (*single source of truth*)** yang menggabungkan seluruh rencana kerja dari audit gap analysis dan proposal arsitektur terpadu (*Unified 3-Layer Architecture*).

---

## 📌 Status Rilis Saat Ini: `v0.1.0` (Baseline Cockpit)

Aplikasi saat ini berada pada versi dasar **v0.1.0** dengan fitur yang telah selesai diimplementasikan:
- ✅ **Work Management:** 8 Kolom Status Kanban Kanonikal (`triage` ➔ `done`), Drag-and-Drop HTML5, Table / List View (`T`), Bulk Multi-Select Actions.
- ✅ **AI Native Actions:** AI Specify, AI Decompose (Parent-Child DAG), Complexity & Token Estimator.
- ✅ **Live Interactive Chat:** Native SSE Streaming (`POST /api/chat/start` + `GET /api/chat/stream`), Human-in-the-Loop Approval, YOLO Mode, Clarification Prompts, dan Live Telemetry (TPS, Context Gauge).
- ✅ **Review Center:** Split-pane Inbox dengan syntax highlighting code preview dan in-app SVG/Image diagram modal.
- ✅ **Security & Resilience:** Error Boundary, Dark/Light Theme System, dan Session Token WebSocket auth.

---

## 🚀 Rencana Rilis Mendatang (Sequential Release Versions)

Setiap folder versi di bawah ini memiliki pasangan dokumen lengkap:
- `PRD.md`: Rincian spesifikasi kebutuhan produk, arsitektur, dan kriteria penerimaan.
- `TASK.md`: Checklist teknis *actionable*, target berkas (*target files*), dan langkah implementasi.

```
doc/planning/
├── README.md               <-- (File ini: Master Roadmap & Status Index)
├── 0.1.1/                  <-- Autopilot, Skills & Profile Fleet Lifecycle
│   ├── PRD.md
│   └── TASK.md
├── 0.1.2/                  <-- Settings Hub & System Configuration
│   ├── PRD.md
│   └── TASK.md
├── 0.1.3/                  <-- First-Class Native Projects & Git Worktrees Execution
│   ├── PRD.md
│   └── TASK.md
├── 0.1.4/                  <-- Bot Mode, Agent Direct Messaging & Live Task Sessions
│   ├── PRD.md
│   └── TASK.md
├── 0.1.5/                  <-- Multi-Agent Group Deliberation Rooms & MCP Ecosystem
│   ├── PRD.md
│   └── TASK.md
└── 0.1.6/                  <-- Advanced Ecosystem: Analytics, Messaging & Voice AI
    ├── PRD.md
    └── TASK.md
```

---

## 📊 Matriks Detail Versi Rilis

| Versi | Fokus Utama | Asal Perencanaan | Jumlah Task | Status | Dokumen Terkait |
|:---:|---|---|:---:|:---:|---|
| **`v0.1.1`** | **Autopilot, Skills & Profile Fleet Lifecycle**<br>• Edit & Delete Cron Job, Riwayat Run<br>• In-App Skill Authoring (`SKILL.md`) & Toggle<br>• Profile Delete, Export, Import & Auto-Describe | Gap Analysis Fase 3 | 6 Tasks | `[ ] Ready` | [PRD](./0.1.1/PRD.md) • [TASK](./0.1.1/TASK.md) |
| **`v0.1.2`** | **Settings Hub & Full System Configuration**<br>• Layout Navigasi Sub-Menu Settings<br>• Config.yaml & Masked .env Editor<br>• Gateway Daemon Controller & API Key Pool<br>• Memory Inspector & Hermes Doctor Audit | Gap Analysis Fase 4 | 6 Tasks | `[ ] Planned` | [PRD](./0.1.2/PRD.md) • [TASK](./0.1.2/TASK.md) |
| **`v0.1.3`** | **Native Projects & Git Worktrees Execution**<br>• First-Class `projects.db` & Local Repo Picker<br>• Task Binding ke `project_id`<br>• Automated Git Worktrees (`.worktrees/<task-id>`)<br>• Visual Git Diff & Review di Inbox | Proposal Pilar 1 + Gap Analysis Fase 5 | 5 Tasks | `[ ] Planned` | [PRD](./0.1.3/PRD.md) • [TASK](./0.1.3/TASK.md) |
| **`v0.1.4`** | **Bot Mode, Direct Messaging & Task Sessions**<br>• Canonical Bot Chat per profil (`ui_meta`)<br>• Bot-to-Bot via `message_agent` Tool Call<br>• Autocomplete `@mention` Roster di Chat<br>• Task-to-Session Interactive Bridge di Drawer | Proposal Pilar 2 & 3 | 5 Tasks | `[ ] Planned` | [PRD](./0.1.4/PRD.md) • [TASK](./0.1.4/TASK.md) |
| **`v0.1.5`** | **Multi-Agent Group Rooms & MCP Ecosystem**<br>• Group Deliberation Rooms (2-6 bots, 3 rounds)<br>• Tombol "Convert Deliberation to Kanban Epic"<br>• MCP Server Catalog Browser & 1-Click Install<br>• Workspace File Browser | Proposal Pilar 4 + Gap Analysis Fase 6 | 6 Tasks | `[ ] Planned` | [PRD](./0.1.5/PRD.md) • [TASK](./0.1.5/TASK.md) |
| **`v0.1.6`** | **Advanced Ecosystem: Analytics, Omnichannel & Voice**<br>• Token Usage & Cost Intelligence Dashboard<br>• Telegram & WhatsApp Onboarding Wizard<br>• Voice Dictation (STT) & Speech Readout (TTS)<br>• Production Chunk Splitting & Hardening | Gap Analysis Fase 5/6/7 | 6 Tasks | `[ ] Planned` | [PRD](./0.1.6/PRD.md) • [TASK](./0.1.6/TASK.md) |

---

## 🎯 Panduan Urutan Eksekusi

1. **Mulai dari `0.1.1`:** Menyelesaikan fungsionalitas inti armada agen dan autopilot.
2. **Lanjut ke `0.1.2`:** Membuka akses kontrol sistem dan variabel environment via Web Settings.
3. **Lanjut ke `0.1.3`:** Membawa isolasi Git worktree riil ke seluruh pengerjaan tugas proyek.
4. **Lanjut ke `0.1.4`:** Menghidupkan kolaborasi Bot-to-Bot dan intervensi live session.
5. **Lanjut ke `0.1.5`:** Menambahkan ruang brainstorming tim dan katalog integrasi MCP.
6. **Lanjut ke `0.1.6`:** Menyempurnakan analitik biaya, onboarding bot chat, dan multimodal suara.
