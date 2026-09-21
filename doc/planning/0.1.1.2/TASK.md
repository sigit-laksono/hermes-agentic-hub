# 📋 Actionable Tasks: Release v0.1.1.2
## Codebase Refactoring & Architecture Improvement

Dokumen task ini merupakan turunan teknis langsung dari [PRD.md](./PRD.md).

---

## 📊 Status Ringkasan Task

| Phase | Task ID | Judul Task | Prioritas | Est. Hours | Owner | Status |
|:---:|---|---|:---:|:---:|:---:|:---:|
| **1** | **TASK-1.1** | Setup Refactoring Infrastructure & Pilot (Autopilot) | 🔴 Kritis | 16h | Dev 1 | `[ ] Ready` |
| **2** | **TASK-2.1** | Extract Kanban Domain APIs | 🔴 Kritis | 12h | Dev 1 | `[ ] Blocked` |
| **2** | **TASK-2.2** | Extract Agents Domain APIs | 🟠 Tinggi | 10h | Dev 2 | `[ ] Blocked` |
| **2** | **TASK-2.3** | Extract Chat Domain APIs | 🔴 Kritis | 14h | Dev 3 | `[ ] Blocked` |
| **2** | **TASK-2.4** | Extract Workers & Channels APIs | 🟡 Sedang | 8h | Dev 4 | `[ ] Blocked` |
| **3** | **TASK-3.1** | Split types.ts by Domain | 🟠 Tinggi | 8h | Dev 1 | `[ ] Blocked` |
| **4** | **TASK-4.1** | Extract useKanban & useBulkActions Hooks | 🔴 Kritis | 10h | Dev 2 | `[ ] Blocked` |
| **4** | **TASK-4.2** | Extract useAgents & useAutopilot Hooks | 🟠 Tinggi | 8h | Dev 3 | `[ ] Blocked` |
| **4** | **TASK-4.3** | Extract useChat & useBackendHealth Hooks | 🟠 Tinggi | 10h | Dev 4 | `[ ] Blocked` |
| **4** | **TASK-4.4** | Refactor App.tsx to Use Hooks | 🔴 Kritis | 12h | Dev 1 | `[ ] Blocked` |
| **5** | **TASK-5.1** | Cleanup, Documentation & Bundle Analysis | 🟡 Sedang | 8h | Tech Lead | `[ ] Blocked` |

**Total Estimated Hours:** 116 hours (~3 weeks with 4 devs working parallel)

---

## 🧪 PHASE 1: Pilot & Infrastructure (Week 1-2)

### TASK-1.1: Setup Refactoring Infrastructure & Pilot (Autopilot Domain)

**Owner:** Dev 1  
**Priority:** 🔴 Kritis  
**Estimated Hours:** 16h  
**Dependencies:** None

#### 📁 Target Files
```
src/api/
├── index.ts                    # CREATE - Facade pattern
├── client.ts                   # CREATE - Shared HTTP utils
└── autopilot/
    ├── index.ts                # CREATE - Re-export
    └── cron.api.ts             # CREATE - Extracted from hermesApi.ts
```

#### 🔧 Implementation Steps

**Step 1: Create Shared HTTP Client (2h)**
```bash
# Create new file
touch src/api/client.ts
```

```typescript
// src/api/client.ts
const API_BASE = import.meta.env?.VITE_HERMES_API_URL || ''

export interface ApiResponse<T> {
  ok: boolean
  data?: T
  message?: string
  error?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const apiClient = {
  baseUrl: API_BASE,
  
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : ''
    const res = await fetch(`${API_BASE}${endpoint}${query}`)
    if (!res.ok) throw new ApiError(`GET ${endpoint} failed: ${res.statusText}`, res.status, res)
    return res.json()
  },
  
  async post<T>(endpoint: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    })
    if (!res.ok) throw new ApiError(`POST ${endpoint} failed: ${res.statusText}`, res.status, res)
    return res.json()
  },
  
  async put<T>(endpoint: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    })
    if (!res.ok) throw new ApiError(`PUT ${endpoint} failed: ${res.statusText}`, res.status, res)
    return res.json()
  },
  
  async delete<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' })
    if (!res.ok) throw new ApiError(`DELETE ${endpoint} failed: ${res.statusText}`, res.status, res)
    return res.json()
  }
}
```

