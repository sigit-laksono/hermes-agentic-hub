# Hermes Agentic Hub - Refactoring Plan

## 🎯 Goals
- Split `hermesApi.ts` (2,671 lines) into maintainable domain modules
- Refactor `App.tsx` (1,393 lines) into composable hooks/providers
- Split `types.ts` (422 lines) by domain
- Maintain backward compatibility during migration
- Zero breaking changes for existing code

---

## 📁 Proposed File Structure

```
src/
├── api/
│   ├── index.ts                    # Facade exports (hermesApi + domain exports)
│   ├── client.ts                   # Shared HTTP client, error handling
│   │
│   ├── kanban/
│   │   ├── index.ts               # Re-export all kanban APIs
│   │   ├── boards.api.ts          # ~200 lines - Board CRUD, switch, export/import
│   │   ├── tasks.api.ts           # ~400 lines - Task CRUD, status, bulk operations
│   │   ├── stats.api.ts           # ~100 lines - Board stats, analytics
│   │   └── config.api.ts          # ~50 lines - Kanban config, preferences
│   │
│   ├── tasks/
│   │   ├── index.ts
│   │   ├── comments.api.ts        # ~80 lines - Task comments/feedback
│   │   ├── links.api.ts           # ~100 lines - Task dependencies, parent/child
│   │   ├── attachments.api.ts     # ~150 lines - File upload/download
│   │   ├── estimation.api.ts      # ~80 lines - Task estimation, decompose, specify
│   │   └── execution.api.ts       # ~100 lines - runTask, dispatch
│   │
│   ├── agents/
│   │   ├── index.ts
│   │   ├── profiles.api.ts        # ~350 lines - Agent CRUD, soul, description
│   │   ├── skills.api.ts          # ~200 lines - Skills CRUD, toggle, content
│   │   └── squads.api.ts          # ~50 lines - Squad management
│   │
│   ├── autopilot/
│   │   ├── index.ts
│   │   └── cron.api.ts            # ~200 lines - Cron jobs CRUD, trigger, history
│   │
│   ├── chat/
│   │   ├── index.ts
│   │   ├── sessions.api.ts        # ~150 lines - Session CRUD, rename
│   │   ├── messages.api.ts        # ~100 lines - Message history
│   │   └── streaming.api.ts       # ~600 lines - SSE/WebSocket, approval, clarify
│   │
│   ├── workers/
│   │   ├── index.ts
│   │   ├── active.api.ts          # ~80 lines - Active workers list
│   │   └── processes.api.ts       # ~100 lines - Inspect, terminate, reclaim
│   │
│   ├── home-channels/
│   │   ├── index.ts
│   │   └── channels.api.ts        # ~100 lines - Subscribe/unsubscribe Slack/Discord
│   │
│   └── orchestration/
│       ├── index.ts
│       └── settings.api.ts        # ~80 lines - Orchestration settings
│
├── types/
│   ├── index.ts                   # Re-export all types (backward compatible)
│   ├── common.ts                  # ~50 lines - Shared types (Priority, Status)
│   ├── kanban.types.ts           # ~150 lines - Board, Task, Column, BoardStats
│   ├── agents.types.ts           # ~100 lines - AIAgent, Squad, Skill
│   ├── chat.types.ts             # ~80 lines - ChatSession, ChatMessage, handlers
│   ├── autopilot.types.ts        # ~30 lines - AutopilotJob
│   ├── workers.types.ts          # ~50 lines - WorkerProcessInfo, ActiveWorker
│   └── ui.types.ts               # ~50 lines - ViewTab, UI-specific types
│
├── hooks/
│   ├── useKanban.ts              # ~150 lines - Board state, task operations
│   ├── useAgents.ts              # ~100 lines - Agents, squads, skills state
│   ├── useAutopilot.ts           # ~80 lines - Cron jobs state
│   ├── useChat.ts                # ~120 lines - Chat sessions, streaming
│   ├── useBackendHealth.ts       # ~50 lines - Connection status, polling
│   ├── useBulkActions.ts         # ~80 lines - Multi-select, bulk operations
│   └── useToasts.ts              # ~40 lines - Toast notifications
│
├── providers/                     # (Optional) Context providers for global state
│   ├── KanbanProvider.tsx
│   ├── AgentsProvider.tsx
│   └── ChatProvider.tsx
│
├── stores/                        # (Optional) Zustand stores if needed
│   ├── kanbanStore.ts
│   └── chatStore.ts
│
├── App.tsx                        # ~150 lines - Routing, layout, providers only
├── components/                    # Existing components (minimal changes)
│   ├── KanbanBoard.tsx
│   ├── ChatView.tsx
│   └── ...
└── data/
    └── mockData.ts

```

