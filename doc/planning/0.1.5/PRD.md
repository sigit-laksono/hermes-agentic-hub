# Product Requirements Document (PRD) — Release v0.1.5
# Multi-Agent Group Deliberation Rooms & MCP Server Ecosystem

* **Versi Rilis:** `v0.1.5`
* **Status:** Draft / Planned
* **Prasyarat:** `v0.1.4`
* **Kategori:** Team Deliberation, Swarm Orchestration & MCP Extensibility

---

## 1. Executive Summary & Tujuan

Sebelum sebuah proyek atau tiket besar dikerjakan, tim arsitek dan engineer biasanya berdiskusi terlebih dahulu untuk menyepakati spesifikasi teknis, dependensi, dan batasan arsitektur. 

Rilis **v0.1.5** menghadirkan dua pilar ekosistem canggih ke Hermes Agentic Hub:
1. **Multi-Agent Group Deliberation Rooms:** Ruang diskusi kelompok (2–6 bot spesialis) yang dapat berdiskusi secara bergantian (*multi-round turn driver*), meminta masukan manusia (`@user`), dan mengonversi kesimpulan rapat langsung menjadi **Kanban Epic & Child Tasks**.
2. **MCP (Model Context Protocol) Server Management:** Integrasi katalog ekstensibilitas standar industri untuk menambah toolsets eksternal (GitHub, PostgreSQL, Filesystem, Slack, Brave Search) dengan satu klik.

---

## 2. Ruang Lingkup Fitur (Feature Scope)

### 2.1. Multi-Agent Group Deliberation Rooms
1. **Room Creation & Member Management:** Membuat room diskusi dengan 2 hingga 6 bot anggota (misal Room "Cloud Migration Strategy": `sa-aws` + `sa-microsoft` + `database-engineer`).
2. **Multi-Round Turn Driver:** Pesan pengguna memicu hingga 3 putaran respons teratur di mana bot berbicara berurutan atau memilih diam (*pass*) jika tidak ada poin tambahan.
3. **Escalation Badge ("Needs You"):** Ketika bot membutuhkan pertimbangan atau izin manusia (me-mention `@user`), room memunculkan badge perhatian visual **"Needs You"**.
4. **Action: "Convert Deliberation to Kanban Epic":** Tombol pintar di header room yang merangkum hasil diskusi menjadi 1 tiket Epic di kolom `Triage` papan Kanban, lengkap dengan sub-tugas yang terurai otomatis.

### 2.2. MCP (Model Context Protocol) Management
1. **MCP Catalog Browser:** Menampilkan daftar server MCP terverifikasi yang siap pasang (GitHub, Brave Search, PostgreSQL, SQLite, Puppeteer, Docker).
2. **Custom Server Configuration:** Formulir penambahan server MCP kustom (nama, command, arguments, dan environment variables).
3. **Connection Testing & Active Toggles:** Tombol "Test Connection" untuk memverifikasi handshake MCP server sebelum digunakan, serta switch on/off per server.

### 2.3. Project File Browser & Workspace Explorer
1. **Interactive File Tree:** Eksplorasi berkas langsung di dalam direktori proyek atau workspace tugas.
2. **In-App File Viewer:** Membaca isi berkas teks, konfigurasi YAML, dan diagram arsitektur.

---

## 3. Arsitektur & Kontrak API Backend

| Modul | Method & Endpoint | Keterangan |
|---|---|---|
| **Groups** | `GET /api/groups` | List group deliberation rooms |
| **Groups** | `POST /api/groups` | Buat room diskusi baru (nama, members) |
| **Groups** | `POST /api/groups/{id}/chat` | Kirim prompt ke room (memicu multi-agent turns) |
| **Groups** | `POST /api/groups/{id}/export-epic` | Konversi diskusi room menjadi Kanban Epic |
| **MCP** | `GET /api/mcp/catalog` | Katalog server MCP siap pasang |
| **MCP** | `GET /api/mcp/servers` | Daftar server MCP terinstall |
| **MCP** | `POST /api/mcp/servers` | Tambah/install server MCP baru |
| **MCP** | `POST /api/mcp/servers/{name}/test` | Uji konektivitas server MCP |
| **MCP** | `PUT /api/mcp/servers/{name}/enabled` | Toggle aktif/nonaktif server MCP |
| **Files** | `GET /api/files/browse` | Jelajahi pohon berkas workspace/repo |

---

## 4. Kriteria Keberhasilan (Acceptance Criteria)

- [ ] Operator dapat membuat Group Chat Room berisi beberapa agen dan mengamati diskusi bertingkat secara live.
- [ ] Tombol "Convert to Epic" berhasil membuat tiket baru di Kanban dengan sub-tasks yang sesuai hasil diskusi.
- [ ] Server MCP dapat di-install dari katalog dan tombol Test mengembalikan status sukses tanpa error handshake.