**Step 2: Extract Autopilot Domain (6h)**
```bash
# Create directory structure
mkdir -p src/api/autopilot
touch src/api/autopilot/index.ts
touch src/api/autopilot/cron.api.ts
```

```typescript
// src/api/autopilot/cron.api.ts
import { apiClient } from '../client'
import { AutopilotJob } from '../../types'

/**
 * Get all cron jobs
 */
export async function getCronJobs(): Promise<AutopilotJob[]> {
  return apiClient.get('/api/cron/jobs')
}

/**
 * Trigger a cron job manually
 */
export async function triggerCronJob(jobId: string): Promise<boolean> {
  const res = await apiClient.post(`/api/cron/jobs/${jobId}/trigger`)
  return res.ok
}

/**
 * Pause a running cron job
 */
export async function pauseCronJob(jobId: string): Promise<boolean> {
  const res = await apiClient.post(`/api/cron/jobs/${jobId}/pause`)
  return res.ok
}

/**
 * Resume a paused cron job
 */
export async function resumeCronJob(jobId: string): Promise<boolean> {
  const res = await apiClient.post(`/api/cron/jobs/${jobId}/resume`)
  return res.ok
}

/**
 * Create a new cron job
 */
export async function createCronJob(params: {
  name: string
  schedule: string
  prompt: string
  assignee?: string
  board?: string
  enabled?: boolean
}): Promise<{ ok: boolean; job_id?: string }> {
  return apiClient.post('/api/cron/jobs', params)
}

/**
 * Update existing cron job
 */
export async function updateCronJob(jobId: string, params: {
  name?: string
  schedule?: string
  prompt?: string
  assignee?: string
  enabled?: boolean
}): Promise<{ ok: boolean }> {
  return apiClient.put(`/api/cron/jobs/${jobId}`, params)
}

/**
 * Delete a cron job
 */
export async function deleteCronJob(jobId: string): Promise<boolean> {
  const res = await apiClient.delete(`/api/cron/jobs/${jobId}`)
  return res.ok
}

/**
 * Get execution history for a cron job
 */
export async function getCronJobHistory(jobId: string): Promise<{
  runs: Array<{
    run_id: number
    started_at: number
    ended_at?: number
    status: string
    duration?: string
    error?: string
  }>
}> {
  return apiClient.get(`/api/cron/jobs/${jobId}/history`)
}
```

```typescript
// src/api/autopilot/index.ts
export * from './cron.api'

// Convenience namespace export
import * as cronApi from './cron.api'
export const autopilotApi = {
  ...cronApi
}
```

**Step 3: Create Facade Pattern (4h)**
```typescript
// src/api/index.ts
import { hermesApi as legacyHermesApi } from './hermesApi' // Keep old file temporarily
import * as autopilotCron from './autopilot/cron.api'

// Domain exports (modern pattern)
export { autopilotApi } from './autopilot'
export { apiClient } from './client'

// Backward compatible facade
export const hermesApi = {
  // Autopilot methods (NEW - from refactored module)
  getCronJobs: autopilotCron.getCronJobs,
  triggerCronJob: autopilotCron.triggerCronJob,
  pauseCronJob: autopilotCron.pauseCronJob,
  resumeCronJob: autopilotCron.resumeCronJob,
  createCronJob: autopilotCron.createCronJob,
  updateCronJob: autopilotCron.updateCronJob,
  deleteCronJob: autopilotCron.deleteCronJob,
  getCronJobHistory: autopilotCron.getCronJobHistory,
  
  // All other methods (OLD - delegate to legacy hermesApi)
  ...legacyHermesApi
}
```

**Step 4: Update AutopilotView.tsx to Test (2h)**
```typescript
// src/components/AutopilotView.tsx
// BEFORE:
import { hermesApi } from '../api/hermesApi'

// AFTER (test both patterns work):
import { hermesApi } from '../api'              // ✅ Old pattern still works
import { autopilotApi } from '../api'           // ✅ New pattern works
import { getCronJobs } from '../api/autopilot'  // ✅ Direct import works

// Use any of the three patterns
const jobs = await hermesApi.getCronJobs()      // ✅
const jobs = await autopilotApi.getCronJobs()   // ✅
const jobs = await getCronJobs()                // ✅
```

**Step 5: Verification & Testing (2h)**
```bash
# 1. Build check
npm run build

# 2. Type check
npm run type-check  # or: tsc --noEmit

# 3. Bundle size analysis
npm run build -- --report

# 4. Manual testing
npm run dev
# Test autopilot tab: create, edit, delete, history
```

