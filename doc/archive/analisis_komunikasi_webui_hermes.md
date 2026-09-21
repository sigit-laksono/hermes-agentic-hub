# Analisis Komunikasi Hermes WebUI dengan Hermes Agent & Fitur Chat Message

Dokumen ini berisi analisis mendalam mengenai arsitektur komunikasi antara antarmuka web (**Hermes WebUI**) dengan mesin agen cerdas (**Hermes Agent**), serta inventarisasi seluruh fitur yang berkaitan dengan pengiriman dan pemrosesan pesan chat, lengkap dengan **referensi sumber file implementasinya** di dalam codebase.

---

## 1. Arsitektur Komunikasi WebUI & Hermes Agent

Arsitektur komunikasi dirancang menggunakan pola **Asynchronous Command + Server-Sent Events (SSE) Streaming**. Pola ini memisahkan inisiasi permintaan (*dispatch*) dengan konsumsi respons (*streaming deltas*), sehingga browser dapat menerima pembaruan secara *real-time* (token per token, pemanggilan tool, status eksekusi) tanpa *blocking*.

### Diagram Alur Komunikasi

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           BROWSER (FRONTEND)                             │
│  - Input form / Kotak Chat (static/ui.js)                                │
│  - Stream Handler & EventSource listener (static/sessions.js)            │
│  - Renderer Chat & Kartu Tool / Thinking (static/messages.js)            │
└─────────────────────┬──────────────────────────────▲─────────────────────┘
                      │                              │
     1. POST /api/chat/start                         │ 2. GET /api/chat/stream
        (session_id, message, model,                 │    (SSE Events: token,
         attachments, workspace)                     │     reasoning, tool, done)
                      │                              │
┌─────────────────────▼──────────────────────────────┴─────────────────────┐
│                       WEBUI SERVER (HTTP HANDLER)                        │
│  - Routing & Request Validation (api/routes.py)                          │
│  - Session Mutex & State Lock (api/config.py, api/models.py)             │
│  - Stream Channel Queue & Journaling (api/routes.py, api/run_journal.py) │
└─────────────────────┬────────────────────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────────────────────┐
        │ Memilih Jalur Eksekusi (Execution Mode)    │
        ▼                                            ▼
┌───────────────────────────────────┐  ┌───────────────────────────────────┐
│     MODE A: LOCAL IN-PROCESS      │  │      MODE B: GATEWAY DAEMON       │
│  (api/streaming.py)               │  │  (api/gateway_chat.py)            │
│                                   │  │                                   │
│  - Thread worker lokal            │  │  - Komunikasi HTTP REST/Runs API  │
│  - Inisialisasi/Reuse `AIAgent`   │  │    ke daemon `hermes gateway`     │
│  - Direct Python Callbacks:       │  │  - Jembatan event stream gateway  │
│    * stream_delta_callback        │  │    ke antrian SSE WebUI           │
│    * reasoning_callback           │  │  - Evaluasi status aktif &        │
│    * tool_start/complete_callback │  │    mirror approval                │
│    * clarify_callback             │  │                                   │
└─────────────────┬─────────────────┘  └─────────────────┬─────────────────┘
                  │                                      │
                  ▼                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            HERMES AGENT CORE                             │
│  - Pemanggilan Model AI (OpenAI, Anthropic, Ollama, Custom Providers)    │
│  - Execution Engine untuk Toolsets (Terminal, Filesystem, Git, Web, dll) │
│  - Database Persistensi (SQLite `state.db` & JSON sidecar)               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Siklus Hidup Permintaan Chat (Chat Turn Lifecycle)

1. **Inisiasi (`POST /api/chat/start`)**:
   - Browser mengirimkan payload percakapan (`session_id`, `message`, `model`, `model_provider`, `workspace`, `attachments`).
   - Server memvalidasi sesi, mengunci *lock* sesi, mendaftarkan *stream channel*, dan memulai worker background.
   - Endpoint langsung merespons dengan JSON `{ "stream_id": "...", "status": "started" }`.
   - **Sumber File**: `api/routes.py` (fungsi `_handle_chat_start`, `_start_run`, `_start_chat_stream_for_session`)

