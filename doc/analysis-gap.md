# Hermes Agentic Hub — Gap Analysis

> Audit lengkap perbandingan fitur frontend vs backend Hermes Agent.
> Tanggal: 20 September 2026

---

## Daftar Isi

- [Fitur yang Sudah Ada dan Berfungsi Benar](#fitur-yang-sudah-ada-dan-berfungsi-benar)
- [Masalah pada Fitur yang Sudah Ada](#masalah-pada-fitur-yang-sudah-ada)
- [Fitur yang Belum Ada — Prioritas Tinggi](#fitur-yang-belum-ada--prioritas-tinggi)
- [Fitur yang Belum Ada — Prioritas Sedang](#fitur-yang-belum-ada--prioritas-sedang)
- [Ringkasan](#ringkasan)

---

## Fitur yang Sudah Ada dan Berfungsi Benar

### Kanban Board

| Fitur | Endpoint Backend | Status |
|---|---|---|
| Menampilkan task per kolom | `GET /board` | ✅ OK |
| Buat task baru | `POST /tasks` | ✅ OK |
| Update status via drag-drop | `PATCH /tasks/{id}` | ✅ OK |
| Update assignee/priority/title/body | `PATCH /tasks/{id}` | ✅ OK |
| Tambah komentar ke task | `POST /tasks/{id}/comments` | ✅ OK |
| Detail task lengkap (komentar, events, runs, attachments) | `GET /tasks/{id}` | ✅ OK |
| Tombol "Run Agent" untuk dispatch worker | `POST /tasks/{id}/run` | ✅ OK |
| Dispatch pass penuh ke board | `POST /dispatch` | ✅ OK |
| Lihat log stdout/stderr worker | `GET /tasks/{id}/log` | ✅ OK |
| Specify task (pengayaan otomatis via LLM) | `POST /tasks/{id}/specify` | ✅ OK |
| Decompose task (pecah jadi sub-task via LLM) | `POST /tasks/{id}/decompose` | ✅ OK |
| Estimate task (estimasi token/kompleksitas) | `POST /tasks/{id}/estimate` | ✅ OK |
| Reclaim task (lepas worker claim) | `POST /tasks/{id}/reclaim` | ✅ OK |
| Manage dependency link antar task | `GET/POST/DELETE /links` | ✅ OK |
| Lihat active workers + telemetri (CPU/RAM/PID) | `GET /workers/active`, `GET /runs/{id}/inspect` | ✅ OK |
| Terminate worker (SIGTERM/SIGKILL) | `POST /runs/{id}/terminate` | ✅ OK |
| Upload, download, hapus attachment | `GET/POST/DELETE /tasks/{id}/attachments` | ✅ OK |
| Realtime update via WebSocket | `WS /events` | ✅ OK |

### Boards / Projects

| Fitur | Endpoint Backend | Status |
|---|---|---|
| List semua board | `GET /boards` | ✅ OK |
| Buat board baru | `POST /boards` | ✅ OK |
| Edit metadata board | `PATCH /boards/{slug}` | ✅ OK |
| Hapus/archive board | `DELETE /boards/{slug}` | ✅ OK |
| Switch board aktif | `POST /boards/{slug}/switch` | ✅ OK |
| Export board ke archive (tar.gz) | `POST /boards/{slug}/export` | ✅ OK |
| Export board ke JSON | `GET /boards/{slug}/export-json` | ✅ OK |
| Import board dari JSON | `POST /boards/import-json` | ✅ OK |

### Profiles / Agents

| Fitur | Endpoint Backend | Status |
|---|---|---|
| List semua profile | `GET /profiles` | ✅ OK |
| Buat profile baru | `POST /profiles` | ✅ OK |
| Baca dan edit soul/system prompt | `GET/PUT /profiles/{name}/soul` | ✅ OK |
| Update deskripsi profile | `PUT /profiles/{name}/description` | ✅ OK |
| Ganti model/provider per profile | `PUT /profiles/{name}/model` | ✅ OK |
| Lihat opsi model tersedia | `GET /model-options` | ✅ OK |

### Skills

| Fitur | Endpoint Backend | Status |
|---|---|---|
| List skills (global + per-profile) | `GET /skills` | ✅ OK |
| Enable/disable skill | `PUT /skills/toggle` | ✅ OK |
| Baca isi skill | `GET /skills/content` | ✅ OK |

### Cron / Autopilot

| Fitur | Endpoint Backend | Status |
|---|---|---|
| List cron jobs | `GET /cron/jobs` | ✅ OK |
| Buat cron job baru | `POST /cron/jobs` | ✅ OK |
| Trigger langsung ("Run Now") | `POST /cron/jobs/{id}/trigger` | ✅ OK |
| Pause dan Resume | `POST /cron/jobs/{id}/pause`, `/resume` | ✅ OK |

### Chat

| Fitur | Endpoint Backend | Status |
|---|---|---|
| List session chat | `GET /sessions` | ✅ OK |
| Buat, hapus, rename session | `POST/DELETE/PATCH /sessions/{id}` | ✅ OK |
| Baca history pesan | `GET /sessions/{id}/messages` | ✅ OK |
| Chat interaktif live via WebSocket | `WS /chat/ws` | ✅ OK |

### Orchestration

| Fitur | Endpoint Backend | Status |
|---|---|---|
| Baca setting orkestrator | `GET /orchestration` | ✅ OK |
| Update setting orkestrator | `PUT /orchestration` | ✅ OK |

### Lainnya

| Fitur | Endpoint Backend | Status |
|---|---|---|
| Health check | `GET /health` | ✅ OK |
| WebSocket auth token | `GET /ws-token` | ✅ OK |
| Error boundary (mencegah blank screen) | — (frontend only) | ✅ OK |
| Dark/Light mode + System theme | — (frontend only) | ✅ OK |
| Keyboard shortcuts (C, Ctrl+K, B, T, Esc) | — (frontend only) | ✅ OK |
| Global search modal | — (frontend only) | ✅ OK |

---

## Masalah pada Fitur yang Sudah Ada

### 1. Mapping Status Tidak Lengkap

Backend Hermes punya **8 kolom status**:

```
triage → todo → scheduled → ready → running → blocked → review → done
```

Frontend hanya punya **6 kolom**:

```
backlog → todo → in_progress → in_review → blocked → done
```

**Dampak:**
- Status `scheduled` dan `ready` di-merge ke `todo`, perbedaannya hilang.
- User tidak bisa membedakan task yang "ready" (siap dispatch, semua parent done) vs "todo" (masih menunggu parent).
- Ini penting karena dispatcher hanya mengambil task berstatus `ready`.

**Lokasi:** `src/App.tsx` baris 143–152 (`statusReverseMap`)

### 2. Tidak Ada Tombol Hapus Task

Backend punya `DELETE /tasks/{id}` tapi di frontend tidak ada tombol delete. User tidak bisa menghapus task yang salah dibuat.

**Lokasi:** Tidak ada di `TaskDetailModal.tsx`

### 3. Endpoint Reassign Tidak Dipakai

Backend punya `POST /tasks/{id}/reassign` yang lebih aman untuk reassign task yang sedang running (ada opsi `reclaim_first`). Frontend menggunakan `PATCH /tasks/{id}` dengan field assignee biasa, yang bisa gagal silent untuk task running.

**Lokasi:** `src/api/hermesApi.ts` — tidak ada method `reassignTask()`

### 4. Tidak Ada Bulk Operation

Backend punya `POST /tasks/bulk` untuk update banyak task sekaligus (ubah status, assignee, priority, archive). Di frontend tidak ada multi-select atau aksi massal.

**Lokasi:** Tidak ada di `KanbanBoard.tsx`

### 5. Halaman Settings Kosong

Tab "Settings" hanya menampilkan placeholder statis tanpa fungsionalitas.

**Lokasi:** `src/App.tsx` baris 667–679

### 6. Owner Di-hardcode

Nama `"Muhammad Sigit"` di-hardcode di beberapa tempat.

**Lokasi:**
- `src/api/hermesApi.ts` baris 499
- `src/App.tsx` baris 129

### 7. Double Call loadLiveData

`setTimeout(loadLiveData, 800)` dipanggil dua kali berturut-turut. Ini redundan dan menyebabkan double fetch.

**Lokasi:** `src/App.tsx` baris 517–518

### 8. Table/List View Tidak Ada Implementasi

Keyboard shortcut `T` untuk switch ke table view sudah ada dan state `viewMode` tersimpan, tapi kedua tab (`my_issues` dan `issues`) selalu render `KanbanBoard`. Tidak ada komponen `ListView`/`TableView`.

**Lokasi:** `src/App.tsx` baris 569–601

### 9. Translasi ID Rapuh

Konversi `"t_xxxx"` ke `"DIK-xxx"` menggunakan `string.replace('t_', 'DIK-')`. Ini tidak reliable — misalnya task `"t_abc123"` jadi `"DIK-abc123"` yang tidak match dengan pola numerik `"DIK-55"` di mock data.

**Lokasi:** `src/api/hermesApi.ts` baris 131–136, `src/App.tsx` baris 184

---

## Fitur yang Belum Ada — Prioritas Tinggi

### 1. Sistem Diagnostik dan Warning

Backend sudah punya `GET /diagnostics` yang mendeteksi task bermasalah (stuck, stale, loop detection). Setiap task di response `GET /board` juga sudah membawa field `diagnostics` dan `warnings`.

**Yang perlu dibuat:**
- Badge warning di setiap card task yang punya diagnostik
- Halaman atau panel diagnostik khusus
- Filter task berdasarkan severity (warning, error, critical)

**Endpoint:** `GET /api/plugins/kanban/diagnostics`

### 2. Notifikasi Home Channel

Backend punya endpoint untuk subscribe task ke platform messaging (Telegram, WhatsApp). User bisa "kirim notifikasi ke Telegram saat task selesai".

**Yang perlu dibuat:**
- Tombol di task detail untuk toggle subscribe ke platform
- Indikator platform mana yang sudah di-subscribe

**Endpoint:**
- `GET /api/plugins/kanban/home-channels`
- `POST /api/plugins/kanban/tasks/{id}/home-subscribe/{platform}`
- `DELETE /api/plugins/kanban/tasks/{id}/home-subscribe/{platform}`

### 3. Import Board dari Archive

Backend support import dari file `.tar.gz` native Hermes yang lebih lengkap (termasuk attachments dan logs). Frontend hanya support import JSON.

**Endpoint:** `POST /api/plugins/kanban/boards/import`

### 4. Hapus Profile

Backend punya `DELETE /profiles/{name}`. Di frontend tidak ada tombol hapus profile.

**Endpoint:** `DELETE /api/profiles/{name}`

### 5. Export/Import Profile

Berguna untuk backup atau migrasi profile antar mesin.

**Endpoint:**
- `POST /api/profiles/{name}/export`
- `POST /api/profiles/import`

### 6. Switch Active Profile

Backend punya cara untuk switch profile aktif Hermes secara global. Frontend tidak expose ini.

**Endpoint:**
- `GET /api/profiles/active`
- `POST /api/profiles/active`

### 7. Auto-Describe Profile

Backend punya fitur generate deskripsi profile secara otomatis menggunakan LLM. Belum ada tombolnya di frontend.

**Endpoint:** `POST /api/profiles/{name}/describe-auto`

### 8. Management Cron Job Lebih Lengkap

Yang belum ada di frontend:

| Fitur | Endpoint |
|---|---|
| Edit cron job | `PUT /cron/jobs/{id}` |
| Hapus cron job | `DELETE /cron/jobs/{id}` |
| History run per job | `GET /cron/jobs/{id}/runs` |
| Delivery targets (opsi kirim hasil ke mana) | `GET /cron/delivery-targets` |
| Blueprints/template siap pakai | `GET /cron/blueprints` |
| Buat job dari blueprint | `POST /cron/blueprints/instantiate` |

### 9. Buat dan Edit Skill

Backend punya `POST /skills` (buat skill baru) dan `PUT /skills/content` (edit isi skill). Frontend hanya bisa baca dan toggle on/off.

**Endpoint:**
- `POST /api/skills`
- `PUT /api/skills/content`

### 10. Board Stats

Backend punya `GET /stats` yang return jumlah task per status, per assignee, dan umur task tertua. Bisa ditampilkan sebagai ringkasan di header board atau sidebar.

**Endpoint:** `GET /api/plugins/kanban/stats`

### 11. Kanban Config

Backend punya preferensi dashboard (default tenant, lane by profile, include archived, render markdown). Frontend tidak menggunakannya.

**Endpoint:** `GET /api/plugins/kanban/config`

### 12. Known Assignees

Backend return gabungan semua profile + assignee yang sudah pernah dipakai di board. Frontend hanya pakai `getProfiles()` sehingga assignee lama yang profile-nya dihapus tidak muncul di picker.

**Endpoint:** `GET /api/plugins/kanban/assignees`

### 13. Projects Native Hermes

Backend punya entitas `Project` terpisah dari `Board`. Project bisa punya primary path, icon, color, dan di-scope ke board. Frontend menyamakan board = project.

**Endpoint:** `GET /api/plugins/kanban/projects`

---

## Fitur yang Belum Ada — Prioritas Sedang

### 14. Analytics / Usage Dashboard

Tracking pemakaian token dan biaya per model.

**Endpoint:**
- `GET /api/analytics/usage`
- `GET /api/analytics/models`

### 15. Integrasi Git

Backend punya router git lengkap: status, branches, worktrees, review diff, stage, commit, push, buat PR. Bisa digunakan untuk review code hasil agent langsung dari dashboard.

**Endpoint:** Seluruh `/api/git/*` router (~15 endpoint)

### 16. MCP Server Management

CRUD lengkap untuk MCP servers (Model Context Protocol) termasuk catalog, testing, dan OAuth.

**Endpoint:** Seluruh `/api/mcp/*` router (~10 endpoint)

### 17. Onboarding Messaging Platform

Flow onboarding untuk WhatsApp dan Telegram. User bisa setup koneksi messaging dari dashboard.

**Endpoint:** `/api/messaging/*` router

### 18. Tools/Toolsets Management

Listing toolset, enable/disable, config per toolset, pilih terminal backend.

**Endpoint:** `/api/tools/*` router

### 19. Memory Management

Baca memory agent, ganti provider memory, reset memory.

**Endpoint:**
- `GET /api/memory`
- `PUT /api/memory/provider`
- `POST /api/memory/reset`

### 20. Audio / Voice

Transcription, text-to-speech, ElevenLabs, live voice session.

**Endpoint:** `/api/audio/*` router

### 21. File Browser

File browser lengkap (list, baca, tulis, upload, download, mkdir). Berguna untuk browse workspace agent.

**Endpoint:** `/api/files/*` dan `/api/fs/*` router

### 22. System Status dan Ops

Status sistem, doctor (diagnosa), backup, security audit, config migration.

**Endpoint:**
- `GET /api/status`
- `GET /api/system/stats`
- `POST /api/ops/doctor`
- `POST /api/ops/backup`
- `POST /api/ops/security-audit`

### 23. Gateway Management

Start/stop/restart/drain gateway, manage webhooks.

**Endpoint:**
- `POST /api/gateway/start`
- `POST /api/gateway/stop`
- `POST /api/gateway/restart`
- `POST /api/gateway/drain`
- CRUD `/api/webhooks`

### 24. Credentials Pool

Pool kredensial (multiple API key per provider untuk load balancing).

**Endpoint:**
- `GET /api/credentials/pool`
- `POST /api/credentials/pool`
- `DELETE /api/credentials/pool/{provider}/{index}`

### 25. Config Editor

Edit konfigurasi Hermes dan environment variables. Halaman Settings yang sekarang kosong seharusnya pakai ini.

**Endpoint:**
- `GET/PUT /api/config`
- `GET/PUT /api/env`

### 26. Local Models

Cek hardware, browse catalog model lokal, download, install runtime.

**Endpoint:** `/api/local-models/*` router

### 27. Learning Graph (Curator)

Learning graph dengan node CRUD dan curator management.

**Endpoint:**
- `GET /api/learning/graph`
- `GET/PUT/DELETE /api/learning/node`
- `GET /api/curator`
- `PUT /api/curator/paused`
- `POST /api/curator/run`

---

## Ringkasan

| Metrik | Nilai |
|---|---|
| Endpoint yang sudah dipakai frontend | ~35 |
| Endpoint backend yang belum dipakai | ~100+ |
| Persentase coverage | ~25% |

### Prioritas Implementasi Berikutnya (Rekomendasi)

| No | Fitur | Effort | Impact |
|----|-------|--------|--------|
| 1 | Diagnostik/warning per task | Rendah (data sudah ada di response) | Tinggi |
| 2 | 8 kolom status (bukan 6) | Rendah | Tinggi |
| 3 | Halaman Settings fungsional (config + env editor) | Sedang | Tinggi |
| 4 | Hapus task + bulk operations | Rendah | Tinggi |
| 5 | Cron job lengkap (edit, hapus, history, blueprints) | Sedang | Tinggi |
| 6 | Table/list view | Sedang | Sedang |
| 7 | Analytics dashboard | Sedang | Tinggi |
| 8 | Git integration | Tinggi | Tinggi |
| 9 | Skill create/edit | Rendah | Sedang |
| 10 | Profile management lengkap (delete, export, import, switch) | Sedang | Sedang |