#### ✅ Acceptance Criteria
- [ ] `src/api/client.ts` created with reusable HTTP methods
- [ ] `src/api/autopilot/cron.api.ts` extracted with all 8 cron methods
- [ ] Facade pattern in `src/api/index.ts` exports both old & new patterns
- [ ] `hermesApi.getCronJobs()` still works (backward compatible)
- [ ] `autopilotApi.getCronJobs()` works (new pattern)
- [ ] Direct import `getCronJobs()` works
- [ ] Build passes without errors
- [ ] AutopilotView component works identically
- [ ] No TypeScript errors
- [ ] Documentation: Add comments to new files

#### 📝 Deliverables
- [ ] Code: 3 new files (`client.ts`, `autopilot/index.ts`, `autopilot/cron.api.ts`)
- [ ] Code: Updated `api/index.ts` with facade
- [ ] Test: Manual smoke test report
- [ ] Docs: `PILOT_REPORT.md` documenting pattern & lessons learned

---

## 🚀 PHASE 2: Parallel Extraction (Week 3-4)

### TASK-2.1: Extract Kanban Domain APIs

**Owner:** Dev 1  
**Priority:** 🔴 Kritis  
**Estimated Hours:** 12h  
**Dependencies:** TASK-1.1 completed

#### 📁 Target Files
```
src/api/kanban/
├── index.ts                # Re-export all
├── boards.api.ts           # Board CRUD, switch, export/import (~200 lines)
├── tasks.api.ts            # Task CRUD, status, bulk ops (~400 lines)
├── stats.api.ts            # Board stats, analytics (~100 lines)
└── config.api.ts           # Kanban config, preferences (~50 lines)
```

#### 🔧 Implementation Steps

**Step 1: Create Directory Structure (0.5h)**
```bash
mkdir -p src/api/kanban
touch src/api/kanban/{index,boards.api,tasks.api,stats.api,config.api}.ts
```

**Step 2: Extract Boards API (3h)**
Extract from `hermesApi.ts` lines ~1309-1464:
- `getBoards()`
- `createBoard()`
- `updateBoard()`
- `switchBoard()`
- `deleteBoard()`
- `exportBoardArchive()`
- `exportBoardJson()`
- `importBoardJson()`

Move to `src/api/kanban/boards.api.ts` dengan JSDoc comments.

**Step 3: Extract Tasks API (4h)**
Extract from `hermesApi.ts` lines ~257-811:
- `createTask()`
- `updateTask()`
- `updateTaskStatus()`
- `bulkUpdateTasks()`
- `reassignTask()`
- `deleteTask()`
- `getTaskDetails()`
- `addTaskComment()`
- Task links (createTaskLink, deleteTaskLink, getTaskLinks)
- Task attachments (upload, download, delete)
- Task estimation (specifyTask, decomposeTask, estimateTask)
- Task execution (runTask, dispatch, reclaimTask)

Move to `src/api/kanban/tasks.api.ts`.

**Step 4: Extract Stats & Config APIs (2h)**
- `getBoardStats()` → `stats.api.ts`
- `getKanbanConfig()` → `config.api.ts`
- `getHomeChannels()`, `subscribeHomeChannel()` → Move to separate `home-channels/` (TASK-2.4)

**Step 5: Create Barrel Export (0.5h)**
```typescript
// src/api/kanban/index.ts
export * from './boards.api'
export * from './tasks.api'
export * from './stats.api'
export * from './config.api'

import * as boardsApi from './boards.api'
import * as tasksApi from './tasks.api'
import * as statsApi from './stats.api'
import * as configApi from './config.api'

export const kanbanApi = {
  ...boardsApi,
  ...tasksApi,
  ...statsApi,
  ...configApi
}
```

**Step 6: Update Facade in api/index.ts (1h)**
```typescript
// src/api/index.ts
import * as kanbanBoards from './kanban/boards.api'
import * as kanbanTasks from './kanban/tasks.api'
import * as kanbanStats from './kanban/stats.api'
import * as kanbanConfig from './kanban/config.api'

export { kanbanApi } from './kanban'

export const hermesApi = {
  // Kanban methods (NEW)
  ...kanbanBoards,
  ...kanbanTasks,
  ...kanbanStats,
  ...kanbanConfig,
  
  // Autopilot (from TASK-1.1)
  ...autopilotCron,
  
  // Rest (OLD - still delegated)
  ...legacyHermesApi
}
```

