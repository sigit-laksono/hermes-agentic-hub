# Hermes Agentic Hub — Laporan Audit & Standarisasi Arsitektur Backend

> **Dokumen Referensi Arsitektur & Standarisasi Pasca-Fitur**  
> **Tanggal Audit**: 21 September 2026  
> **Versi Target**: Hermes Agentic Hub v0.1.0  
> **Auditor**: Backend Architect Subagent (`.claude/agents/engineering-backend-architect.md`)  
> **Status Kelayakan Produksi**: ❌ **BELUM PRODUCTION-READY (Skor Rata-Rata: 2.6 / 10)**

---

## Daftar Isi
1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Pemetaan Arsitektur Saat Ini](#2-pemetaan-arsitektur-saat-ini)
3. [Rapor & Skor Arsitektur](#3-rapor--skor-arsitektur)
4. [Detail Temuan Kritis per Dimensi](#4-detail-temuan-kritis-per-dimensi)
   - [4.1 Keamanan (Security) — Skor 1/10](#41-keamanan-security--skor-110)
   - [4.2 Desain Lapisan API (API Layer) — Skor 4/10](#42-desain-lapisan-api-api-layer--skor-410)
   - [4.3 Skema & Integritas Data (Data Layer) — Skor 3/10](#43-skema--integritas-data-data-layer--skor-310)
   - [4.4 Manajemen State (State Management) — Skor 3/10](#44-manajemen-state-state-management--skor-310)
   - [4.5 Penanganan Error (Error Handling) — Skor 3/10](#45-penanganan-error-error-handling--skor-310)
   - [4.6 Performa (Performance) — Skor 4/10](#46-performa-performance--skor-410)
   - [4.7 Skalabilitas (Scalability) — Skor 2/10](#47-skalabilitas-scalability--skor-210)
   - [4.8 Observabilitas (Observability) — Skor 1/10](#48-observabilitas-observability--skor-110)
5. [Blueprint Standarisasi Arsitektur Target](#5-blueprint-standarisasi-arsitektur-target)
   - [5.1 Standarisasi Kontrak API & Unified Envelope](#51-standarisasi-kontrak-api--unified-envelope)
   - [5.2 Standarisasi Client Wrapper (fetchWithErrorHandling)](#52-standarisasi-client-wrapper-fetchwitherrorhandling)
   - [5.3 Standarisasi Keamanan & Sanitasi](#53-standarisasi-keamanan--sanitasi)
   - [5.4 Standarisasi Validasi Runtime Skema (Zod)](#54-standarisasi-validasi-runtime-skema-zod)
   - [5.5 Refactoring Arsitektur State Frontend (Domain Contexts)](#55-refactoring-arsitektur-state-frontend-domain-contexts)
   - [5.6 Standarisasi Database & Migrasi Produksi](#56-standarisasi-database--migrasi-produksi)
   - [5.7 Standarisasi Logging & Observabilitas](#57-standarisasi-logging--observabilitas)
6. [Roadmap Implementasi & Prioritas Perbaikan](#6-roadmap-implementasi--prioritas-perbaikan)
7. [Production Readiness Checklist (Pintu Kelulusan)](#7-production-readiness-checklist-pintu-kelulusan)

---

## 1. Ringkasan Eksekutif

Audit ini dilakukan untuk mengevaluasi fondasi arsitektur backend, lapisan komunikasi data, integritas tipe, pola state management, serta postur keamanan sistem **Hermes Agentic Hub**.

### Kesimpulan Utama:
Sistem saat ini berada dalam fase **Prototipe / MVP Lokal Fungsional**. Fitur-fitur UI dan orkestrasi agent berhasil berjalan secara visual, namun arsitektur di bawahnya memiliki **celah keamanan kritikal**, **inkonsistensi data contract**, **ketiadaan observabilitas**, serta **bottleneck performa** yang signifikan. 

Jika sistem ini langsung di-deploy ke lingkungan staging publik atau production:
1. **Risiko Data Breach**: Siapapun di jaringan dapat memanipulasi task, trigger agent, dan membaca credential/path server tanpa autentikasi.
2. **Risiko XSS (Cross-Site Scripting)**: 4 titik render HTML mentah tanpa sanitizer membuka celah injeksi script melalui konten task atau AI response.
3. **Risiko Crash Tersembunyi**: Penanganan error yang tidak terstandarisasi dan menelan error diam-diam (*silent swallow*) menyebabkan status sistem tidak dapat diprediksi.

Dokumen ini disusun sebagai panduan resmi standarisasi teknis yang wajib diimplementasikan saat siklus pengembangan fitur selesai.

---

## 2. Pemetaan Arsitektur Saat Ini

Hermes Agentic Hub beroperasi dengan pola 3-Tier:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 1: CLIENT FRONTEND (Single Page Application)                      │
│ - Tech: Vite 6 + React 19 + TypeScript + Tailwind CSS v4               │
│ - Entry Controller: App.tsx (1.334 LOC, God Component, 24 useState)    │
│ - API Client: src/api/hermesApi.ts (1.811 LOC, 48 Method, 2 WS)        │
│ - Types: src/types.ts (380 LOC, 29 Interfaces)                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP Proxy (/api/*) & WS Proxy
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 2: BRIDGE API GATEWAY                                              │
│ - Tech: FastAPI (Python 3.10+) running on 127.0.0.1:9120              │
│ - Entry Server: server.py (526 LOC)                                    │
│ - Routing: 11 direct routes + mounted routers (chat, profiles, etc.)   │
│ - Auth: ZERO (Semua endpoint terbuka tanpa proteksi)                   │
│ - CORS: Wildcard allow_origins=["*"] + allow_credentials=True          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Native Python In-Process & IPC
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 3: HERMES CORE ENGINE & PERSISTENCE LAYER                         │
│ - Tech: Hermes Agent Python Engine + Multi-Profile Fleet Manager       │
│ - Database: SQLite file-based database                                 │
│ - Concurrency: Synchronous request handlers (blocking LLM operations)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Rapor & Skor Arsitektur

| No | Dimensi Arsitektur | Skor | Status | Ringkasan Penilaian |
|:--:|:---|:---:|:---:|:---|
| 1 | **Keamanan (Security)** | **1 / 10** | ⛔ KRITIS | Zero Auth, CORS wildcard, XSS via unescaped HTML, data leakage. |
| 2 | **Desain Lapisan API** | **4 / 10** | ⚠️ BURUK | 48 method fungsional tapi 3 pola error berbeda, zero caching & retry. |
| 3 | **Skema & Integritas Data** | **3 / 10** | ⚠️ BURUK | Banyak `any`, name-based FK, snake_case bercampur camelCase. |
| 4 | **Manajemen State** | **3 / 10** | ⚠️ BURUK | God Component App.tsx, props drilling parah, sequential fetches. |
| 5 | **Penanganan Error** | **3 / 10** | ⚠️ BURUK | Silent error swallowing di Python, no global handler, no Sentry. |
| 6 | **Performa** | **4 / 10** | ⚠️ CUKUP | 10 sequential API calls di boot, zero lazy loading, no conn pooling. |
| 7 | **Skalabilitas** | **2 / 10** | ⛔ KRITIS | SQLite single-file, sync LLM blocking, in-memory state, no Docker. |
| 8 | **Observabilitas** | **1 / 10** | ⛔ KRITIS | Hanya `print()` dan `console.error`, tidak ada structured log / metric. |
| **TOTAL** | **Rata-rata Skor Arsitektur** | **2.6 / 10** | ❌ **TIDAK LAYAK PRODUKSI** | Fondasi harus distandarisasi secara menyeluruh. |

---

## 4. Detail Temuan Kritis per Dimensi

### 4.1 Keamanan (Security) — Skor 1/10
1. **Zero Authentication & Authorization**:
   - `server.py` tidak menerapkan middleware otentikasi sama sekali (tidak ada JWT, Bearer token, session cookie, maupun API Key).
   - Siapa pun yang dapat melakukan koneksi HTTP ke port 9120 dapat mengeksekusi aksi administratif (membuat task, menghapus task, memicu eksekusi agent/autopilot, melihat semua session chat).
2. **CORS Misconfiguration Berbahaya**:
   - Baris konfigurasi FastAPI: `allow_origins=["*"]` digabungkan dengan `allow_credentials=True`.
   - Kombinasi ini merupakan pelanggaran standar keamanan Web RFC dan memungkinkan website pihak ketiga manapun mengeksekusi authenticated cross-site request ke local backend jika port dapat dijangkau.
3. **4x Celah XSS (Cross-Site Scripting)**:
   - `src/components/MarkdownRenderer.tsx:45` → Menggunakan `dangerouslySetInnerHTML={{ __html: marked.parseInline(...) }}` tanpa sanitasi.
   - `src/components/MermaidViewer.tsx:279` → Menginjeksi string SVG langsung ke innerHTML tanpa sanitasi.
   - `src/components/CodeBlock.tsx:169, 180` → Menginjeksi output highlighting langsung ke innerHTML tanpa sanitasi.
   - Proyek tidak menginstal maupun mengimpor pustaka sanitizer seperti `DOMPurify`.
4. **Kebocoran Data Sensitif Sistem (Information Leakage)**:
   - `TaskAttachment.stored_path`: Mengirimkan full absolute path server filesystem ke frontend (contoh: `/home/sigit/...`). Rentan dieksploitasi untuk Local File Inclusion (LFI) / path traversal.
   - `ActiveWorker.worker_pid`, `TaskRun.worker_pid`: Mengekspos Process ID sistem operasi ke browser.
   - `WorkerProcessInfo.cmdline`: Mengekspos seluruh argumen baris perintah proses, yang seringkali memuat token, flags, atau path internal.
   - `AIAgent.path`, `AIAgent.workingDir`: Mengekspos struktur direktori host.
   - `src/data/mockData.ts`: Menyimpan hardcoded IP range internal (`10.6.0.0/16`) dan metadata internal.
5. **WebSocket Security Theater**:
   - Endpoint `GET /api/ws-token` mengembalikan token tanpa verifikasi auth apa pun, sehingga token dapat digenerate bebas oleh siapa saja.
   - Token dikirimkan melalui URL Query Parameter (`?token=...`), yang tercatat di access log, browser history, dan reverse proxy log.
6. **DNS Rebinding Vulnerability**:
   - `vite.config.ts` menyetel `allowedHosts: true`, menonaktifkan validasi Host Header dan membiarkan aplikasi rentan serangan DNS rebinding dari browser.
7. **Injeksi Kode Python Dinamis**:
   - `server.py` melakukan manipulasi `sys.path` dinamis berdasarkan environment variable `HERMES_AGENT_ROOT`.
   - `server.py:214` menggunakan `importlib.util.spec_from_file_location` untuk memuat file Python langsung dari path filesystem.

---

### 4.2 Desain Lapisan API (API Layer) — Skor 4/10
1. **Inkonsistensi Pola Error Handling (3 Gaya Berbeda di 48 Method)**:
   - *Gaya A (Throw Error)*: Menangkap response tidak-OK dan melempar `new Error(detail)`.
   - *Gaya B (Silent Fallback / Swallowing)*: Menangkap catch block dan mengembalikan `[]`, `null`, atau `false`. Caller di frontend mengira data memang kosong, padahal backend sedang down atau mengalami 500 Internal Server Error.
   - *Gaya C (Envelope `{ ok, message }`)*: Mengembalikan objek status tanpa melempar exception.
2. **Ketiadaan Caching & Request Deduplication**:
   - Frontend tidak memiliki in-memory caching (SWR/React Query/Custom cache).
   - Navigasi antar tab atau pembukaan modal berulang kali memicu panggilan HTTP identik ke server.
   - Tidak ada dukungan header `ETag` atau `If-None-Match`.
3. **Penyebaran Tipe `any` di Titik Kritis**:
   - 25+ penggunaan `: any` atau `as any` di `hermesApi.ts`.
   - Method fundamental seperti `getBoard()`, `createTask()`, `updateTask()`, dan `runAgent()` mengembalikan `Promise<any>`, merusak manfaat TypeScript di level pemanggil.
4. **Fetch Tanpa Batas Waktu (Missing Timeout)**:
   - Sebagian besar pemanggilan `fetch()` tidak menyertakan `AbortController` dengan batas timeout. Jika backend hang (misal menunggu LLM response), browser request akan menggantung indefinitely.
5. **Ketiadaan Mekanisme Retry & Idempotency**:
   - Kegagalan jaringan sementara (*transient network glitches*) langsung menggagalkan aksi user tanpa exponential backoff retry.
   - Tidak ada header `Idempotency-Key` pada mutasi kritis (pembuatan task, pembayaran/eksekusi agent).

---

### 4.3 Skema & Integritas Data (Data Layer) — Skor 3/10
1. **Foreign Key Berbasis Nama (Bukan ID)**:
   - Entitas relasional di `types.ts` mengandalkan string nama display: `projectName`, `assigneeName`, `lead`, `members: string[]`.
   - Jika nama project atau nama agent diubah di kemudian hari, seluruh relasi task akan terputus karena ketiadaan UUID foreign key yang immutable.
2. **Inkonsistensi Tipe Identifier & Timestamp**:
   - `TaskComment.id`: `number | string` vs `ChatMessage.id`: `string | number`.
   - `TaskComment.created_at`: `number | string` vs `ChatMessage.timestamp`: `number | string`.
   - Variasi tipe ini menyebabkan bug perbandingan (sorting), hashing, dan duplicate keys di React rendering.
3. **Percampuran Konvensi Naming (camelCase vs snake_case)**:
   - Properti JavaScript frontend menggunakan `camelCase` (`assigneeName`, `updatedAt`, `subtasksCount`).
   - Objek backend Python langsung dipetakan sebagai `snake_case` (`task_id`, `created_at`, `worker_pid`, `parent_task_id`).
   - Tidak ada lapisan adapter/serializer yang menstandarisasi transformasi key di batas jaringan (*boundary layer*).
4. **Hilangnya Type Safety di Envelope Utama**:
   - `TaskDetailsResponse.task: any` → Objek terpenting dalam detail task tidak memiliki tipe data pasti.
   - `comments?: any[]`, `events?: any[]`, `child_results?: any[]`.
   - `KanbanConfig` memiliki index signature `[key: string]: any` yang mengizinkan mutasi sembarang field.
5. **Ketiadaan Validasi Runtime (Zero Runtime Schema Validation)**:
   - Data hasil parsing `await res.json()` langsung di-cast menggunakan `as T` tanpa validasi skema runtime (misal menggunakan Zod). Jika schema backend berubah sedikit saja, frontend akan crash akibat `Cannot read properties of undefined`.

---

### 4.4 Manajemen State (State Management) — Skor 3/10
1. **God Component Anti-Pattern (`App.tsx`)**:
   - Berisi 1.334 baris kode dengan **24 deklarasi `useState` independen**.
   - Menyatukan state navigasi, state Kanban, modal state, autopilot state, toast state, filter state, dan WebSocket connection state di satu komponen raksasa.
2. **Props Drilling yang Sangat Masif**:
   - `KanbanBoard` menerima 12 props.
   - `TableView` menerima 14 props.
   - Array `tasks` di-pass secara manual ke 5 level komponen; array `agents` di-pass ke 7 komponen.
3. **Bottleneck Pemuatan Data (`loadLiveData`)**:
   - Fungsi inisialisasi mengeksekusi **10 panggilan API secara sekuensial (berurutan)** menggunakan `await` satu per satu.
   - Waktu pemuatan awal menjadi akumulasi total latensi 10 request (~1.5 detik hingga 4 detik), padahal 8 dari 10 request tersebut bersifat independen dan dapat dijalankan paralel via `Promise.allSettled()`.
4. **Instansiasi Fungsi Berulang (Render Overhead)**:
   - Sekitar 15 handler fungsi utama (seperti `handleUpdateTaskStatus`, `handleRunAgent`, `handleSaveNewTask`) dideklarasikan sebagai plain function tanpa `useCallback`, memaksa semua child component merender ulang setiap kali state kecil berubah.
5. **Ketiadaan Code Splitting & Lazy Loading**:
   - Seluruh view (`KanbanBoard`, `TableView`, `InboxView`, `ProjectsView`, `AutopilotView`, `AITeamViews`, `ChatView`) diimpor secara statis (*eager import*), membengkakkan initial bundle size JavaScript.

---

### 4.5 Penanganan Error (Error Handling) — Skor 3/10
1. **Silent Swallowing di Sisi Python (`server.py`)**:
   - `except Exception: pass` pada rute session listing dan manipulasi session title. Error kritis di level OS/database disembunyikan tanpa jejak log.
   - `except Exception as e: print(...)` pada mount router modul, menyamarkan kegagalan routing sebagai log biasa tanpa menghentikan server atau memberikan alert.
2. **Ketiadaan Skema Standard Error Response**:
   - Format error dari FastAPI default (`{"detail": "..."}`) tidak konsisten dengan error kustom (`{"ok": false, "error": "..."}` atau plain text).
3. **Single Point of Failure Error Boundary**:
   - Hanya terdapat 1 global Error Boundary di puncak hierarki aplikasi. Satu error kecil pada parsing markdown di modal task akan mematikan seluruh halaman dan memaksa user me-refresh aplikasi.

---

### 4.6 Performa (Performance) — Skor 4/10
1. **Blokir Thread Sinkronus di Server**:
   - Route handler di `server.py` didefinisikan menggunakan `def` (sinkronus), bukan `async def`.
   - Operasi I/O lambat atau eksekusi LLM yang memakan waktu 5-30 detik akan memblokir worker thread pool FastAPI.
2. **Koneksi SQLite Tanpa Pooling**:
   - Setiap request membuka dan menutup koneksi file database SQLite secara mandiri tanpa connection pooling.
3. **Ukuran Dependency Bundle Besar**:
   - Library berat seperti `mermaid` (~2MB) dimuat dalam runtime tanpa pemisahan chunk asynchronous yang terisolasi.
4. **Query Tanpa Paginasi**:
   - Endpoint relasi dan task history mengembalikan seluruh baris data tanpa klausa `limit` atau kursor paginasi.

---

### 4.7 Skalabilitas (Scalability) — Skor 2/10
1. **Keterbatasan Database SQLite**:
   - SQLite memberlakukan lock seluruh database pada operasi write (*table/database-level write lock*). Tidak mampu menangani konkurensi write dari banyak agent otonom secara simultan.
2. **State Server Tersimpan di Memori Proses**:
   - Objek `_WS_SESSION_TOKEN` disimpan sebagai variabel global Python di memory server. Jika server di-restart atau di-scale menjadi multi-worker, session token akan invalid.
3. **Ketiadaan Message Broker / Task Queue**:
   - Eksekusi agent autopilot dijalankan langsung (*in-process / direct execution*) tanpa antrean pesan terdistribusi (seperti Redis + Celery / ARQ), sehingga mudah memicu resource starvation.
4. **Ketiadaan Kontainerisasi & CI/CD**:
   - Tidak ada `Dockerfile`, `docker-compose.yml`, ataupun workflow otomatisasi pengujian (`.github/workflows`).

---

### 4.8 Observabilitas (Observability) — Skor 1/10
1. **Zero Structured Logging**:
   - Log sistem hanya mengandalkan statement `print()` standar Python dan `console.error()` JavaScript.
   - Tidak ada format JSON terstruktur, timestamp standar ISO-8601, maupun level log (`INFO`, `WARN`, `ERROR`, `DEBUG`).
2. **Ketiadaan Request Tracing (Correlation ID)**:
   - Tidak ada header `X-Request-ID` atau `X-Correlation-ID` yang menghubungkan satu klik aksi di frontend dengan log pemrosesan di FastAPI dan eksekusi di Hermes Engine.
3. **Zero Telemetri & Monitoring**:
   - Tidak ada metric endpoint (Prometheus format) untuk mengukur latensi API, pemakaian memori, atau status worker agent.
   - Tidak ada integrasi crash reporting tool (seperti Sentry).

---

## 5. Blueprint Standarisasi Arsitektur Target

Bagian ini merupakan **spesifikasi baku** yang wajib diikuti saat melakukan refactoring arsitektur backend Hermes Agentic Hub.

### 5.1 Standarisasi Kontrak API & Unified Envelope
Setiap respon HTTP dari backend FastAPI wajib dibungkus dalam format JSON envelope standar berikut:

```typescript
// src/types/api.ts
export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

export interface ApiErrorDetail {
  code: string;        // Contoh: "TASK_NOT_FOUND", "UNAUTHORIZED", "VALIDATION_ERROR"
  message: string;     // Pesan user-friendly
  field?: string;      // Field yang tidak valid jika ada
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export type ApiResponse<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
```

---

### 5.2 Standarisasi Client Wrapper (`fetchWithErrorHandling`)
Seluruh 48 method di `hermesApi.ts` wajib dimigrasikan menggunakan satu engine request terstandarisasi:

```typescript
// src/api/httpClient.ts
interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  idempotencyKey?: string;
}

export async function request<T>(
  endpoint: string, 
  options: RequestOptions = {}
): Promise<T> {
  const { 
    timeoutMs = 15000, 
    retries = 2, 
    idempotencyKey, 
    headers = {}, 
    ...fetchOpts 
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Request-ID': crypto.randomUUID(),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    ...(localStorage.getItem('hermes_auth_token') 
        ? { 'Authorization': `Bearer ${localStorage.getItem('hermes_auth_token')}` } 
        : {}),
    ...(headers as Record<string, string>),
  };

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(endpoint, {
        ...fetchOpts,
        headers: requestHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiClientError(
          errorData?.error?.message || `HTTP error ${response.status}`,
          response.status,
          errorData?.error?.code
        );
      }

      const json = await response.json();
      return (json.data !== undefined ? json.data : json) as T;
    } catch (err: any) {
      attempt++;
      if (attempt > retries || err.name === 'AbortError' || (err.status >= 400 && err.status < 500)) {
        clearTimeout(timeoutId);
        throw err;
      }
      // Exponential backoff: 300ms, 600ms, 1200ms
      await new Promise(res => setTimeout(res, 300 * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error("Maximum retry reached");
}
```

---

### 5.3 Standarisasi Keamanan & Sanitasi

#### 1. Sanitasi Output HTML (Pencegahan XSS)
Instal dependensi: `npm install dompurify && npm install -D @types/dompurify`

Implementasikan helper sanitasi universal:
```typescript
// src/utils/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirtyHtml: string): string {
  return DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'code', 'pre', 'ul', 'ol', 'li', 'span', 'svg'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'viewBox', 'd', 'fill', 'stroke'],
  });
}
```
*Terapkan `sanitizeHtml(...)` sebelum mempassing data ke `dangerouslySetInnerHTML` di `MarkdownRenderer.tsx`, `MermaidViewer.tsx`, dan `CodeBlock.tsx`.*

#### 2. Autentikasi API Key / JWT Middleware di Backend (`server.py`)
```python
# server.py
import os
from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)
API_SECRET_KEY = os.getenv("HERMES_API_SECRET_KEY", "default-dev-secret-change-me")

async def verify_auth_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if os.getenv("HERMES_ENV") == "development" and not os.getenv("HERMES_ENFORCE_AUTH"):
        return True # Bypass pada local unit test jika disetel
    if not credentials or credentials.credentials != API_SECRET_KEY:
        raise HTTPException(
            status_code=401, 
            detail={"code": "UNAUTHORIZED", "message": "Autentikasi gagal atau token tidak valid"}
        )
    return True
```

#### 3. Konfigurasi CORS Ketat
```python
# server.py
ALLOWED_ORIGINS = os.getenv("HERMES_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "Idempotency-Key"],
)
```

---

### 5.4 Standarisasi Validasi Runtime Skema (Zod)
Gunakan pustaka `zod` untuk memvalidasi data boundary:

```typescript
// src/schemas/taskSchema.ts
import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().default(''),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  projectId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ValidatedTask = z.infer<typeof TaskSchema>;
```

---

### 5.5 Refactoring Arsitektur State Frontend (Domain Contexts)

Pecah `App.tsx` raksasa menjadi arsitektur berbasis Domain Context modular:

```
src/contexts/
├── TaskContext.tsx      # Mengelola state tasks, boards, mutasi task, filter task
├── AgentContext.tsx     # Mengelola AIAgents, worker status, skill fleet, squad
├── AutopilotContext.tsx # Mengelola jobs autopilot, log eksekusi, approval rules
└── UIStateContext.tsx   # Mengelola tab aktif, modal aktif, search query, toast
```

Contoh Pola Reducer untuk Task:
```typescript
// src/contexts/TaskContext.tsx
type TaskAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'OPTIMISTIC_UPDATE_STATUS'; payload: { taskId: string; newStatus: TaskStatus } }
  | { type: 'ROLLBACK_STATUS'; payload: { taskId: string; oldStatus: TaskStatus } }
  | { type: 'ADD_TASK'; payload: Task };

function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'OPTIMISTIC_UPDATE_STATUS':
      return {
        ...state,
        tasks: state.tasks.map(t => 
          t.id === action.payload.taskId ? { ...t, status: action.payload.newStatus } : t
        )
      };
    // ...
  }
}
```

---

### 5.6 Standarisasi Database & Migrasi Produksi

1. **Migrasi Engine**: Beralih dari SQLite single-file ke **PostgreSQL 16+**.
2. **Koneksi Asinkronus**: Gunakan driver asinkronus Python seperti `asyncpg` dengan library `SQLAlchemy 2.0 (asyncio)` atau `Tortoise ORM`.
3. **Database Migration Tool**: Gunakan `Alembic` untuk melacak seluruh migrasi skema dengan skema rollback reversibel (*up/down revisions*).
4. **Connection Pool**: Konfigurasi pool koneksi:
   ```python
   # min_size=5, max_size=20 koneksi per worker process
   ```

---

### 5.7 Standarisasi Logging & Observabilitas

Gunakan format structured JSON logging menggunakan pustaka `structlog` di FastAPI:

```python
# logger.py
import structlog
import logging

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()
# Output log: {"event": "task_created", "task_id": "abc-123", "user_id": "usr-456", "level": "info", "timestamp": "2026-09-21T18:30:00Z"}
```

---

## 6. Roadmap Implementasi & Prioritas Perbaikan

Pekerjaan refactoring arsitektur dikelompokkan ke dalam tiga fase prioritas:

```
FASE P0 (Blocker Keamanan)     FASE P1 (Stabilitas & Kontrak)    FASE P2 (Maturitas & Skala)
[Estimasi: 1 - 2 Minggu]       [Estimasi: 2 - 3 Minggu]          [Estimasi: Iteratif Pasca-Rilis]
┌──────────────────────────┐   ┌───────────────────────────┐     ┌───────────────────────────┐
│ • Install DOMPurify      │   │ • Centralize HTTP Client  │     │ • Migrasi PostgreSQL      │
│ • API Key / Auth Server  │   │ • Parallelize loadLiveData│     │ • Dockerize Stack         │
│ • Perbaiki Strict CORS   │   │ • Pecah App.tsx (Contexts)│     │ • CI/CD Github Actions    │
│ • Bersihkan Data Leakage │   │ • Validasi Skema Zod      │     │ • Background Queue Celery │
│ • Hapus allowedHosts:true│   │ • Strict Typing (No any)  │     │ • OpenAPI Spec Auto-gen   │
│ • Setup Vitest API Test  │   │ • Structured JSON Logging │     │ • Integrasi Sentry Error  │
└──────────────────────────┘   └───────────────────────────┘     └───────────────────────────┘
```

### Tabel Rincian Tugas

| Prioritas | Kode | Modul Terkait | Estimasi | Deskripsi Tindakan |
|:---:|:---:|:---|:---:|:---|
| **P0** | P0-1 | `src/components/*` | 4 jam | Integrasikan `DOMPurify` pada 4 titik render HTML mentah. |
| **P0** | P0-2 | `server.py` | 2 hari | Tambahkan security middleware API Bearer Token. |
| **P0** | P0-3 | `server.py` | 2 jam | Perbaiki CORS: hapus `allow_origins=["*"]`, ganti whitelist origin. |
| **P0** | P0-4 | `server.py`, `src/types.ts` | 6 jam | Filter dan hapus pemaparan path internal, OS PID, dan cmdline ke client. |
| **P0** | P0-5 | `vite.config.ts` | 15 mnt | Hapus `allowedHosts: true`, definisikan host eksplisit. |
| **P0** | P0-6 | `src/data/mockData.ts` | 1 jam | Hapus IP internal `10.6.0.0/16` dan nomor/nama sensitif. |
| **P0** | P0-7 | Tests | 2 hari | Pasang Vitest dan buat unit test dasar untuk API client. |
| **P1** | P1-1 | `src/api/hermesApi.ts` | 2 hari | Standarisasi seluruh 48 method ke wrapper `fetchWithErrorHandling`. |
| **P1** | P1-2 | `src/App.tsx` | 4 jam | Gunakan `Promise.allSettled()` pada `loadLiveData` (optimasi boot 5x). |
| **P1** | P1-3 | `src/App.tsx` | 4 hari | Pecah God Component menjadi `TaskContext`, `AgentContext`, `UIContext`. |
| **P1** | P1-4 | `src/types.ts` | 2 hari | Berantas semua `: any`, ketatkan interface `TaskDetailsResponse`. |
| **P1** | P1-5 | `src/schemas/` | 2 hari | Implementasikan runtime validator Zod pada data respon backend. |
| **P1** | P1-6 | `server.py` | 1 hari | Pasang structured JSON logging dengan correlation ID. |
| **P1** | P1-7 | `src/App.tsx` | 4 jam | Gunakan `React.lazy()` & `Suspense` untuk komponen view tab. |
| **P2** | P2-1 | DB / Core | 5 hari | Transisi persistence layer dari SQLite ke PostgreSQL + Alembic. |
| **P2** | P2-2 | DevOps | 1 hari | Buat `Dockerfile` multi-stage dan `docker-compose.yml`. |
| **P2** | P2-3 | CI/CD | 1 hari | Buat pipeline GitHub Actions: linting, type-check, security scan, test. |
| **P2** | P2-4 | Core / Engine | 3 hari | Integrasikan antrean tugas asinkronus (Redis/ARQ) untuk eksekusi agent. |
| **P2** | P2-5 | Monitoring | 1 hari | Integrasikan Sentry SDK pada Frontend dan FastAPI backend. |

---

## 7. Production Readiness Checklist (Pintu Kelulusan)

Gunakan checklist ini sebagai kriteria evaluasi akhir sebelum deployment staging/production dinyatakan **GO**:

### Keamanan (Security Gate)
- [ ] Seluruh endpoint FastAPI dilindungi Bearer Auth / API Key valid.
- [ ] CORS hanya mengizinkan domain frontend terdaftar (tidak ada wildcard `*`).
- [ ] Seluruh `dangerouslySetInnerHTML` telah melewati sanitasi `DOMPurify`.
- [ ] Tidak ada absolute file path, process ID, atau command line argument yang bocor di network tab browser.
- [ ] Host header validation aktif di web server dan bundler.

### Reliabilitas & Integritas Data (Data Gate)
- [ ] Relasi data antar entitas menggunakan UUID immutable (bukan display name).
- [ ] Respons backend divalidasi skema Zod sebelum di-consume UI state.
- [ ] Seluruh pemanggilan API memiliki timeout eksplisit (maks 15 detik untuk query standar).
- [ ] Penanganan error terpusat: tidak ada error network yang ditelan diam-diam menjadi data kosong.
- [ ] Tidak ada tipe `any` pada data layer dan API contract.

### Performa & Skalabilitas (Scale Gate)
- [ ] Inisialisasi awal UI memuat data paralel (`Promise.allSettled`), waktu initial paint < 1 detik.
- [ ] Komponen view sekunder dimuat secara on-demand via `React.lazy()`.
- [ ] Database mendukung transaksi ACID konkurensi multi-user (PostgreSQL).
- [ ] Handlers FastAPI menggunakan `async def` untuk mencegah thread blocking.

### Operasional (Ops Gate)
- [ ] Sistem mencatat log dalam format structured JSON dengan `X-Request-ID`.
- [ ] Endpoint `/api/health` memverifikasi koneksi database dan dependencies.
- [ ] Stack aplikasi dapat dijalankan secara konsisten melalui `docker-compose up`.
- [ ] Pipeline CI/CD otomatis menjalankan pengujian unit test dan type checking pada setiap pull request.

---
*Dokumen ini disusun sebagai aset resmi engineering Hermes Agentic Hub dan wajib diperbarui seiring iterasi arsitektur.*
