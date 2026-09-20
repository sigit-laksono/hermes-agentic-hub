# 📋 Implementation Tasks: Hermes Agentic Hub (Multica Style)

Dokumen ini merupakan turunan teknis langsung dari [doc/PRD.md](doc/PRD.md) yang menyusun seluruh rencana kerja implementasi ke dalam *actionable tasks*, lengkap dengan penanggung jawab file (*target files*), kontrak API Hermes, dan kriteria keberhasilan (*acceptance criteria*).

---

## 📊 Status Progres Ringkas

| Tahapan | Fokus Area | Estimasi Task | Status |
|---|---|:---:|:---:|
| **Fase 1** | Native Hermes AI Actions (Specify, Decompose, Estimate, Links) | 5 Tasks | `[x] Completed` |
| **Fase 2** | Live Interactive Chat & Sessions (WebSocket & Session Manager) | 5 Tasks | `[x] Completed` |
| **Fase 3** | Multi-Board & Workspace Isolation (Projects & Context) | 4 Tasks | `[x] Completed` |
| **Fase 4** | Deep Profile Fleet & Squad Orchestration (SOUL.md, Cockpit & Knobs) | 5 Tasks | `[x] Completed` |
| **Fase 5** | Rich Markdown, Syntax Highlighting & Deliverables Polish | 3 Tasks | `[x] Completed` |
| **Fase 6** | End-to-End Testing, Regression Check & Production Build | 3 Tasks | `[ ] Ready` |

---

## 🚀 Fase 1: Native Hermes AI Task Actions

Fokus: Mengaktifkan kapabilitas AI bawaan Hermes Agent yang sudah ada di backend ke dalam kartu Kanban dan modal detail tugas.

- [x] **TASK-1.1: Penambahan Client API Hermes untuk AI Actions**
  - **Target File:** `src/api/hermesApi.ts`
  - **Deskripsi:** Menambahkan fungsi pemanggilan API ke backend:
    - `specifyTask(taskId: string, board?: string)` → `POST /api/plugins/kanban/tasks/{id}/specify`
    - `decomposeTask(taskId: string, board?: string)` → `POST /api/plugins/kanban/tasks/{id}/decompose`
    - `estimateTask(taskId: string, board?: string)` → `POST /api/plugins/kanban/tasks/{id}/estimate`
    - `getTaskLinks(taskId: string, board?: string)` & `createTaskLink(...)` → `/api/plugins/kanban/links`
  - **Kriteria Penerimaan:** Semua fungsi mengembalikan respons terstruktur tanpa unhandled promise rejection.

- [x] **TASK-1.2: Fitur AI Specify Task di Modal Detail**
  - **Target File:** `src/components/TaskDetailModal.tsx`
  - **Deskripsi:** 
    - Menambahkan tombol **🪄 AI Specify** di toolbar bagian atas deskripsi tiket.
    - Saat ditekan, menampilkan status loading animasi ("*Hermes is analyzing and specifying task...*").
    - Memperbarui judul tiket (*new_title*) dan memperkaya deskripsi tiket dengan *acceptance criteria* serta arsitektur target yang dihasilkan LLM.
  - **Kriteria Penerimaan:** Deskripsi tiket diperbarui secara real-time dan tersimpan otomatis ke database SQLite.

- [x] **TASK-1.3: Fitur AI Task Decompose (Parent-Child Tasks)**
  - **Target File:** `src/components/TaskDetailModal.tsx`, `src/types.ts`
  - **Deskripsi:**
    - Menambahkan tombol **🧩 Decompose** di toolbar aksi tiket.
    - Memanggil `decomposeTask`, membedah issue besar menjadi sub-tugas (*child tasks*).
    - Menampilkan komponen **Subtasks / Child Tasks Tree** di dalam modal dengan checkbox progres dan assignee per sub-task.
  - **Kriteria Penerimaan:** Anak tugas baru muncul di board Kanban dan di dalam thread relasi tiket induk.

- [x] **TASK-1.4: Widget Complexity & Token Estimator**
  - **Target File:** `src/components/TaskDetailModal.tsx`, `src/components/KanbanBoard.tsx`
  - **Deskripsi:**
    - Menyediakan tombol atau badge **📊 Estimate** di sidebar properties tiket.
    - Menampilkan hasil estimasi: tingkat kerumitan (*low / medium / high*), estimasi token, alasan (*rationale*), dan model LLM yang disarankan.
  - **Kriteria Penerimaan:** Hasil estimasi dirender dengan visual badge yang informatif di sidebar tiket.