**Step 7: Update Components (1h)**
Update imports in:
- `KanbanBoard.tsx`
- `TableView.tsx`
- `ProjectsView.tsx`

```typescript
// Option 1: Use new pattern
import { kanbanApi } from '@/api'
const tasks = await kanbanApi.getTasks()

// Option 2: Keep old pattern (still works)
import { hermesApi } from '@/api'
const tasks = await hermesApi.getTasks()
```

#### ✅ Acceptance Criteria
- [ ] All kanban methods extracted to domain modules
- [ ] Barrel export `kanbanApi` available
- [ ] Facade maintains backward compatibility
- [ ] Build passes
- [ ] Kanban board works identically
- [ ] No console errors

---

### TASK-2.2: Extract Agents Domain APIs

**Owner:** Dev 2  
**Priority:** 🟠 Tinggi  
**Estimated Hours:** 10h  
**Dependencies:** TASK-1.1 completed

#### 📁 Target Files
```
src/api/agents/
├── index.ts
├── profiles.api.ts         # ~350 lines - Agent CRUD, soul, model
├── skills.api.ts           # ~200 lines - Skills CRUD, toggle, content
└── squads.api.ts           # ~50 lines - Squad management
```

#### 🔧 Implementation Steps

**Step 1: Extract Profiles API (4h)**
Extract from `hermesApi.ts` lines ~812-1108:
- `getProfiles()`
- `getProfileSoul()`, `updateProfileSoul()`
- `updateProfileDescription()`
- `getModelOptions()`, `updateProfileModel()`
- `createProfile()`, `deleteProfile()`
- `exportProfile()`, `importProfile()`
- `getActiveProfile()`, `setActiveProfile()`
- `autoDescribeProfile()`

Move to `src/api/agents/profiles.api.ts`.

**Step 2: Extract Skills API (3h)**
Extract from `hermesApi.ts` lines ~1248-1308:
- `getSkills()`
- `getSkillContent()`
- `createSkill()`
- `updateSkillContent()`
- `toggleSkill()`
- `getProfileSkills()`
- `toggleProfileSkill()`

Move to `src/api/agents/skills.api.ts`.

**Step 3: Extract Squads API (1h)**
Extract squad-related methods (if any from orchestration section).
Move to `src/api/agents/squads.api.ts`.

**Step 4: Create Barrel Export & Update Facade (1h)**
```typescript
// src/api/agents/index.ts
export * from './profiles.api'
export * from './skills.api'
export * from './squads.api'

export const agentsApi = { /* ... */ }
```

**Step 5: Update Components (1h)**
- `AgentsView.tsx`
- `SquadsView.tsx`
- `SkillsView.tsx`
- `AITeamViews.tsx`

#### ✅ Acceptance Criteria
- [ ] Agents domain fully extracted
- [ ] AI Team views work identically
- [ ] Profile CRUD operations functional
- [ ] Skills catalog loads correctly

---

### TASK-2.3: Extract Chat Domain APIs

**Owner:** Dev 3  
**Priority:** 🔴 Kritis  
**Estimated Hours:** 14h  
**Dependencies:** TASK-1.1 completed

#### 📁 Target Files
```
src/api/chat/
├── index.ts
├── sessions.api.ts         # ~150 lines - Session CRUD, rename
├── messages.api.ts         # ~100 lines - Message history
└── streaming.api.ts        # ~600 lines - SSE/WebSocket, approval, clarify
```

#### 🔧 Implementation Steps

**Step 1: Extract Sessions API (3h)**
Extract session management methods.

**Step 2: Extract Messages API (2h)**
Extract message history, send methods.

**Step 3: Extract Streaming API (6h)** ⚠️ Most Complex
Extract from `hermesApi.ts` lines ~1615-2671:
- `createChatStream()` - SSE implementation
- `createChatWebSocket()` - WebSocket fallback
- `ChatSocketController` interface
- Approval handlers
- Clarify handlers
- Metering handlers

**Critical:** Keep backward compatibility for `ChatView.tsx`.

**Step 4: Create Barrel Export & Update Facade (1h)**

**Step 5: Update ChatView Component (2h)**
```typescript
// src/components/ChatView.tsx
import { chatApi } from '@/api'

const stream = chatApi.createChatStream(/* ... */)
```

