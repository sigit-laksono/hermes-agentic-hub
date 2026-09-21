# 📋 Actionable Tasks: Release v0.1.4
## Bot Mode, Agent Direct Messaging & Live Task Sessions

Dokumen task ini merupakan turunan teknis langsung dari [PRD.md](./PRD.md).

---

## 📊 Status Ringkasan Task

| ID Task | Judul Task | Prioritas | Target File | Status |
|---|---|:---:|---|:---:|
| **TASK-4.1** | Canonical Bot Chat Inisialisasi & Profile UI-Meta Marker | 🔴 Kritis | `server.py`, `src/api/hermesApi.ts`, `src/components/ChatView.tsx` | `[ ] Ready` |
| **TASK-4.2** | Autocomplete `@mention` Roster di Chat Composer | 🟠 Tinggi | `src/components/ChatView.tsx`, `src/types.ts` | `[ ] Ready` |
| **TASK-4.3** | Visualisasi Tool Call `message_agent` & Collaboration Card | 🟠 Tinggi | `src/components/ChatView.tsx`, `src/components/TaskDetailModal.tsx` | `[ ] Ready` |
| **TASK-4.4** | Task-to-Session Interactive Bridge di Task Drawer | 🔴 Kritis | `src/components/TaskDetailModal.tsx`, `src/api/hermesApi.ts`, `server.py` | `[ ] Ready` |
| **TASK-4.5** | Intentional Silence Tokens Handler & Anti-Loop Safeguard | 🟡 Sedang | `src/api/hermesApi.ts`, `src/components/ChatView.tsx` | `[ ] Ready` |

---

## 🚀 Rincian Spesifikasi Pengerjaan

### TASK-4.1: Canonical Bot Chat Inisialisasi & Profile UI-Meta Marker
- **Target File:** `server.py`, `src/api/hermesApi.ts`, `src/components/ChatView.tsx`
- **Langkah Kerja:**
  1. Di `server.py`, pastikan setiap pembuatan atau pengambilan profil agen memastikan adanya file `~/.hermes/profiles/<name>/profile.yaml` dengan isi:
     ```yaml
     ui_meta:
       hermes-bots: {}
     ```
  2. Tambahkan helper di `hermesApi.ts` untuk mengambil atau membuat sesi berjudul `"Bot Chat"` per profil:
     `getOrCreateCanonicalBotChat(profile: string)`.
  3. Di `ChatView.tsx`, saat pengguna memilih bot dari roster, otomatis muat sesi `"Bot Chat"` tersebut sebagai default conversation.
- **Kriteria Penerimaan:**
  - [ ] Canonical Bot Chat tersimpan permanen dan agen memiliki kesadaran protokol Bot Mode.

---

### TASK-4.2: Autocomplete `@mention` Roster di Chat Composer
- **Target File:** `src/components/ChatView.tsx`, `src/types.ts`
- **Langkah Kerja:**
  1. Di input textarea `ChatView.tsx`, deteksi karakter `@` saat pengguna mengetik.
  2. Munculkan dropdown floating autocomplete berisi daftar agen aktif (`agents`): avatar, nama profil, dan deskripsi singkat peran.
  3. Keyboard navigation: panah atas/bawah untuk memilih, `Enter` atau `Tab` untuk memilih mention (misal `@sa-aws`).
  4. Format pesan menyertakan tag `@<profile>` yang dikenali oleh engine Hermes.
- **Kriteria Penerimaan:**
  - [ ] Mengetik `@` memunculkan list agen dan dapat di-select dengan cepat menggunakan keyboard.

---

### TASK-4.3: Visualisasi Tool Call `message_agent` & Collaboration Card
- **Target File:** `src/components/ChatView.tsx`, `src/components/TaskDetailModal.tsx`
- **Langkah Kerja:**
  1. Saat parsing event tool-call pada streaming chat atau log task:
     - Jika tool name adalah `message_agent`: render komponen khusus beraksen warna ungu/cyan.
     - Tampilkan: Avatar pengirim ➔ Avatar penerima, isi pesan yang didelegasikan, dan badge status `Delivered / Queued`.
  2. Sembunyikan output JSON mentah yang membingungkan dan gantikan dengan visual alur konsultasi yang elegan.
- **Kriteria Penerimaan:**
  - [ ] Interaksi konsultasi antar-bot terlihat jelas sebagai kerja sama tim di antarmuka obrolan.

---

### TASK-4.4: Task-to-Session Interactive Bridge di Task Drawer
- **Target File:** `src/components/TaskDetailModal.tsx`, `src/api/hermesApi.ts`, `server.py`
- **Langkah Kerja:**
  1. Di `server.py`, tambahkan endpoint pengiriman input ke running task session:
     `POST /api/plugins/kanban/tasks/{task_id}/intervene` dengan payload `{ message: string }`.
  2. Di `TaskDetailModal.tsx`, buat tab baru di samping "Execution Log": **"Live Session Terminal"**.
  3. Jika task berstatus `running`, buka koneksi SSE/WebSocket ke sesi worker tersebut.
  4. Sediakan kotak input *"Intervene / Guide agent..."* di bawah streaming terminal.
  5. Saat operator mengirim pesan, kirim ke backend untuk diinjeksikan sebagai prompt user turn berikutnya ke worker.
- **Kriteria Penerimaan:**
  - [ ] Operator dapat mengarahkan agen yang salah jalan secara langsung tanpa mematikan prosesnya.

---

### TASK-4.5: Intentional Silence Tokens Handler & Anti-Loop Safeguard
- **Target File:** `src/api/hermesApi.ts`, `src/components/ChatView.tsx`
- **Langkah Kerja:**
  1. Tangani token diam seperti `[SILENT]`, `NO_REPLY` dari agen penerima.
  2. Di UI obrolan, jangan tampilkan bubble teks kosong jika pesan berisi token diam tersebut.
  3. Batasi putaran perbincangan otomatis antar agen agar tidak looping tanpa henti.
- **Kriteria Penerimaan:**
  - [ ] Obrolan antar bot berhenti secara anggun saat tidak ada informasi baru yang perlu ditambahkan.