2. **Koneksi Streaming (`GET /api/chat/stream`)**:
   - Browser menyambung ke endpoint SSE dengan menyertakan `session_id` dan `stream_id`.
   - Server mengalirkan event-event SSE dari antrian internal (`STREAMS[stream_id]`).
   - Mendukung fitur *resume cursor* (`after_event_id` / `after_seq`) jika koneksi sempat terputus.
   - **Sumber File**: `api/routes.py` (fungsi `_handle_sse_stream`, `_chat_stream_resume_cursor`), `api/streaming.py` (fungsi `_sse`)

3. **Eksekusi Worker**:
   - Worker background menjalankan agent dan mendaftarkan serangkaian callback ke siklus inferensi LLM dan eksekusi tool.
   - Setiap kemajuan (*token*, *reasoning*, *tool call*, *metering*) di-*push* ke antrian stream via `put(event, data)`.
   - **Sumber File**: `api/streaming.py` (fungsi `_run_agent_streaming`) atau `api/gateway_chat.py` (fungsi `_run_gateway_chat_streaming`)

4. **Penyelesaian & Persistensi (`done` Event)**:
   - Setelah eksekusi agent selesai, pesan asisten final dikomit ke file JSON sesi WebUI dan disinkronkan ke SQLite `state.db`.
   - Worker mengirimkan event `done` berisi metadata sesi dan penggunaan token.
   - **Sumber File**: `api/streaming.py` (fungsi `_settle_result_messages`), `api/models.py` (fungsi `merge_session_messages_append_only`, kelas `Session`)

---

## 3. Protokol Event Streaming (SSE Events)

Event-event utama yang dikirimkan melalui saluran `GET /api/chat/stream`:

| Nama Event | Deskripsi & Fungsi | Sumber File Backend |
|---|---|---|
| `token` | Aliran token teks jawaban asisten secara incremental (*real-time typing*). | `api/streaming.py:on_token` |
| `reasoning` | Aliran proses pemikiran model (*Chain of Thought/Thinking*) dengan *echo suppression* dan *throttling* ~10Hz. | `api/streaming.py:on_reasoning` |
| `tool` / `tool_start` | Notifikasi awal saat agent mulai menjalankan tool (nama tool, argumen JSON, preview). | `api/streaming.py:on_tool_start` |
| `tool_complete` | Notifikasi saat tool selesai dijalankan (durasi, output, status sukses/error). | `api/streaming.py:on_tool_complete` |
| `approval` | Permintaan persetujuan pengguna (*Human-in-the-loop*) sebelum mengeksekusi perintah sensitif. | `api/route_approvals.py`, `api/streaming.py` |
| `clarify` | Pertanyaan klarifikasi interaktif saat agent membutuhkan arahan spesifik dari pengguna. | `api/clarify.py`, `api/streaming.py:_clarify_callback_impl` |
| `todo_state` | Sinkronisasi real-time daftar checklist tugas saat agent memperbarui TODO list. | `api/todo_state.py:emit_todo_state` |
| `metering` | Statistik performa live: Tokens Per Second (TPS), token input/output, cache hit ratio. | `api/metering.py`, `api/streaming.py:_metering_ticker` |
| `context_status` | Status prefill konteks sistem dan toolset yang aktif pada sesi tersebut. | `api/streaming.py` |
| `cancel` | Notifikasi pembatalan ketika pengguna menekan tombol Stop. | `api/streaming.py:cancel_stream` |
| `done` | Sinyal akhir giliran bicara (*turn* selesai) beserta payload sesi final. | `api/streaming.py` |
| `apperror` | Notifikasi kesalahan runtime (rate limit, konteks penuh, kesalahan autentikasi provider). | `api/streaming.py:_classify_provider_error` |

---

## 4. Rincian Fitur Chat Message & Sumber File Implementasi

Berikut adalah daftar lengkap fitur yang berhubungan dengan pengiriman, pemrosesan, dan pengelolaan chat message ke Hermes Agent:

---

### Fitur 1: Pengiriman Pesan Teks & Streaming Typewriter
- **Deskripsi**: Mengirim prompt pesan dari textarea chat, memvalidasi sesi, lalu merender teks balasan asisten secara bertahap saat token diterima dari LLM.
- **Sumber File Backend**:
  - `api/routes.py` (`_handle_chat_start`, `_start_chat_stream_for_session`)
  - `api/streaming.py` (`_run_agent_streaming`, `on_token`, `put('token', ...)`)
