# 📋 Actionable Tasks: Release v0.1.1
## Autopilot, Skills & Agent Fleet Lifecycle Management

Dokumen task ini merupakan turunan teknis langsung dari [PRD.md](./PRD.md).

---

## 📊 Status Ringkasan Task

| ID Task | Judul Task | Prioritas | Target File | Status |
|---|---|:---:|---|:---:|
| **TASK-1.1** | Cron Job Edit & Delete Implementation | 🔴 Kritis | `src/api/hermesApi.ts`, `src/components/AutopilotView.tsx`, `src/components/NewAutopilotModal.tsx` | `[ ] Ready` |
| **TASK-1.2** | Cron Job Run History & Status Log Drawer | 🟠 Tinggi | `src/api/hermesApi.ts`, `src/components/AutopilotView.tsx` | `[ ] Ready` |
| **TASK-1.3** | Custom Skill Authoring & In-App Markdown Editor | 🟠 Tinggi | `src/api/hermesApi.ts`, `src/components/AITeamViews.tsx` | `[ ] Ready` |
| **TASK-1.4** | Per-Profile Skill Assignment & Master Toggles | 🟡 Sedang | `src/api/hermesApi.ts`, `src/components/AITeamViews.tsx` | `[ ] Ready` |
| **TASK-1.5** | Profile Lifecycle: Delete, Export, Import & Switch Active | 🔴 Kritis | `src/api/hermesApi.ts`, `src/components/AITeamViews.tsx` | `[ ] Ready` |
| **TASK-1.6** | Profile AI Auto-Describe Action via LLM | 🟡 Sedang | `src/api/hermesApi.ts`, `src/components/AITeamViews.tsx` | `[ ] Ready` |

---

## 🚀 Rincian Spesifikasi Pengerjaan

### TASK-1.1: Cron Job Edit & Delete Implementation
- **Target File:** `src/api/hermesApi.ts`, `src/components/AutopilotView.tsx`, `src/components/NewAutopilotModal.tsx`
- **Langkah Kerja:**
  1. Tambah method `updateCronJob(jobId: string, payload: any)` (`PUT /api/cron/jobs/{id}`) di `hermesApi.ts`.
  2. Tambah method `deleteCronJob(jobId: string)` (`DELETE /api/cron/jobs/{id}`) di `hermesApi.ts`.
  3. Modifikasi `NewAutopilotModal.tsx` agar mendukung mode edit (pre-fill nilai eksisting: schedule, description, prompt, profile).
  4. Tambah tombol Edit dan Delete di baris tabel `AutopilotView.tsx` dengan konfirmasi modal sebelum penghapusan.
- **Kriteria Penerimaan:**
  - [ ] Edit job menyimpan perubahan dan memicu refresh otomatis pada tabel Autopilot.
  - [ ] Delete job menghapus scheduler di backend dan menghilangkan baris job secara instan.

---

### TASK-1.2: Cron Job Run History & Status Log Drawer
- **Target File:** `src/api/hermesApi.ts`, `src/components/AutopilotView.tsx`
- **Langkah Kerja:**
  1. Tambah method `getCronJobHistory(jobId: string)` (`GET /api/cron/jobs/{id}/history`) di `hermesApi.ts`.
  2. Tambah drawer riwayat eksekusi pada `AutopilotView.tsx` yang muncul saat mengklik baris atau tombol "History".
  3. Tampilkan timestamp run terakhir, status (success/failed), durasi eksekusi, dan cuplikan log hasil pekerjaan.
- **Kriteria Penerimaan:**
  - [ ] Operator dapat melihat rekam jejak kapan scheduler berjalan dan ringkasan hasilnya.

---

### TASK-1.3: Custom Skill Authoring & In-App Markdown Editor
- **Target File:** `src/api/hermesApi.ts`, `src/components/AITeamViews.tsx`
- **Langkah Kerja:**
  1. Tambah method `createSkill(payload: { name: string, description: string, content: string })` (`POST /api/skills`) di `hermesApi.ts`.
  2. Tambah method `updateSkillContent(name: string, content: string)` (`PUT /api/skills/{name}`) di `hermesApi.ts`.
  3. Tambah tombol "+ New Skill" di tab Skills pada `AITeamViews.tsx` untuk membuka modal pembuatan skill baru.
  4. Sediakan editor teks di drawer rincian skill sehingga instruksi `SKILL.md` dapat disunting dan disimpan.
- **Kriteria Penerimaan:**
  - [ ] Skill baru tersimpan ke direktori skills Hermes dan langsung muncul di katalog.
  - [ ] Penyuntingan teks instruksi `SKILL.md` tersimpan persisten ke disk.

---

### TASK-1.4: Per-Profile Skill Assignment & Master Toggles
- **Target File:** `src/api/hermesApi.ts`, `src/components/AITeamViews.tsx`
- **Langkah Kerja:**
  1. Pastikan pemanggilan toggle skill di `hermesApi.ts` mendukung parameter opsional `profile`: `PUT /api/skills/toggle?name={name}&enabled={enabled}&profile={profile}`.
  2. Di tab Allowed Skills pada `AgentDetailDrawer`, sediakan toggle on/off yang hanya memengaruhi profil yang sedang dibuka.
- **Kriteria Penerimaan:**
  - [ ] Menonaktifkan skill untuk agen `sa-aws` tidak mematikan skill tersebut untuk agen `technical-writer`.

---

### TASK-1.5: Profile Lifecycle: Delete, Export, Import & Switch Active
- **Target File:** `src/api/hermesApi.ts`, `src/components/AITeamViews.tsx`
- **Langkah Kerja:**
  1. Tambah method di `hermesApi.ts`:
     - `deleteProfile(name: string)` (`DELETE /api/profiles/{name}`)
     - `exportProfile(name: string)` (`POST /api/profiles/{name}/export`)
     - `importProfile(fileData: any)` (`POST /api/profiles/import`)
     - `setActiveProfile(name: string)` (`POST /api/profiles/active`)
  2. Di `AgentDetailDrawer`, tambahkan tombol "Delete Profile" (diberi proteksi konfirmasi dan dinonaktifkan jika profil adalah `default`).
  3. Tambahkan tombol "Export Profile" untuk mendownload konfigurasi agen.
  4. Di header `AgentsView`, sediakan tombol "Import Profile" untuk mengunggah konfigurasi agen baru.
- **Kriteria Penerimaan:**
  - [ ] Hapus profil non-default berhasil membersihkan direktori `~/.hermes/profiles/<name>/`.
  - [ ] Ekspor dan impor profil berjalan mulus antar instance Hermes.

---

### TASK-1.6: Profile AI Auto-Describe Action via LLM
- **Target File:** `src/api/hermesApi.ts`, `src/components/AITeamViews.tsx`
- **Langkah Kerja:**
  1. Tambah method `autoDescribeProfile(name: string)` (`POST /api/profiles/{name}/auto-describe`) di `hermesApi.ts`.
  2. Tambah tombol 🪄 "Auto Describe" di samping input deskripsi pada `AgentDetailDrawer`.
  3. Saat ditekan, panggil endpoint backend, tampilkan indikator loading, dan isi input deskripsi dengan hasil dari LLM.
- **Kriteria Penerimaan:**
  - [ ] Deskripsi profil otomatis terisi ringkasan peran 1–2 kalimat yang relevan berdasarkan isi `SOUL.md`.