#### ✅ Acceptance Criteria
- [ ] Chat streaming works identically
- [ ] SSE connection stable
- [ ] Approval flow functional
- [ ] Clarify prompts work
- [ ] Metering data displays

---

### TASK-2.4: Extract Workers & Channels APIs

**Owner:** Dev 4  
**Priority:** 🟡 Sedang  
**Estimated Hours:** 8h  
**Dependencies:** TASK-1.1 completed

#### 📁 Target Files
```
src/api/workers/
├── index.ts
├── active.api.ts           # ~80 lines
└── processes.api.ts        # ~100 lines

src/api/home-channels/
├── index.ts
└── channels.api.ts         # ~100 lines
```

#### 🔧 Implementation Steps

**Step 1: Extract Workers API (3h)**
- `getActiveWorkers()`
- `inspectRun()`
- `terminateRun()`
- `reclaimTask()`

**Step 2: Extract Home Channels API (2h)**
- `getHomeChannels()`
- `subscribeHomeChannel()`
- `unsubscribeHomeChannel()`
- `toggleHomeChannel()`

**Step 3: Extract Orchestration API (2h)**
```
src/api/orchestration/
└── settings.api.ts
```

**Step 4: Update Facade (1h)**

#### ✅ Acceptance Criteria
- [ ] Workers list displays correctly
- [ ] Terminate run works
- [ ] Home channels subscription functional

---

## 📦 PHASE 3: Types Migration (Week 5)

### TASK-3.1: Split types.ts by Domain

**Owner:** Dev 1  
**Priority:** 🟠 Tinggi  
**Estimated Hours:** 8h  
**Dependencies:** TASK-2.1, TASK-2.2, TASK-2.3, TASK-2.4

#### 📁 Target Files
```
src/types/
├── index.ts                   # Re-export all (backward compatible)
├── common.ts                  # ~50 lines
├── kanban.types.ts           # ~150 lines
├── agents.types.ts           # ~100 lines
├── chat.types.ts             # ~80 lines
├── autopilot.types.ts        # ~30 lines
├── workers.types.ts          # ~50 lines
└── ui.types.ts               # ~50 lines
```

#### 🔧 Implementation Steps

**Step 1: Create Directory & Files (0.5h)**
```bash
mkdir -p src/types
touch src/types/{index,common,kanban,agents,chat,autopilot,workers,ui}.types.ts
```

**Step 2: Extract Common Types (1h)**
```typescript
// src/types/common.ts
export type TaskStatus = 'triage' | 'todo' | 'scheduled' | 'ready' | 'running' | 'blocked' | 'review' | 'done' | 'archived'
export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none'
export type ViewTab = 'my_issues' | 'inbox' | 'projects' | 'autopilot' | 'agents' | 'squads' | 'skills' | 'chat' | 'settings'
```

**Step 3: Extract Domain Types (4h)**
- Kanban types: `Task`, `Board`, `Column`, `BoardStats`, `KanbanConfig`
- Agents types: `AIAgent`, `Squad`, `Skill`, `SkillContent`
- Chat types: `ChatSession`, `ChatMessage`, `ToolCall`, `PendingApproval`
- etc.

**Step 4: Create Barrel Export (1h)**
```typescript
// src/types/index.ts
// Re-export everything for backward compatibility
export * from './common'
export * from './kanban.types'
export * from './agents.types'
export * from './chat.types'
export * from './autopilot.types'
export * from './workers.types'
export * from './ui.types'
```

**Step 5: Update Imports Across Codebase (1.5h)**
```bash
# Find all imports from './types'
grep -r "from './types'" src/

# Update to new pattern (optional, for new code)
# Old: import { Task } from './types'
# New: import { Task } from '@/types'  # Still works!
```

#### ✅ Acceptance Criteria
- [ ] All types accessible via `import { ... } from '@/types'`
- [ ] Zero TypeScript errors
- [ ] Build passes
- [ ] Type inference still works

---

## 🎣 PHASE 4: App.tsx Refactoring (Week 6-7)

### TASK-4.1: Extract useKanban & useBulkActions Hooks

**Owner:** Dev 2  
**Priority:** 🔴 Kritis  
**Estimated Hours:** 10h  
**Dependencies:** TASK-2.1, TASK-3.1