- **Sumber File Frontend**:
  - `static/ui.js` (Event listener form submit pada `#chat-input`, fungsi pengiriman)
  - `static/sessions.js` (Fungsi `sendMessage`, `startStream`, penanganan SSE `onmessage`)
  - `static/messages.js` (Fungsi pembaruan DOM real-time teks asisten)

---

### Fitur 2: Multimodal & Lampiran (Gambar, Dokumen, Audio)
- **Deskripsi**: Mendukung pengunggahan dan pemrosesan lampiran gambar (PNG, JPG, WebP), dokumen kerja (Markdown, PDF, Text, Docx, PPTX), serta transkripsi audio.
  - Gambar diumpankan langsung ke API vision jika model mendukungnya, atau dianalisis via OCR/image analyzer jika model hanya menerima teks.
  - Dokumen Office diekstrak teks dan strukturnya tanpa merusak format.
- **Sumber File Backend**:
  - `api/upload.py` (`handle_upload`, `handle_transcribe`, `handle_workspace_upload`)
  - `api/streaming.py` (`_build_native_multimodal_message`, `_compact_image_parts_for_persistence`)
  - `api/office_documents.py` (`_docx_bytes_from_text`, pembaca PPTX/XLSX)
- **Sumber File Frontend**:
  - `static/ui.js` (Drag-and-drop file upload, preview thumbnail lampiran)
  - `static/messages.js` (Rendering badge lampiran pada pesan pengguna)

---

### Fitur 3: Live Reasoning & Thinking Models (Chain-of-Thought)
- **Deskripsi**: Menampilkan proses pemikiran model secara live (misal DeepSeek R1, Claude Thinking, OpenAI o-series) dalam kartu akordeon khusus yang dapat dilipat.
  - Dilengkapi mekanisme *coalescing* dan *throttling* ~10Hz agar tidak membebani main thread peramban.
  - Dilengkapi filter *echo suppression* agar teks pemikiran tidak menduplikasi jawaban akhir.
- **Sumber File Backend**:
  - `api/streaming.py` (`on_reasoning`, `_strip_reasoning_output_echo`, `_is_visible_output_echo`, `_flush_reasoning_buffer`)
  - `api/config.py` (`coerce_reasoning_effort_for_model`, `parse_reasoning_effort`)
- **Sumber File Frontend**:
  - `static/messages.js` (Komponen kartu akordeon `Thinking`, fungsi animasi dan toggle lipatan)
  - `static/sessions.js` (Parsing event SSE `reasoning`)

---

### Fitur 4: Kartu Tool Calling Interaktif (Tool Execution Cards)
- **Deskripsi**: Saat agent memanggil tool (terminal bash, manipulasi file, pencarian web, git), WebUI menampilkan kartu live yang menunjukkan nama tool, argumen yang di-passing, status eksekusi (*running*, *done*, *error*), durasi waktu, serta cuplikan hasil output.
- **Sumber File Backend**:
  - `api/streaming.py` (`on_tool_start`, `on_tool_complete`, `on_tool`, `_tool_args_snapshot`)
- **Sumber File Frontend**:
  - `static/messages.js` (Fungsi `renderToolCall`, komponen UI kartu tool, collapsible output log)
  - `static/sessions.js` (Handler event SSE `tool` dan `tool_complete`)

---

### Fitur 5: Persetujuan Tindakan Berisiko (Human-in-the-Loop & YOLO Mode)
- **Deskripsi**: Jika agent akan menjalankan aksi berbahaya (misalnya menghapus file penting atau menjalankan perintah shell destruktif), eksekusi akan tertahan (*paused*). WebUI memunculkan prompt persetujuan (Approve / Reject). Tersedia juga opsi mode **YOLO** untuk mengizinkan semua tool secara otomatis dalam sesi tersebut.
- **Sumber File Backend**:
  - `api/route_approvals.py` (`_handle_approval_respond`, `reconcile_gateway_pending_mirror_locked`, `begin_session_yolo_transition`, `gateway_yolo_handoff`)
  - `api/streaming.py` (Deteksi blocking approval di dalam loop streaming)
- **Sumber File Frontend**:
  - `static/messages.js` (Komponen modal persetujuan tool dan tombol Approve / Deny)
  - `static/ui.js` (Tombol toggle status YOLO mode pada header/panel kontrol)

---