---

## 🏗️ Architecture Decisions

### 1. API Client Pattern: Domain-based Split

**Why not by HTTP method?**
- ❌ `get.ts`, `post.ts` - Too fragmented, loses semantic grouping
- ❌ Hard to find "where is createTask?"

**Why not by resource?**
- ❌ `tasks.ts`, `boards.ts` - Still too large (boards + tasks = ~800 lines)
- ❌ Unclear where "board stats" belongs

**✅ Domain-based:**
- Clear boundaries (kanban, agents, chat, workers)
- Each file 50-400 lines (optimal for IDE)
- Easy to locate code: "I need kanban stuff → kanban/"
- Supports team parallelization

---

### 2. Export Strategy: Facade + Direct Imports

**Problem:** Need backward compatibility BUT want modern tree-shaking

**Solution:** Support both patterns

#### Backward Compatible (Old Code)
```typescript
import { hermesApi } from '@/api'
await hermesApi.getBoard()
await hermesApi.getCronJobs()
```

#### Modern (New Code)
```typescript
import { kanbanApi } from '@/api'
await kanbanApi.getBoard()

// Or even more specific
import { getBoard } from '@/api/kanban'
await getBoard()
```

**Implementation:**
```typescript
// src/api/index.ts
import * as kanbanBoards from './kanban/boards.api'
import * as kanbanTasks from './kanban/tasks.api'
import * as autopilotCron from './autopilot/cron.api'

// Facade (backward compatible)
export const hermesApi = {
  ...kanbanBoards,
  ...kanbanTasks,
  ...autopilotCron,
  // etc.
}

// Domain exports (modern)
export { kanbanApi } from './kanban'
export { chatApi } from './chat'
export { agentsApi } from './agents'
```

---

### 3. App.tsx Refactoring: Custom Hooks Pattern

**Why not Redux/Zustand immediately?**
- ✅ Custom hooks are simpler, less boilerplate
- ✅ Can migrate to Zustand later if needed
- ✅ Colocation: hook + API calls together

**Why not Context API everywhere?**
- ⚠️ Context re-renders all consumers (performance issue)
- ✅ Use Context only for truly global state (theme, auth)
- ✅ Use hooks + local state for feature state

**Pattern:**
```typescript
// src/hooks/useKanban.ts
export const useKanban = (board?: string) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<BoardStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const loadBoard = useCallback(async () => {
    setIsLoading(true)
    const data = await kanbanApi.getBoard(board)
    setTasks(extractTasks(data.columns))
    const statsData = await kanbanApi.getStats(board)
    setStats(statsData)
    setIsLoading(false)
  }, [board])
  
  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    await kanbanApi.updateTaskStatus(taskId, newStatus, board)
    await loadBoard() // Or optimistic update
  }, [board, loadBoard])
  
  useEffect(() => {
    loadBoard()
  }, [loadBoard])
  
  return { tasks, stats, isLoading, loadBoard, moveTask }
}

// Usage in App.tsx (or KanbanBoard.tsx)
const { tasks, stats, isLoading, moveTask } = useKanban(activeBoard)
```

**Benefits:**
- Each hook ~100-150 lines (manageable)
- Self-contained: state + API calls + effects
- Easy to test in isolation
- Can be moved to Zustand later if needed

---

## 🚀 Migration Strategy (8-Week Plan)

### Week 1: Infrastructure Setup
**Goal:** Prepare structure without breaking anything

**Tasks:**
- [ ] Create directory structure (`api/`, `types/`, `hooks/`)
- [ ] Create `api/client.ts` (shared utilities)
- [ ] Create `types/index.ts` (will re-export all types)
- [ ] Document migration plan (this file)
- [ ] Set up new linter rules (max file length: 500 lines)

**Deliverable:** New folders + shared utilities  
**Risk:** None (no code changed yet)  
**Test:** Run `npm run build` - should still work

---

### Week 2: Extract First Domain (Pilot)
**Goal:** Prove the pattern works with smallest domain

**Domain:** `autopilot` (simplest, least dependencies)

**Tasks:**
- [ ] Create `api/autopilot/cron.api.ts`
  - Copy `getCronJobs`, `createCronJob`, etc. from `hermesApi.ts`
  - Use `fetchJson` from `client.ts`
- [ ] Create `api/autopilot/index.ts` (re-export)
- [ ] Create `types/autopilot.types.ts`
  - Move `AutopilotJob` from `types.ts`
  - Re-export from `types/index.ts`