#### 📁 Target Files
```
src/hooks/
├── useKanban.ts              # ~150 lines
└── useBulkActions.ts         # ~80 lines
```

#### 🔧 Implementation Steps

**Step 1: Create useKanban Hook (5h)**
```typescript
// src/hooks/useKanban.ts
import { useState, useCallback, useEffect } from 'react'
import { kanbanApi } from '@/api'
import { Task, Board, BoardStats } from '@/types'

export const useKanban = (activeBoard?: string) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [boardStats, setBoardStats] = useState<BoardStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadBoard = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await kanbanApi.getBoard(activeBoard)
      const flatTasks = data.columns.flatMap(col => 
        col.tasks.map(t => ({ ...t, status: col.name }))
      )
      setTasks(flatTasks)
      
      const stats = await kanbanApi.getBoardStats(activeBoard)
      setBoardStats(stats)
    } catch (error) {
      console.error('Failed to load board:', error)
    } finally {
      setIsLoading(false)
    }
  }, [activeBoard])

  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ))
    
    try {
      await kanbanApi.updateTaskStatus(taskId, newStatus, activeBoard)
    } catch (error) {
      // Rollback on error
      await loadBoard()
      throw error
    }
  }, [activeBoard, loadBoard])

  const createTask = useCallback(async (params: any) => {
    const result = await kanbanApi.createTask(params)
    await loadBoard()
    return result
  }, [loadBoard])

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  return {
    tasks,
    boards,
    boardStats,
    isLoading,
    loadBoard,
    moveTask,
    createTask,
    // ... more operations
  }
}
```

**Step 2: Create useBulkActions Hook (3h)**
```typescript
// src/hooks/useBulkActions.ts
import { useState, useCallback } from 'react'
import { kanbanApi } from '@/api'

export const useBulkActions = (onSuccess?: () => void) => {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  const toggleSelection = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }, [])

  const bulkMove = useCallback(async (newStatus: TaskStatus) => {
    setIsProcessing(true)
    try {
      await kanbanApi.bulkUpdateTasks(
        Array.from(selectedTaskIds),
        { status: newStatus }
      )
      setSelectedTaskIds(new Set())
      onSuccess?.()
    } finally {
      setIsProcessing(false)
    }
  }, [selectedTaskIds, onSuccess])

  return {
    selectedTaskIds,
    isProcessing,
    toggleSelection,
    selectAll: /* ... */,
    clearSelection: /* ... */,
    bulkMove,
    bulkAssign: /* ... */,
    bulkDelete: /* ... */,
  }
}
```

**Step 3: Integration Test (2h)**
Test hooks in isolation with React Testing Library.

#### ✅ Acceptance Criteria
- [ ] `useKanban` hook fully functional
- [ ] `useBulkActions` hook works
- [ ] Optimistic updates work
- [ ] Error rollback works
- [ ] Unit tests pass

---

### TASK-4.2: Extract useAgents & useAutopilot Hooks

**Owner:** Dev 3  
**Priority:** 🟠 Tinggi  
**Estimated Hours:** 8h  
**Dependencies:** TASK-2.2

#### 📁 Target Files
```
src/hooks/
├── useAgents.ts              # ~100 lines
└── useAutopilot.ts           # ~80 lines
```

#### 🔧 Implementation Steps
Similar pattern to TASK-4.1.

#### ✅ Acceptance Criteria
- [ ] `useAgents` manages agents, skills, squads state
- [ ] `useAutopilot` manages cron jobs
- [ ] Works with AgentsView, AutopilotView

---

### TASK-4.3: Extract useChat & useBackendHealth Hooks

**Owner:** Dev 4  
**Priority:** 🟠 Tinggi  
**Estimated Hours:** 10h  
**Dependencies:** TASK-2.3

#### 📁 Target Files
```
src/hooks/
├── useChat.ts                # ~120 lines
├── useBackendHealth.ts       # ~50 lines
└── useToasts.ts              # ~40 lines
```

#### 🔧 Implementation Steps

**Step 1: Extract useChat (6h)**
```typescript
// src/hooks/useChat.ts
export const useChat = (profileId?: string) => {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  
  const startStream = useCallback(async (prompt: string) => {
    const controller = await chatApi.createChatStream({
      profile: profileId,
      onToken: (token) => {
        // Append to current message
      },
      onComplete: () => {
        setIsStreaming(false)
      }
    })
    
    controller.sendMessage(prompt)
  }, [profileId])
  
  return {
    sessions,
    activeSession,
    messages,
    isStreaming,
    startStream,
    interrupt: /* ... */,
    sendMessage: /* ... */,
  }
}
```