- [x] **TASK-1.5: Indikator Relasi & Ketergantungan Tugas (Task Dependencies)**
  - **Target File:** `src/components/TaskDetailModal.tsx`, `src/components/KanbanBoard.tsx`
  - **Deskripsi:**
    - Menambahkan dropdown pengait relasi di sidebar properties: *"Blocks"* atau *"Blocked by"*.
    - Menampilkan badge visual gembok 🔒 pada kartu Kanban jika tiket memiliki status *blocked by* tiket lain yang belum selesai.
  - **Kriteria Penerimaan:** Operator dapat menghubungkan dependensi antar tugas dan melihat status penghambat dengan jelas.

---

## 💬 Fase 2: Live Interactive Chat & Sessions

Fokus: Mengintegrasikan obrolan langsung real-time dengan agen Hermes berbasis WebSocket, manajemen riwayat sesi, dan konversi chat menjadi tiket.

- [x] **TASK-2.1: Mount Router Chat & Sessions di Backend Bridge**
  - **Target File:** `server.py`
  - **Deskripsi:**
    - Mengimpor dan me-mount router native Hermes:
      - `from hermes_cli.web_routers import chat_ws` → mount di `/api/chat`
      - `from hermes_cli.web_routers import sessions` → mount di `/api/sessions`
    - Memastikan penanganan token sesi WebSocket (`HERMES_DASHBOARD_SESSION_TOKEN`) terkonfigurasi dengan benar untuk upgrade koneksi WS chat.
  - **Kriteria Penerimaan:** Endpoint `/api/sessions` merespons daftar sesi dan handshake `/api/chat/ws` berhasil.

- [x] **TASK-2.2: Implementasi API Client untuk Chat & Sessions**
  - **Target File:** `src/api/hermesApi.ts`, `src/types.ts`
  - **Deskripsi:**
    - Membuat helper `getSessions()`, `createSession()`, `deleteSession()`, dan `getSessionMessages(sessionId)`.
    - Mengimplementasikan WebSocket client handler untuk obrolan interaktif (menangani pesan streaming token, status tool-call, dan pesan selesai).
  - **Kriteria Penerimaan:** Client dapat mengirim pesan ke agen dan menerima streaming token respons.

- [x] **TASK-2.3: Pembuatan Antarmuka `ChatView.tsx`**
  - **Target File:** `src/components/ChatView.tsx`, `src/App.tsx`
  - **Deskripsi:**
    - Membangun layout 2 panel bergaya Multica/Linear:
      - **Panel Kiri:** Daftar riwayat sesi percakapan terdahulu + tombol `+ New Chat`.
      - **Panel Kanan:** Area obrolan interaktif dengan header pemilih profil agen (`sa-aws`, `sa-microsoft`, `technical-writer`, `default`).
    - Input chat responsif dengan dukungan multiline (`Shift + Enter` untuk newline, `Enter` untuk mengirim).
  - **Kriteria Penerimaan:** Pengguna dapat memilih agen, mengobrol, dan melihat pesan terkirim/terima secara real-time.

- [x] **TASK-2.4: Visualisasi Tool-Call & Thought Trace**
  - **Target File:** `src/components/ChatView.tsx`
  - **Deskripsi:**
    - Menampilkan *collapsible block* saat agen memanggil tools (Bash, Python, File Read/Write, Search).
    - Menampilkan animasi denyut (*thinking / executing tool*) saat agen sedang memproses tindakan.
  - **Kriteria Penerimaan:** Langkah kerja alat (*tool trace*) terlihat rapi tanpa mengacaukan teks obrolan utama.

- [x] **TASK-2.5: Aksi "Convert Message to Kanban Issue"**
  - **Target File:** `src/components/ChatView.tsx`, `src/components/NewIssueModal.tsx`
  - **Deskripsi:**
    - Menambahkan tombol aksi cepat pada *bubble* pesan rekomendasi agen: **"Create Issue from Chat"**.
    - Membuka modal `NewIssueModal` dengan judul dan deskripsi yang sudah otomatis terisi dari konteks obrolan tersebut.
  - **Kriteria Penerimaan:** Hasil diskusi teknis di chat dapat dialihkan menjadi tiket tugas di Kanban board hanya dalam satu klik.

---

## 🗂️ Fase 3: Multi-Board & Workspace Isolation (Projects)

Fokus: Mengaktifkan pemisahan papan kerja antar proyek dan menyuntikkan konteks arsitektur proyek ke agen.