### Fitur 6: Prompt Klarifikasi Interaktif (Agent Clarify)
- **Deskripsi**: Ketika agent membutuhkan klarifikasi atau pilihan dari pengguna di tengah-tengah pengerjaan tugas, agent memanggil `clarify_callback`. Server memancarkan event SSE `clarify`, dan browser menampilkan form input/pilihan ganda. Agent menunggu tanggapan pengguna sebelum melanjutkan.
- **Sumber File Backend**:
  - `api/clarify.py` (`get_pending`, `clear_pending`, `_clarify_sse_notify`)
  - `api/streaming.py` (`_clarify_callback_impl`)
- **Sumber File Frontend**:
  - `static/messages.js` (Rendering dialog formulir klarifikasi agent)
  - `static/ui.js` (Handler submit jawaban klarifikasi ke `/api/clarify/respond`)

---

### Fitur 7: Slash Command Percakapan Khusus
WebUI menyediakan perintah khusus berawalan garis miring (`/`) yang dieksekusi langsung di kotak input chat:
- **/btw `<pertanyaan>`**: Menanyakan pertanyaan sampingan secara *ephemeral* tanpa mencatatnya ke riwayat percakapan permanen sesi.
  - *Backend*: `api/routes.py` (`_handle_btw`), `api/streaming.py` (`ephemeral=True`)
- **/background `<tugas>`**: Menjalankan tugas panjang di background worker terpisah tanpa mengunci sesi chat utama.
  - *Backend*: `api/routes.py` (`_handle_background`), `api/background.py` (`track_background`, `complete_background`)
- **/compress**: Memicu kompresi dan perangkuman manual riwayat obrolan untuk menghemat context window.
  - *Backend*: `api/routes.py` (`_handle_session_compress`), `api/compression_continuation.py`
- **/retry & /undo**: Menghapus giliran terakhir dan mengulangi inferensi (misal ganti model/prompt).
  - *Backend*: `api/session_ops.py` (`plan_regeneration`, `truncate_context_for_display_keep`), `api/routes.py` (`_handle_chat_start` dengan `regenerate=True`)
- **/goal `<deskripsi>`**: Menetapkan tujuan sesi yang dievaluasi otomatis di setiap akhir giliran.
  - *Backend*: `api/goals.py` (`evaluate_goal_after_turn`, `has_active_goal`), `api/routes.py` (`_handle_goal_command`)
- **Sumber File Frontend Parser Perintah**:
  - `static/commands.js` (Parser slash command, autokomplesi pada input box)

---

### Fitur 8: Live Performance Metering (TPS & Token Counter)
- **Deskripsi**: Mengukur kecepatan inferensi model secara langsung (*Tokens Per Second / TPS*), memantau token input dan output, efisiensi prompt cache hit (persentase cache hit), serta estimasi biaya ($).
- **Sumber File Backend**:
  - `api/metering.py` (Kelas `GlobalMeter`, penghitungan interval & kecepatan delta)
  - `api/streaming.py` (`_metering_ticker`, `_live_usage_snapshot`, fungsi `prompt_cache_hit_percent`)
- **Sumber File Frontend**:
  - `static/sessions.js` (Parsing event SSE `metering`)
  - `static/ui.js` (Indikator TPS, badge penggunaan token di status bar bawah chat)

---

### Fitur 9: Pengelolaan Context Window & Auto-Compression
- **Deskripsi**: WebUI mendeteksi kapasitas maksimal context window model yang dipilih (misal 128k, 200k, 1M). Ketika jumlah token obrolan mendekati batas aman, sistem secara otomatis memangkas output tool lama dan memicu auto-kompresi agar tidak terjadi *context overflow*.
- **Sumber File Backend**:
  - `api/streaming.py` (Fungsi deteksi context window, perbandingan threshold, dan scaling)
  - `api/compression_anchor.py` (Identifikasi pesan penanda kompresi konteks)
  - `api/session_ops.py` (Pembersihan dan pemotongan pesan konteks lama)
- **Sumber File Frontend**:
  - `static/assistant_turn_anchors.js` (Manajemen titik jangkar kompresi pada antarmuka)
  - `static/messages.js` (Rendering kartu ringkasan kompresi)

---

### Fitur 10: Pembatalan Elegan (Graceful Cancellation)
- **Deskripsi**: Ketika pengguna menekan tombol **Stop**, request tidak di-kill secara kasar. Sistem mengirimkan sinyal pembatalan, menghentikan agen dengan aman, mempertahankan potongan teks yang sudah sempat dihasilkan (*partial answer*), dan membersihkan thread serta file descriptor yang terbuka.
- **Sumber File Backend**:
  - `api/streaming.py` (Fungsi `cancel_stream`, flag `CANCEL_FLAGS`, `_finalize_cancelled_turn`)
  - `api/routes.py` (`_handle_chat_cancel`)