**Step 2: Extract useBackendHealth (2h)**
```typescript
// src/hooks/useBackendHealth.ts
export const useBackendHealth = (pollInterval = 30000) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  
  useEffect(() => {
    const check = async () => {
      const ok = await apiClient.checkHealth()
      setIsConnected(ok)
      setLastChecked(new Date())
    }
    
    check()
    const interval = setInterval(check, pollInterval)
    return () => clearInterval(interval)
  }, [pollInterval])
  
  return { isConnected, lastChecked }
}
```

**Step 3: Extract useToasts (2h)**

#### ✅ Acceptance Criteria
- [ ] Chat streaming works via hook
- [ ] Backend health polling works
- [ ] Toast system functional

---

### TASK-4.4: Refactor App.tsx to Use Hooks

**Owner:** Dev 1  
**Priority:** 🔴 Kritis  
**Estimated Hours:** 12h  
**Dependencies:** TASK-4.1, TASK-4.2, TASK-4.3

#### 🔧 Implementation Steps

**Step 1: Replace Kanban State (3h)**
```typescript
// src/App.tsx
// BEFORE (1,393 lines):
const [tasks, setTasks] = useState<Task[]>([])
const [boards, setBoards] = useState<Board[]>([])
const [boardStats, setBoardStats] = useState<BoardStats | null>(null)
const loadBoard = useCallback(async () => {
  // ... 50 lines of logic
}, [])

// AFTER (~150 lines):
const {
  tasks,
  boards,
  boardStats,
  isLoading,
  moveTask,
  createTask,
} = useKanban(activeBoard)

const {
  selectedTaskIds,
  toggleSelection,
  bulkMove,
} = useBulkActions()
```

**Step 2: Replace Agents State (2h)**
```typescript
const {
  agents,
  squads,
  skills,
  loadAgents,
  createProfile,
} = useAgents()
```

**Step 3: Replace Chat State (2h)**
```typescript
const {
  sessions,
  activeSession,
  startStream,
} = useChat(chatInitialProfile)
```

**Step 4: Replace Autopilot State (2h)**
```typescript
const {
  autopilots,
  loadCronJobs,
  triggerJob,
} = useAutopilot()
```

**Step 5: Replace Utility State (1h)**
```typescript
const { isConnected } = useBackendHealth()
const { pushToast, dismissToast } = useToasts()
```

**Step 6: Cleanup & Simplify (2h)**
Remove unused state, callbacks, effects.

**Target App.tsx Structure:**
```typescript
// src/App.tsx (~150 lines)
export const AppContent: React.FC = () => {
  // 1. Routing state
  const [activeTab, setActiveTab] = useState<ViewTab>('my_issues')
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  
  // 2. Modal state
  const [isNewIssueOpen, setIsNewIssueOpen] = useState(false)
  // ... other modals
  
  // 3. Custom hooks (all state management delegated)
  const kanban = useKanban(activeBoard)
  const agents = useAgents()
  const autopilot = useAutopilot()
  const chat = useChat(chatInitialProfile)
  const bulkActions = useBulkActions()
  const { isConnected } = useBackendHealth()
  const { pushToast, dismissToast } = useToasts()
  
  // 4. Render
  return (
    <div className="flex h-screen">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1">
        <Header />
        {activeTab === 'my_issues' && (
          <KanbanBoard
            tasks={kanban.tasks}
            onMoveTask={kanban.moveTask}
            selectedTaskIds={bulkActions.selectedTaskIds}
            onToggleSelection={bulkActions.toggleSelection}
          />
        )}
        {/* ... other tabs */}
      </main>
    </div>
  )
}
```

#### ✅ Acceptance Criteria
- [ ] App.tsx reduced from 1,393 to ~150 lines
- [ ] All functionality preserved
- [ ] No regressions in UI behavior
- [ ] Build passes
- [ ] Manual smoke test successful

---

## ✨ PHASE 5: Cleanup & Documentation (Week 8)

### TASK-5.1: Cleanup, Documentation & Bundle Analysis

**Owner:** Tech Lead  
**Priority:** 🟡 Sedang  
**Estimated Hours:** 8h  
**Dependencies:** All TASK-4.x completed

