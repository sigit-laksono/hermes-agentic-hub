# 📋 Actionable Tasks: Release v0.1.3
## First-Class Native Projects & Git Worktrees Execution

Dokumen task ini merupakan turunan teknis langsung dari [PRD.md](./PRD.md).

---

## 📊 Status Ringkasan Task

| ID Task | Judul Task | Prioritas | Target File | Status |
|---|---|:---:|---|:---:|
| **TASK-3.1** | Native Projects Backend Bridge (`projects.db` API) | 🔴 Kritis | `server.py`, `src/api/hermesApi.ts`, `src/types.ts` | `[ ] Ready` |
| **TASK-3.2** | Projects View Overhaul & Local Repo Discovery Picker | 🟠 Tinggi | `src/components/ProjectsView.tsx`, `src/components/NewProjectModal.tsx` | `[ ] Ready` |
| **TASK-3.3** | Automated Git Worktree Task Binding & Dispatch | 🔴 Kritis | `src/components/NewIssueModal.tsx`, `src/api/hermesApi.ts`, `server.py` | `[ ] Ready` |
| **TASK-3.4** | Git Router Mount & Review Diff Viewer in Inbox | 🟠 Tinggi | `server.py`, `src/api/hermesApi.ts`, `src/components/InboxView.tsx` | `[ ] Ready` |
| **TASK-3.5** | In-App Commit, Branch Switch & Create PR Action | 🟡 Sedang | `src/components/InboxView.tsx`, `src/api/hermesApi.ts` | `[ ] Ready` |

---

## 🚀 Rincian Spesifikasi Pengerjaan

### TASK-3.1: Native Projects Backend Bridge (`projects.db` API)
- **Target File:** `server.py`, `src/api/hermesApi.ts`, `src/types.ts`
- **Langkah Kerja:**
  1. Di `server.py`, import `hermes_cli.projects_db` dan buat endpoint:
     - `GET /api/projects`: memanggil `pdb.list_projects()`
     - `POST /api/projects`: memanggil `pdb.create_project()`
     - `PATCH /api/projects/{id}`: update nama, deskripsi, primary_path, board_slug
     - `GET /api/projects/discovered-repos`: memanggil `pdb.list_discovered_repos()`
  2. Tambahkan method pemanggil di `src/api/hermesApi.ts`.
  3. Perbarui type `Project` di `src/types.ts` agar mencakup `primary_path`, `board_slug`, `discovered_repos`.
- **Kriteria Penerimaan:**
  - [ ] Pemanggilan API mengembalikan daftar proyek nyata dari SQLite `~/.hermes/projects.db`.

---

### TASK-3.2: Projects View Overhaul & Local Repo Discovery Picker
- **Target File:** `src/components/ProjectsView.tsx`, `src/components/NewProjectModal.tsx`
- **Langkah Kerja:**
  1. Rombak `ProjectsView.tsx`: pisahkan tampilan Project Native (memiliki path repositori) dengan Board biasa.
  2. Di `NewProjectModal.tsx`, tambahkan input "Repository Path" dengan dropdown rekomendasi dari `discovered_repos`.
  3. Tambahkan field binding ke Kanban Board ("Bind to Board").
  4. Sediakan indikator status git: branch default, status worktree aktif.
- **Kriteria Penerimaan:**
  - [ ] Proyek baru tersimpan dengan path repositori yang valid dan otomatis membuat/mengikat board Kanban.

---

### TASK-3.3: Automated Git Worktree Task Binding & Dispatch
- **Target File:** `src/components/NewIssueModal.tsx`, `src/api/hermesApi.ts`, `server.py`
- **Langkah Kerja:**
  1. Di `NewIssueModal.tsx`, tambahkan pemilih Project (`project_id`).
  2. Saat project dipilih, payload `createTask` otomatis menyertakan:
     `{ project_id: selectedProject.id, workspace_kind: 'worktree' }`.
  3. Dispatcher Hermes secara otomatis memicu pembuatan git worktree di `<repo>/.worktrees/<task-id>`.
  4. Kartu tiket di Kanban menampilkan badge ikon git branch `git-branch` dengan nama branch deterministik.
- **Kriteria Penerimaan:**
  - [ ] Task dieksekusi di dalam branch git mandiri tanpa mengotori branch utama repositori.

---

### TASK-3.4: Git Router Mount & Review Diff Viewer in Inbox
- **Target File:** `server.py`, `src/api/hermesApi.ts`, `src/components/InboxView.tsx`
- **Langkah Kerja:**
  1. Di `server.py`, mount router `git.py` dari `hermes_cli.web_routers.git`.
  2. Tambah helper `getGitReviewDiff(path)` (`GET /api/git/review/diff`) di `hermesApi.ts`.
  3. Di `InboxView.tsx`, tambahkan tab **"Git Changes / Code Diff"** di samping tab Summary dan Deliverables.
  4. Render unified diff menggunakan `CodeBlock` dengan penyorotan warna merah (penghapusan) dan hijau (penambahan).
- **Kriteria Penerimaan:**
  - [ ] Operator dapat memeriksa setiap baris kode yang diubah oleh agen sebelum menyetujui tugas.

---

### TASK-3.5: In-App Commit, Branch Switch & Create PR Action
- **Target File:** `src/components/InboxView.tsx`, `src/api/hermesApi.ts`
- **Langkah Kerja:**
  1. Tambah method `commitReview(path, message)` dan `createPR(path, title, body)` di `hermesApi.ts`.
  2. Di panel Review Inbox, sediakan form commit message cepat: "feat(auth): add s3 glacier policy".
  3. Sediakan tombol "Commit to Branch" atau "Create Pull Request" saat tombol "Approve & Done" ditekan.
- **Kriteria Penerimaan:**
  - [ ] Perubahan kode otomatis ter-commit ke git repository lokal setelah operator menyetujui tugas.