- [x] **TASK-3.1: Global Board Context & Header Board Switcher**
  - **Target File:** `src/App.tsx`, `src/components/Header.tsx`, `src/types.ts`
  - **Deskripsi:**
    - Menambahkan state `activeBoard` (default: `'default'`) pada state aplikasi utama.
    - Menambahkan dropdown *Board Switcher* di Header atas di samping nama workspace.
    - Menyinkronkan seluruh pemanggilan data tugas (`getBoard`, `createTask`, `updateTaskStatus`) dengan menyertakan parameter `board: activeBoard`.
  - **Kriteria Penerimaan:** Mengganti board di header langsung memuat tugas-tugas milik board tersebut dari backend.

- [x] **TASK-3.2: Navigasi Proyek ke Kanban Board Terisolasi**
  - **Target File:** `src/components/ProjectsView.tsx`, `src/App.tsx`
  - **Deskripsi:**
    - Menjadikan baris proyek di `ProjectsView` dapat diklik secara interaktif.
    - Saat baris proyek diklik, aplikasi mengubah `activeBoard` menjadi slug proyek tersebut dan otomatis berpindah ke tab `My Issues` / `Issues`.
  - **Kriteria Penerimaan:** Pengguna dapat berpindah dari daftar proyek langsung ke board kerja proyek terkait.

- [x] **TASK-3.3: Project Shared Context Editor**
  - **Target File:** `src/components/ProjectsView.tsx`, `src/api/hermesApi.ts`
  - **Deskripsi:**
    - Menyediakan drawer / modal *Project Settings & Shared Context*.
    - Memungkinkan pengguna mengisi pedoman teknis proyek (misal: "Gunakan Terraform AWS Provider v5+, penamaan resource format `kpc-prod-*`").
    - Menyimpan deskripsi proyek ke backend via `PATCH /api/plugins/kanban/boards/{slug}`.
  - **Kriteria Penerimaan:** Deskripsi tersimpan di database Hermes dan otomatis menjadi *system prompt* agen pelaksana di board tersebut.

- [x] **TASK-3.4: Dialog Manajemen Board Baru & Ekspor/Impor**
  - **Target File:** `src/components/NewProjectModal.tsx`
  - **Deskripsi:**
    - Validasi pembuatan slug board unik tanpa spasi/karakter khusus.
    - Menyediakan tombol opsi ekspor board (`POST /api/plugins/kanban/boards/{slug}/export`) ke file JSON cadangan.
  - **Kriteria Penerimaan:** Board baru berhasil dibuat dan langsung muncul di dropdown pemilih board.

---

## 👥 Fase 4: Deep Profile Fleet & Squad Orchestration

Fokus: Manajemen mendalam armada agen, penyuntingan persona `SOUL.md`, konfigurasi model LLM, kontrol orkestrasi pipeline tim, dan katalog skill.

- [x] **TASK-4.1: Agent Profile Inspector Drawer (SOUL.md, Skills & History)**
  - **Target File:** `src/components/AITeamViews.tsx`, `src/api/hermesApi.ts`, `src/types.ts`
  - **Deskripsi:**
    - Perbarui tipe `AIAgent` di `src/types.ts` agar menyertakan `model?: string`, `provider?: string`, `path?: string`, `isDefault?: boolean`, `skillCount?: number`.
    - Saat baris agen diklik di `AgentsView`, buka drawer rincian profil di sisi kanan (`AgentDetailDrawer`).
    - Menampilkan informasi: Status live, badge Default/Specialist, Avatar, Model aktif, Provider, Working Directory, dan Path direktori Hermes.
    - Implementasikan editor teks untuk membaca (`GET /api/profiles/{name}/soul`) dan menyimpan perubahan persona (`PUT /api/profiles/{name}/soul`). Sediakan tombol *"Insert Recommended Template"* jika file masih kosong.
    - Sediakan section/tab **Allowed Skills** yang menampilkan daftar skill aktif untuk profil tersebut dengan toggle per-profil via `PUT /api/skills/toggle?profile={name}`.
    - Tampilkan section **Completed Tasks** yang menyaring tiket dari board yang diselesaikan oleh agen ini (`status === 'done'`).
  - **Kriteria Penerimaan:** Pengguna dapat melihat profil lengkap agen, menyunting file `SOUL.md` secara persisten, dan mengelola skill khusus profil tersebut.

