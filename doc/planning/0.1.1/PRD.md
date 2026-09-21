# Product Requirements Document (PRD) — Release v0.1.1
# Autopilot, Skills & Agent Fleet Lifecycle Management

* **Versi Rilis:** `v0.1.1`
* **Status:** Ready for Implementation
* **Prasyarat:** `v0.1.0` (Baseline Cockpit)
* **Kategori:** Core Management & Fleet Operations

---

## 1. Executive Summary & Tujuan

Pada rilis `v0.1.0`, modul Autopilot, Skills, dan Agent Profiles baru mendukung operasi dasar (list, trigger cron, dan edit sederhana SOUL.md). Pengguna belum bisa mengubah jadwal cron yang sudah ada, menghapus job, membuat skill kustom baru dari UI, ataupun mengelola siklus hidup profile secara utuh (hapus, ekspor, impor, dan auto-describe peran agen).

Rilis **v0.1.1** bertujuan menyelesaikan seluruh manajemen siklus hidup (*lifecycle*) untuk ketiga modul tersebut, sehingga operator dapat mengelola armada agen dan penjadwalan otomatis sepenuhnya dari antarmuka web tanpa menyentuh file YAML manual.

---

## 2. Ruang Lingkup Fitur (Feature Scope)

### 2.1. Modul Autopilot (Cron Job Management)
1. **Edit Cron Job:** Mengubah interval waktu (cron syntax / human schedule), deskripsi, task prompt, target profile, dan status aktif.
2. **Delete Cron Job:** Menghapus scheduler cron yang tidak diperlukan lagi dengan dialog konfirmasi aman.
3. **Execution History & Logs:** Menampilkan riwayat eksekusi cron job terakhir (status berhasil/gagal, waktu eksekusi, ringkasan output).

### 2.2. Modul Skills Management
1. **Skill Authoring & Editor:** Editor markdown interaktif untuk membaca dan memperbarui isi berkas `SKILL.md`.
2. **Create New Custom Skill:** Form pembuatan skill baru lengkap dengan penentuan nama, deskripsi, kategori, dan template instruksi awal.
3. **Granular Skill Toggle:** Mengaktifkan/menonaktifkan skill secara global maupun terisolasi per profil agen (`PUT /api/skills/toggle?profile={name}`).

### 2.3. Modul Agent Profiles Fleet Management
1. **Delete Profile:** Menghapus profil agen kustom secara aman (profil `default` dilindungi dan tidak dapat dihapus).
2. **Export & Import Profile:** Fitur ekspor konfigurasi profil (`config.yaml`, `SOUL.md`, skills) ke file JSON/zip dan impor ke mesin lain.
3. **Switch Active Profile:** Memilih dan menetapkan profil aktif global di backend Hermes.
4. **AI Auto-Describe Profile:** Memanggil LLM untuk menganalisis isi `SOUL.md` agen dan menghasilkan deskripsi peran singkat yang akurat secara otomatis.

---

## 3. Arsitektur & Kontrak API Backend

| Modul | Method & Endpoint | Keterangan |
|---|---|---|
| **Cron** | `PUT /api/cron/jobs/{id}` | Update konfigurasi cron job |
| **Cron** | `DELETE /api/cron/jobs/{id}` | Hapus cron job dari sistem |
| **Cron** | `GET /api/cron/jobs/{id}/history` | Ambil riwayat run cron job |
| **Skills** | `POST /api/skills` | Buat skill baru (`SKILL.md`) |
| **Skills** | `PUT /api/skills/{name}` | Simpan perubahan isi `SKILL.md` |
| **Skills** | `PUT /api/skills/toggle` | Toggle aktif/nonaktif skill (global/profile) |
| **Profiles** | `DELETE /api/profiles/{name}` | Hapus profil agen dari disk |
| **Profiles** | `POST /api/profiles/{name}/export` | Ekspor konfigurasi profil |
| **Profiles** | `POST /api/profiles/import` | Impor profil agen dari arsip/JSON |
| **Profiles** | `GET/POST /api/profiles/active` | Get / set profil aktif global |
| **Profiles** | `POST /api/profiles/{name}/auto-describe` | Generate deskripsi profil via LLM |

---

## 4. Kriteria Keberhasilan (Acceptance Criteria)

- [ ] Operator dapat mengedit jadwal cron yang ada dan perubahannya langsung aktif di backend cron engine.
- [ ] Operator dapat menghapus cron job dan barisnya langsung hilang dari tabel Autopilot.
- [ ] Skill baru yang dibuat melalui antarmuka web langsung muncul di katalog skills dan dapat ditugaskan ke profil agen.
- [ ] Profil kustom dapat dihapus, diekspor, dan diimpor tanpa merusak profil default Hermes.
- [ ] Tombol "Auto Describe" pada drawer profil berhasil mengisi field deskripsi agen menggunakan ringkasan dari LLM.