#### 🔧 Implementation Steps

**Step 1: Remove Legacy hermesApi.ts (1h)**
```bash
# Backup first
cp src/api/hermesApi.ts src/api/hermesApi.ts.legacy.bak

# Delete (only facade remains in api/index.ts)
rm src/api/hermesApi.ts

# Verify build still passes
npm run build
```

**Step 2: Bundle Size Analysis (2h)**
```bash
# Generate bundle report
npm run build -- --report

# Compare before/after:
# - Main bundle size
# - Chunk sizes
# - Tree-shaking effectiveness

# Document findings in BUNDLE_ANALYSIS.md
```

**Step 3: Update Documentation (3h)**
Create/update:
- `docs/architecture/API_CLIENT_GUIDE.md`
- `docs/architecture/HOOKS_GUIDE.md`
- `docs/architecture/MIGRATION_GUIDE.md`
- `CONTRIBUTING.md` (update file organization rules)

**Step 4: Create Migration Cheat Sheet (1h)**
```markdown
# Migration Cheat Sheet

## API Imports

### Old Pattern (Still Works)
import { hermesApi } from '@/api'
hermesApi.getBoard()

### New Pattern (Recommended)
import { kanbanApi } from '@/api'
kanbanApi.getBoard()

### Direct Import (Best Tree-Shaking)
import { getBoard } from '@/api/kanban'
getBoard()

## Hooks

### Before
const [tasks, setTasks] = useState([])
useEffect(() => { /* load tasks */ }, [])

### After
const { tasks, loadBoard } = useKanban(activeBoard)
```

**Step 5: Final Verification (1h)**
- [ ] All tests pass
- [ ] All components work
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Bundle size acceptable
- [ ] Documentation complete

#### ✅ Acceptance Criteria
- [ ] Legacy `hermesApi.ts` removed
- [ ] Bundle report generated
- [ ] Documentation complete
- [ ] Team trained on new patterns
- [ ] Release ready

---

## 📊 Progress Tracking

**Weekly Checklist:**

### Week 1-2: Pilot
- [ ] TASK-1.1 completed
- [ ] Pilot report written
- [ ] Team aligned on patterns

### Week 3: Parallel Extraction Begins
- [ ] TASK-2.1 (Kanban) started
- [ ] TASK-2.2 (Agents) started
- [ ] TASK-2.3 (Chat) started
- [ ] TASK-2.4 (Workers) started

### Week 4: Parallel Extraction Complete
- [ ] All TASK-2.x completed
- [ ] All domains extracted
- [ ] Facade updated
- [ ] Integration tests pass

### Week 5: Types Migration
- [ ] TASK-3.1 completed
- [ ] All types split by domain
- [ ] Zero TypeScript errors

### Week 6: Hooks Extraction
- [ ] TASK-4.1 completed (Kanban hooks)
- [ ] TASK-4.2 completed (Agents hooks)
- [ ] TASK-4.3 completed (Chat hooks)

### Week 7: App.tsx Refactoring
- [ ] TASK-4.4 completed
- [ ] App.tsx slimmed to ~150 lines
- [ ] All functionality preserved

### Week 8: Cleanup & Release
- [ ] TASK-5.1 completed
- [ ] Documentation complete
- [ ] v0.1.1.2 released! 🚀

---

## 🚨 Risk Management

**High Risk Items:**
1. **Chat streaming refactoring** - Complex SSE/WebSocket logic
   - Mitigation: Extensive testing, fallback to old code if issues
   
2. **Breaking type changes** - TypeScript errors cascade
   - Mitigation: Maintain backward compatible re-exports

**Medium Risk Items:**
1. **Merge conflicts** - 4 devs working in parallel
   - Mitigation: Clear domain ownership, daily standups

**Rollback Plan:**
- Each phase is a separate branch
- Can rollback to previous phase if critical issues found
- Feature flags for gradual rollout

---

## 📚 Additional Resources

- [REFACTORING_PLAN.md](/REFACTORING_PLAN.md) - Detailed technical architecture
- [PRD.md](./PRD.md) - Product requirements
- [0.1.1/COMPLETION_REPORT.md](../0.1.1/COMPLETION_REPORT.md) - Previous release context

---

**Created by:** Backend Specialist Agent + Kiro AI  
**Date:** 2026-09-21  
**Version:** 1.0  
**Status:** Ready for execution