- [x] **TASK-4.2: Model & Provider Switcher per Profil**
  - **Target File:** `src/components/AITeamViews.tsx`, `src/api/hermesApi.ts`
  - **Deskripsi:**
    - Tambahkan helper `getModelOptions()` di `hermesApi.ts` yang memanggil `GET /api/plugins/kanban/model-options`.
    - Tambahkan helper `updateProfileModel(name: string, provider: string, model: string)` yang memanggil `PUT /api/profiles/{name}/model`.
    - Di dalam `AgentDetailDrawer`, sediakan dropdown pemilihan Provider (Anthropic, OpenAI, DeepSeek, Ollama, dll.) dan Model berdasarkan katalog backend. Sediakan input custom model fallback jika model tidak ada di daftar.
    - Saat disimpan, kirim payload `{ provider, model }` ke backend.
  - **Kriteria Penerimaan:** Perubahan model dan provider tersimpan langsung ke file `config.yaml` profil terkait di `~/.hermes/profiles/` atau root `~/.hermes/`.

- [x] **TASK-4.3: Squad Orchestrator Cockpit (Pipeline & Knobs Controller)**
  - **Target File:** `src/components/AITeamViews.tsx` (SquadsView), `src/api/hermesApi.ts`
  - **Deskripsi:**
    - Rombak tampilan tabel mock `SquadsView` menjadi **Orchestrator Cockpit**:
      1. **Pipeline Visualizer:** Diagram interaktif alur orkestrasi: `Lead Orchestrator (Decomposing)` ➔ `Specialist Fleet (Executing)` ➔ `Human-in-the-Loop (Inbox Verification)`.
      2. **Orchestration Knobs Panel:** Form pengaturan yang terhubung ke `GET` dan `PUT /api/plugins/kanban/orchestration`:
         - Dropdown **Lead Orchestrator**: Memilih profil penanggung jawab pemecahan tiket.
         - Dropdown **Default Assignee**: Profil default penampung tiket baru.
         - Switch **Auto Decompose on Triage**: Pembedahan otomatis saat issue masuk kolom triage/backlog.
         - Switch **Auto Promote Children**: Pemindahan otomatis anak tugas ke todo saat dependensi selesai.
    - Tambahkan fungsi `updateOrchestration(...)` di `hermesApi.ts` untuk memanggil `PUT /api/plugins/kanban/orchestration`.
  - **Kriteria Penerimaan:** Pengaturan tersimpan persisten ke `config.yaml` Hermes dan visualisasi pipeline mencerminkan profil agen riil.

- [x] **TASK-4.4: Skills Catalog Drawer & Master Toggle**
  - **Target File:** `src/components/AITeamViews.tsx` (SkillsView), `src/api/hermesApi.ts`
  - **Deskripsi:**
    - Tambahkan helper `getSkillContent(name: string)` (`GET /api/skills/content?name={name}`) dan `toggleSkill(name: string, enabled: boolean)` (`PUT /api/skills/toggle`) di `hermesApi.ts`.
    - Menjadikan baris skill di `SkillsView` dapat diklik untuk membuka drawer detail `SKILL.md` (read-only markdown previewer).
    - Tampilkan metadata: Kategori, badge status (Enabled/Disabled), provenance (hub/bundled/agent), dan usage counter.
    - Sediakan sakelar toggle enable/disable global langsung pada baris tabel dan di dalam drawer.
  - **Kriteria Penerimaan:** Operator dapat membaca rincian instruksi `SKILL.md` dan mengaktifkan/menonaktifkan skill secara global.

- [x] **TASK-4.5: Create New Agent Modal (Profile Creation)**
  - **Target File:** `src/components/AITeamViews.tsx` (AgentsView), `src/api/hermesApi.ts`
  - **Deskripsi:**
    - Hubungkan tombol `+ New agent` di `AgentsView` untuk membuka modal `NewAgentModal`.
    - Form modal meliputi: Nama profil (slug huruf kecil tanpa spasi), Display Name, Deskripsi peran, Opsi Clone from Default Profile, serta Model & Provider awal.
    - Tambahkan fungsi `createProfile(...)` di `hermesApi.ts` yang memanggil `POST /api/profiles`.
    - Setelah berhasil dibuat, refresh daftar agen dan otomatis buka drawer profil baru tersebut.
  - **Kriteria Penerimaan:** Profil agen baru berhasil dibuat di `~/.hermes/profiles/<name>/` dan langsung dapat ditugaskan pada tiket Kanban.

---

## 🎨 Fase 5: Rich Markdown, Syntax Highlighting & Deliverables Polish

Fokus: Meningkatkan kualitas visual rendering laporan teknis dan peninjauan artefak kode/diagram.