- [ ] Update `hermesApi.ts` to delegate:
  ```typescript
  import * as autopilotCron from './autopilot/cron.api'
  
  export const hermesApi = {
    // ... existing methods
    getCronJobs: autopilotCron.getCronJobs,
    createCronJob: autopilotCron.createCronJob,
    // etc.
  }
  ```
- [ ] Test `AutopilotView` component - should work unchanged
- [ ] Write unit tests for `cron.api.ts`

**Deliverable:** Autopilot domain extracted, backward compatible  
**Risk:** Low (delegate pattern maintains API)  
**Test:** Full UI test - Autopilot tab should work perfectly

---

### Week 3-4: Parallel Domain Extraction
**Goal:** Team works on different domains simultaneously

**Team Assignment:**
- **Developer A:** `kanban/` domain
  - [ ] `kanban/boards.api.ts` (~200 lines)
  - [ ] `kanban/tasks.api.ts` (~400 lines)
  - [ ] `kanban/stats.api.ts` (~100 lines)
  - [ ] `kanban/config.api.ts` (~50 lines)
  - [ ] `types/kanban.types.ts`
  
- **Developer B:** `agents/` domain
  - [ ] `agents/profiles.api.ts` (~350 lines)
  - [ ] `agents/skills.api.ts` (~200 lines)
  - [ ] `agents/squads.api.ts` (~50 lines)
  - [ ] `types/agents.types.ts`
  
- **Developer C:** `chat/` domain
  - [ ] `chat/sessions.api.ts` (~150 lines)
  - [ ] `chat/messages.api.ts` (~100 lines)
  - [ ] `chat/streaming.api.ts` (~600 lines - complex!)
  - [ ] `types/chat.types.ts`
  
- **Developer D:** `workers/` + `tasks/` + `home-channels/`
  - [ ] `workers/active.api.ts`
  - [ ] `workers/processes.api.ts`
  - [ ] `tasks/comments.api.ts`
  - [ ] `tasks/links.api.ts`
  - [ ] `tasks/attachments.api.ts`
  - [ ] `home-channels/channels.api.ts`

**Process (per domain):**
1. Create domain folder + files
2. Extract methods from `hermesApi.ts`
3. Update `hermesApi.ts` to delegate
4. Update types
5. Add unit tests
6. Open PR
7. Code review
8. Merge to main

**Merge Strategy:**
- Merge one domain per day (stagger PRs)
- Run full test suite after each merge
- Manual UI smoke test after each merge

**Deliverable:** All domains extracted, hermesApi.ts becomes thin delegator  
**Risk:** Medium (merge conflicts possible)  
**Mitigation:** Daily standups, clear domain boundaries, PR order

---

### Week 5: Types Migration
**Goal:** Split types.ts without breaking imports

**Tasks:**
- [ ] Create domain-specific type files (already done in Week 3-4)
- [ ] Verify `types/index.ts` re-exports everything:
  ```typescript
  export * from './common'
  export * from './kanban.types'
  export * from './agents.types'
  export * from './chat.types'
  export * from './autopilot.types'
  export * from './workers.types'
  export * from './ui.types'
  ```
- [ ] Search codebase for `from './types'` imports - all should still work
- [ ] Delete old `types.ts` (now empty, everything moved)
- [ ] Update import sorting rules in ESLint

**Deliverable:** types.ts deleted, all imports work via types/index.ts  
**Risk:** Low (re-exports maintain compatibility)  
**Test:** `npm run build` should succeed, no TS errors

---

### Week 6: App.tsx Refactoring (Part 1)
**Goal:** Extract state management to custom hooks

**Focus:** Backend health & Kanban state

**Tasks:**
- [ ] Create `hooks/useBackendHealth.ts`
  - Move health check, polling logic
  - Move `isBackendConnected` state
  
- [ ] Create `hooks/useKanban.ts`
  - Move `tasks`, `boards`, `activeBoard` state
  - Move `loadBoard`, `moveTask`, `bulkUpdate` logic
  - Move board switching, refresh logic
  
- [ ] Update `App.tsx` to use hooks:
  ```typescript
  const { isConnected } = useBackendHealth()
  const { tasks, boards, activeBoard, moveTask } = useKanban(activeBoard)
  ```

**Deliverable:** App.tsx reduced to ~1000 lines  
**Risk:** Medium (state management is tricky)  
**Test:** Kanban board should work perfectly, drag & drop, bulk actions

---

### Week 7: App.tsx Refactoring (Part 2)
**Goal:** Extract remaining state management

**Focus:** Agents, Autopilot, Chat