- **Sumber File Frontend**:
  - `static/sessions.js` (Fungsi `cancelStream`, pemanggilan `POST /api/chat/cancel`)
  - `static/ui.js` (Toggle tombol Send menjadi tombol Stop saat streaming aktif)

---

### Fitur 11: Run Journal & Stream Resiliency (Replay/Resume)
- **Deskripsi**: Menjaga keandalan transmisi data. Setiap event SSE ditulis ke file jurnal sementara (`RunJournalWriter`). Jika browser me-refresh halaman atau mengalami *network hiccup* di tengah-tengah streaming, browser dapat menyambung kembali dengan parameter kursor dan memutar ulang (*replay*) event yang terlewat tanpa mengulang eksekusi agen.
- **Sumber File Backend**:
  - `api/run_journal.py` (Kelas `RunJournalWriter`, append event biner/JSON)
  - `api/routes.py` (`_chat_stream_resume_cursor`, `_handle_session_run_journal_stream_for_session`)
- **Sumber File Frontend**:
  - `static/sessions.js` (Penyimpanan ID event terakhir `lastEventId` dan pengiriman kembali saat reconnect)

---

### Fitur 12: Pembuatan Judul Sesi Otomatis (Auto Title Generation)
- **Deskripsi**: Setelah giliran pertama selesai, sistem secara asynchronous menganalisis intisari percakapan dan menghasilkan judul sesi yang relevan tanpa mengganggu atau memperlambat respons utama obrolan.
- **Sumber File Backend**:
  - `api/streaming.py` (`_run_background_title_update`, `generate_session_title_for_session`, `title_from`)
  - `api/routes.py` (`_persist_generated_session_title`)
- **Sumber File Frontend**:
  - `static/sessions.js` (Pembaruan judul di tab browser dan sidebar riwayat)

---

## 5. Ringkasan Matriks Fitur & File Sumber

| Fitur | Komponen Backend (Python) | Komponen Frontend (JS) | Endpoint / Saluran |
|---|---|---|---|
| **Chat Streaming** | `api/routes.py`, `api/streaming.py` | `static/ui.js`, `static/sessions.js` | `POST /api/chat/start`, `GET /api/chat/stream` |
| **Multimodal / Lampiran** | `api/upload.py`, `api/office_documents.py` | `static/ui.js`, `static/messages.js` | `POST /api/upload`, `POST /api/upload/workspace` |
| **Live Reasoning / CoT** | `api/streaming.py`, `api/config.py` | `static/messages.js` | SSE Event `reasoning` |
| **Tool Execution Cards** | `api/streaming.py` | `static/messages.js` | SSE Event `tool`, `tool_complete` |
| **YOLO / Tool Approval** | `api/route_approvals.py` | `static/messages.js`, `static/ui.js` | `POST /api/approval/respond`, SSE `approval` |
| **Klarifikasi Interaktif** | `api/clarify.py`, `api/streaming.py` | `static/messages.js` | `POST /api/clarify/respond`, SSE `clarify` |
| **Slash Commands (/btw, dll)** | `api/routes.py`, `api/background.py` | `static/commands.js` | `POST /api/btw`, `POST /api/background` |
| **Live Metering & TPS** | `api/metering.py`, `api/streaming.py` | `static/ui.js`, `static/sessions.js` | SSE Event `metering` |
| **Auto-Compression** | `api/compression_anchor.py`, `api/session_ops.py` | `static/assistant_turn_anchors.js` | `POST /api/session/compress`, SSE `context_status` |
| **Stop / Cancel Turn** | `api/streaming.py`, `api/routes.py` | `static/sessions.js`, `static/ui.js` | `POST /api/chat/cancel`, SSE `cancel` |
| **Run Journal (Resuming)** | `api/run_journal.py`, `api/routes.py` | `static/sessions.js` | Query `?after_event_id=...` pada SSE |
| **Auto Session Title** | `api/streaming.py`, `api/routes.py` | `static/sessions.js` | Background thread pasca-turn |

---

*Laporan ini dihasilkan berdasarkan analisis langsung terhadap struktur knowledge graph dan basis kode Hermes WebUI.*