- [x] **TASK-5.1: Integrasi Rich Markdown & Code Syntax Highlighting**
  - **Target File:** `src/components/TaskDetailModal.tsx`, `src/components/InboxView.tsx`
  - **Deskripsi:**
    - Mengimplementasikan komponen renderer Markdown untuk deskripsi tugas, laporan akhir agen (*review report*), dan komentar.
    - Menambahkan penyorotan sintaksis (*syntax highlighting*) otomatis dengan tombol *Copy Code* untuk blok kode Terraform (`hcl`), YAML, Python, Bash, JSON, dan SQL.
  - **Kriteria Penerimaan:** Blok kode dan laporan agen dirender rapi seperti format Linear/GitHub tanpa teks mentah yang berantakan.

- [x] **TASK-5.2: In-App SVG & Image Architecture Diagram Preview**
  - **Target File:** `src/components/TaskDetailModal.tsx`, `src/components/InboxView.tsx`
  - **Deskripsi:**
    - Jika artefak atau lampiran bertipe `.svg`, `.png`, atau `.jpg`, sediakan tab/modal preview gambar interaktif (dengan opsi zoom in/out).
  - **Kriteria Penerimaan:** Diagram arsitektur cloud yang digambar oleh agen dapat langsung dilihat tanpa harus mengunduh file secara manual.

- [x] **TASK-5.3: Multica UI Polish & Keyboard Shortcut Enhancements**
  - **Target File:** `src/components/Sidebar.tsx`, `src/components/Header.tsx`, `src/index.css`
  - **Deskripsi:**
    - Menghaluskan transisi tema gelap/terang (`#0D0F12` vs `#F8FAFC`).
    - Menambahkan shortcut baru: `B` (berpindah ke Board view), `T` (berpindah ke Table view), `Esc` (menutup drawer/modal).
  - **Kriteria Penerimaan:** Navigasi terasa cepat, mulus, dan konsisten di seluruh resolusi layar.

---

## 🧪 Fase 6: Testing, End-to-End Verification & Production Build

Fokus: Memastikan seluruh alur bekerja tanpa cela dan bebas bug sebelum rilis produksi.

- [ ] **TASK-6.1: Verifikasi Alur End-to-End Tugas Otonom**
  - **Langkah Pengujian:**
    1. Buat issue baru secara ringkas melalui modal `New Issue` (`C`).
    2. Jalankan **AI Specify** untuk melengkapi instruksi.
    3. Jalankan **AI Decompose** untuk memecah tugas menjadi sub-tasks.
    4. Klik **⚡ Run Agent** dan amati telemetri proses (`psutil`) serta streaming log worker secara live.
    5. Setelah selesai, buka tiket di **Inbox**, periksa file kode/laporan, lalu klik **Approve & Done**.
  - **Kriteria Penerimaan:** Seluruh tahapan berjalan sukses dan status tugas berpindah ke `done` di database SQLite Hermes.

- [ ] **TASK-6.2: Verifikasi Alur Chat-to-Issue**
  - **Langkah Pengujian:**
    1. Buka tab **Chat**, pilih profil agen spesialis (misal: `sa-aws`).
    2. Kirim instruksi konsultasi arsitektur cloud.
    3. Klik **Create Issue from Chat** pada rekomendasi agen.
    4. Pastikan tiket baru langsung muncul di kolom `Todo` papan Kanban.
  - **Kriteria Penerimaan:** Transisi dari ruang obrolan ke papan manajemen kerja berjalan instan.

- [ ] **TASK-6.3: Production Build & Healthcheck Check**
  - **Langkah Pengujian:**
    1. Jalankan `npm run build` untuk memverifikasi kompilasi TypeScript dan bundler Vite.
    2. Pastikan tidak ada *circular dependencies* atau *React hook warnings*.
    3. Periksa respons endpoint kesehatan backend (`GET /api/health`).
  - **Kriteria Penerimaan:** Build sukses dengan `dist/` ter-bundle bersih tanpa error.

---

## 📌 Catatan Pelaksanaan & Aturan Pengembangan

1. **Prioritas Eksekusi:** Pengerjaan dilakukan berurutan mulai dari **Fase 1** (Native AI Actions) lalu berlanjut ke **Fase 2** (Live Chat), sesuai urutan nilai tambah tertinggi.
2. **Kepatuhan Terhadap Backend:** Hindari mengubah skema tabel database Hermes (`kanban.db`) secara manual di luar fungsi native yang disediakan `hermes_cli.kanban_db`.
3. **Pembaruan Dokumen:** Setiap kali satu task selesai diimplementasikan, tandai kotak centang `[x]` pada dokumen ini sebagai rekam jejak progres resmi.