**Tasks:**
- [ ] Create `hooks/useAgents.ts`
  - Move `agents`, `squads`, `skills` state
  - Move `loadAgents`, profile switching
  
- [ ] Create `hooks/useAutopilot.ts`
  - Move `autopilots` state
  - Move `triggerJob`, `pauseJob`, CRUD operations
  
- [ ] Create `hooks/useChat.ts`
  - Move chat session state
  - Move streaming logic (or keep in ChatView?)
  
- [ ] Create `hooks/useBulkActions.ts`
  - Move `selectedTaskIds` state
  - Move bulk operation logic
  
- [ ] Create `hooks/useToasts.ts`
  - Move `toasts` state
  - Move `pushToast`, `dismissToast`
  
- [ ] Update `App.tsx` to use all hooks

**Deliverable:** App.tsx reduced to ~150 lines (routing + layout only)  
**Risk:** Medium-High  
**Test:** Full E2E test - all features should work

---

### Week 8: Cleanup & Optimization
**Goal:** Finalize refactoring, optimize performance

**Tasks:**
- [ ] Delete old `api/hermesApi.ts` (now fully delegated)
- [ ] Update components to use direct domain imports where beneficial:
  ```typescript
  // Before
  import { hermesApi } from '@/api'
  
  // After (optional, for tree-shaking)
  import { kanbanApi } from '@/api'
  ```
- [ ] Add lazy loading for heavy modules:
  ```typescript
  const ChatView = React.lazy(() => import('./components/ChatView'))
  const chatApi = await import('@/api/chat')
  ```
- [ ] Performance audit:
  - Bundle size analysis (`npm run build -- --analyze`)
  - Lighthouse score
  - React DevTools Profiler
- [ ] Documentation update:
  - Update README with new architecture
  - Add API client usage guide
  - Add custom hooks guide
- [ ] Celebrate! 🎉

**Deliverable:** Clean, maintainable codebase  
**Risk:** Low (just cleanup)  
**Test:** Production deployment smoke test

---

## 📊 Estimated Effort & Complexity

| Phase | Effort | Risk | Blocking |
|-------|--------|------|----------|
| Week 1: Infrastructure | 8 hours | Low | None |
| Week 2: Pilot (autopilot) | 16 hours | Low | None |
| Week 3-4: Parallel extraction | 40 hours (10h per dev) | Medium | None (parallel) |
| Week 5: Types migration | 8 hours | Low | Week 3-4 |
| Week 6: App.tsx Part 1 | 24 hours | Medium | Week 5 |
| Week 7: App.tsx Part 2 | 24 hours | High | Week 6 |
| Week 8: Cleanup | 16 hours | Low | Week 7 |
| **Total** | **136 hours (~3.5 weeks)** | | |

**Team Parallelization:**
- Week 3-4 can be done by 4 developers in parallel → saves 2 weeks
- **Actual calendar time: ~6 weeks with 4 developers**

---

## ⚠️ Risk Assessment

### High Risk Areas
1. **Chat streaming module** (~600 lines, SSE + WebSocket)
   - Complex state management
   - Real-time updates
   - **Mitigation:** Extract last, test extensively
   
2. **App.tsx state refactoring** (Week 6-7)
   - Many interdependencies
   - **Mitigation:** Incremental extraction, one hook at a time
   
3. **Merge conflicts** (Week 3-4)
   - Multiple devs editing `hermesApi.ts`
   - **Mitigation:** Staggered merges, daily syncs

### Medium Risk Areas
1. **Type imports** (Week 5)
   - 100+ files importing from `types.ts`
   - **Mitigation:** Re-export everything from `types/index.ts`

2. **Backward compatibility**
   - Existing code must keep working
   - **Mitigation:** Delegate pattern, comprehensive testing

### Low Risk Areas
1. **Infrastructure setup** (Week 1)
2. **Autopilot pilot** (Week 2)
3. **Cleanup** (Week 8)

---

## ✅ Success Criteria

### Code Quality
- [ ] No file > 500 lines
- [ ] hermesApi.ts deleted (or < 100 lines as thin facade)
- [ ] App.tsx < 200 lines
- [ ] All TypeScript strict mode passing
- [ ] ESLint/Prettier passing

### Functionality
- [ ] All existing features work unchanged
- [ ] No regression in UI/UX
- [ ] All tests passing (unit + integration)
- [ ] Bundle size not increased (ideally decreased)

### Maintainability
- [ ] Clear domain boundaries
- [ ] Easy to find code (new dev can locate feature in < 1 min)
- [ ] Easy to add new features (new API method = ~10 lines)
- [ ] Reduced merge conflicts (team can work in parallel)

### Performance
- [ ] No slowdown in app load time
- [ ] HMR (Hot Module Reload) faster in dev mode
- [ ] IDE (VSCode) loads files faster

---

## 📚 References & Examples

### Example: kanban/boards.api.ts
```typescript
import { fetchJson, API_BASE } from '../client'
import type { Board } from '@/types/kanban.types'

export async function getBoards(): Promise<Board[]> {
  return fetchJson<Board[]>('/api/plugins/kanban/boards')
}

export async function createBoard(params: {
  name: string
  slug: string
  tenant?: string
}): Promise<Board> {
  return fetchJson<Board>('/api/plugins/kanban/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
}

export async function switchBoard(slug: string): Promise<boolean> {
  const res = await fetchJson('/api/plugins/kanban/boards/active', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug })
  })
  return res.ok
}

// ... other board methods
```

### Example: hooks/useKanban.ts
```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { kanbanApi } from '@/api'
import type { Task, TaskStatus, BoardStats } from '@/types'

export const useKanban = (board?: string) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<BoardStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const loadBoard = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [boardData, statsData] = await Promise.all([
        kanbanApi.getBoard(board),
        kanbanApi.getBoardStats(board)
      ])
      setTasks(extractTasksFromColumns(boardData.columns))
      setStats(statsData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [board])
  
  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    await kanbanApi.updateTaskStatus(taskId, newStatus, board)
    await loadBoard()
  }, [board, loadBoard])
  
  const bulkUpdate = useCallback(async (
    taskIds: string[],
    updates: Partial<Task>
  ) => {
    await kanbanApi.bulkUpdateTasks(taskIds, updates, board)
    await loadBoard()
  }, [board, loadBoard])
  
  useEffect(() => {
    loadBoard()
  }, [loadBoard])
  
  return {
    tasks,
    stats,
    isLoading,
    error,
    loadBoard,
    moveTask,
    bulkUpdate
  }
}
```

### Example: api/index.ts (Facade)
```typescript
// Domain modules
import * as kanbanBoards from './kanban/boards.api'
import * as kanbanTasks from './kanban/tasks.api'
import * as kanbanStats from './kanban/stats.api'
import * as autopilotCron from './autopilot/cron.api'
import * as agentsProfiles from './agents/profiles.api'
import * as chatSessions from './chat/sessions.api'

// Backward compatible facade
export const hermesApi = {
  // Health (keep in index for simplicity)
  checkHealth: async (): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/api/health`)
    return res.ok
  },
  
  // Kanban
  ...kanbanBoards,
  ...kanbanTasks,
  ...kanbanStats,
  
  // Autopilot
  ...autopilotCron,
  
  // Agents
  ...agentsProfiles,
  
  // Chat
  ...chatSessions,
  
  // ... etc
}

// Modern domain exports
export { kanbanApi } from './kanban'
export { chatApi } from './chat'
export { agentsApi } from './agents'
export { workersApi } from './workers'
export { autopilotApi } from './autopilot'
```

---

## 🎓 Team Training

### Before Week 1
- [ ] Share this document with team
- [ ] Architecture review meeting (1 hour)
- [ ] Q&A session
- [ ] Assign domain ownership

### During Migration
- [ ] Daily 15-min standup (sync progress, blockers)
- [ ] Code review pairing (reviewer should understand the domain)
- [ ] Weekly demo (show progress to stakeholders)

### After Migration
- [ ] Retrospective (what went well, what to improve)
- [ ] Update onboarding docs for new developers
- [ ] Knowledge sharing session (patterns learned)

---

## 🔗 Related Documentation

- [ ] API Client Usage Guide (to be written)
- [ ] Custom Hooks Guide (to be written)
- [ ] Contributing Guide (update with new structure)
- [ ] Architecture Decision Records (ADR)

---

## 📝 Notes

### Why Not Redux/Zustand Immediately?
- Custom hooks are simpler for this codebase size
- Can migrate to Zustand later if:
  - State sharing becomes complex
  - Performance issues from prop drilling
  - Need devtools time-travel debugging

### When to Consider State Management Library?
- App.tsx hooks become > 200 lines each
- Need to share state across distant components
- Performance profiling shows re-render issues
- Team size grows > 8 developers

### Alternative Approach: React Query
If server state is the main complexity:
```typescript
const { data: tasks, isLoading } = useQuery(['kanban', board], () => 
  kanbanApi.getBoard(board)
)
```
**Pros:** Cache management, refetching, optimistic updates  
**Cons:** Another dependency, learning curve

---

**Last Updated:** 2026-09-21  
**Author:** Claude (Kiro AI)  
**Review:** Pending team approval
