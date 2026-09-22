# Product Requirements Document (PRD) — Release v0.1.1.2
# Codebase Refactoring & Architecture Improvement

* **Versi Rilis:** `v0.1.1.2`
* **Status:** Draft / Planned
* **Prasyarat:** `v0.1.1` (Autopilot, Skills & Profile Fleet Lifecycle)
* **Kategori:** Technical Debt, Code Quality & Maintainability
* **Estimated Timeline:** 6-8 weeks (parallel work, 4 developers)

---

## 1. Executive Summary & Tujuan

Setelah menyelesaikan v0.1.1, codebase Hermes Agentic Hub telah berkembang signifikan dengan penambahan 11 API methods baru dan berbagai fitur kompleks. Analisis menunjukkan beberapa file kritis sudah melampaui batas maintainability:

**Critical Files:**
- `src/api/hermesApi.ts`: **2,671 lines** 🚨 (Very High Priority)
- `src/App.tsx`: **1,393 lines** ⚠️ (High Priority)  
- `src/types.ts`: **422 lines** ⚠️ (Medium Priority)

**Masalah yang Dihadapi:**
1. **Cognitive Overload:** Developer harus scroll 2,600+ lines untuk menemukan satu API method
2. **Merge Conflicts:** Tim kesulitan bekerja parallel pada file yang sama
3. **Slow IDE Performance:** Editor lag saat editing file besar
4. **Hard to Test:** Monolithic structure sulit di-unit test
5. **Poor Tree-Shaking:** Bundle size tidak optimal karena import monolithic

Rilis **v0.1.1.2** bertujuan melakukan **refactoring incremental** yang aman dengan:
- ✅ **Zero breaking changes** untuk existing code
- ✅ **Backward compatible** migration path
- ✅ **Domain-driven architecture** untuk scalability
- ✅ **Improved developer experience** (DX)

---

## 2. Ruang Lingkup Fitur (Feature Scope)

### 2.1. API Client Refactoring: Domain-Based Split

**Current State:**
```
src/api/hermesApi.ts (2,671 lines)
└── Single monolithic export object with 80+ methods
```

**Target State:**
```
src/api/
├── index.ts                    # Facade + domain exports
├── client.ts                   # Shared HTTP utilities
├── kanban/                     # ~750 lines total
│   ├── index.ts
│   ├── boards.api.ts          # Board CRUD, switch, export/import
│   ├── tasks.api.ts           # Task CRUD, status, bulk ops
│   ├── stats.api.ts           # Board stats, analytics
│   └── config.api.ts          # Kanban config
├── tasks/                      # ~510 lines total
│   ├── comments.api.ts
│   ├── links.api.ts
│   ├── attachments.api.ts
│   ├── estimation.api.ts
│   └── execution.api.ts
├── agents/                     # ~600 lines total
│   ├── profiles.api.ts
│   ├── skills.api.ts
│   └── squads.api.ts
├── autopilot/                  # ~200 lines total
│   └── cron.api.ts
├── chat/                       # ~850 lines total
│   ├── sessions.api.ts
│   ├── messages.api.ts
│   └── streaming.api.ts
├── workers/                    # ~180 lines total
│   ├── active.api.ts
│   └── processes.api.ts
├── home-channels/              # ~100 lines total
│   └── channels.api.ts
└── orchestration/              # ~80 lines total
    └── settings.api.ts
```

**Key Principles:**
1. **Split by Domain/Feature** - NOT by HTTP method or resource
2. **Optimal File Size** - Target 50-400 lines per file
3. **Clear Boundaries** - Easy to locate: "Need kanban stuff? → kanban/"
4. **Parallel Development** - Multiple devs can work simultaneously

### 2.2. Types Refactoring: Domain-Based Organization

**Current State:**
```
src/types.ts (422 lines)
└── All type definitions in single file
```

**Target State:**
```
src/types/
├── index.ts                   # Re-export all (backward compatible)
├── common.ts                  # Shared types (Priority, Status)
├── kanban.types.ts           # Board, Task, Column, BoardStats
├── agents.types.ts           # AIAgent, Squad, Skill
├── chat.types.ts             # ChatSession, ChatMessage
├── autopilot.types.ts        # AutopilotJob
├── workers.types.ts          # WorkerProcessInfo, ActiveWorker
└── ui.types.ts               # ViewTab, UI-specific types
```

### 2.3. App.tsx Refactoring: Custom Hooks Pattern

**Current State:**
```
src/App.tsx (1,393 lines)
└── Monolithic component with 20+ useState, complex logic
```

**Target State:**
```
src/
├── App.tsx                    # ~150 lines - Layout, routing, providers only
├── hooks/
│   ├── useKanban.ts          # Board state, task operations
│   ├── useAgents.ts          # Agents, squads, skills state
│   ├── useAutopilot.ts       # Cron jobs state
│   ├── useChat.ts            # Chat sessions, streaming
│   ├── useBackendHealth.ts   # Connection status
│   ├── useBulkActions.ts     # Multi-select, bulk ops
│   └── useToasts.ts          # Toast notifications
└── providers/                 # (Optional) Context providers
    ├── KanbanProvider.tsx
    ├── AgentsProvider.tsx
    └── ChatProvider.tsx
```

**Pattern:**
- Extract state logic ke custom hooks
- Keep App.tsx focused on layout & routing
- Use Context API hanya untuk truly global state (theme, auth)
- Local state management via hooks untuk feature state

### 2.4. Export Strategy: Backward Compatible Facade

**Support Both Patterns:**

#### Old Code (Backward Compatible)
```typescript
import { hermesApi } from '@/api'
await hermesApi.getBoard()        // ✅ Still works
await hermesApi.getCronJobs()     // ✅ Still works
```

#### New Code (Modern, Tree-Shakeable)
```typescript
import { kanbanApi } from '@/api'
await kanbanApi.getBoard()        // ✅ Better tree-shaking

// Or even more specific
import { getBoard } from '@/api/kanban'
await getBoard()                  // ✅ Optimal imports
```

---

## 3. Arsitektur & Migration Strategy

### 3.1. Incremental Migration (8-Week Plan)

**Phase 1: Pilot (Week 1-2)** 🧪
- Extract `autopilot/` domain (smallest, lowest risk)
- Setup facade pattern in `api/index.ts`
- Prove zero breaking changes
- Document patterns for team

**Phase 2: Parallel Extraction (Week 3-4)** 🚀
- Team 1: `kanban/` domain
- Team 2: `agents/` domain  
- Team 3: `chat/` domain
- Team 4: `workers/` + `home-channels/`

**Phase 3: Types Migration (Week 5)** 📦
- Split `types.ts` by domain
- Maintain re-export for backward compatibility
- Update imports progressively

**Phase 4: App.tsx Refactoring (Week 6-7)** 🎯
- Extract `useKanban`, `useAgents`, `useChat` hooks
- Extract `useToasts`, `useBulkActions` utility hooks
- Slim down App.tsx to ~150 lines

**Phase 5: Cleanup & Optimization (Week 8)** ✨
- Remove old `hermesApi.ts` (keep facade only)
- Update all imports to modern pattern
- Bundle size analysis
- Documentation update

### 3.2. Risk Mitigation

**High Risk:**
- ❌ Breaking existing imports
- **Mitigation:** Facade pattern maintains old `hermesApi` export

**Medium Risk:**
- ⚠️ Type inference breaks during migration
- **Mitigation:** Keep `types/index.ts` with full re-exports

**Low Risk:**
- ✅ File organization (can rollback easily)
- ✅ Hook extraction (isolated changes)

### 3.3. Testing Strategy

**Each Phase Must Pass:**
1. ✅ `npm run build` - No compilation errors
2. ✅ Existing unit tests still pass
3. ✅ Manual smoke testing on UI
4. ✅ Bundle size ≤ current size (or smaller)

---

## 4. Success Metrics

### 4.1. Code Metrics (Quantitative)

| Metric | Before | Target | Improvement |
|--------|--------|--------|-------------|
| Largest file size | 2,671 lines | < 600 lines | 78% reduction |
| Average file size | 450 lines | < 200 lines | 55% reduction |
| Files > 500 lines | 3 files | 0 files | 100% elimination |
| Bundle size (main) | 1.34 MB | ≤ 1.34 MB | No regression |
| Build time | 46.22s | ≤ 45s | Maintain/improve |

### 4.2. Developer Experience (Qualitative)

- [ ] **Discoverability:** Developer dapat menemukan API method dalam < 10 detik
- [ ] **IDE Performance:** No lag saat editing file
- [ ] **Parallel Work:** 4 devs dapat work simultaneously tanpa merge conflicts
- [ ] **Onboarding:** New developer dapat understand structure dalam < 30 menit
- [ ] **Code Review:** PR diff readable (< 500 lines per PR)

### 4.3. Technical Quality

- [ ] **Type Safety:** Zero `any` types, full type inference
- [ ] **Tree-Shaking:** Unused code eliminated in production bundle
- [ ] **Testability:** Each module dapat di-unit test independently
- [ ] **Documentation:** All modules have JSDoc comments

---

## 5. Non-Goals (Out of Scope)

❌ **NOT in v0.1.1.2:**
- State management library (Redux/Zustand) - Use custom hooks first
- Backend API changes - Pure frontend refactoring
- Component refactoring - Focus on API client & state management
- Performance optimization - Separate initiative
- UI/UX changes - No visual changes to user

---

## 6. Dependencies & Prerequisites

**Required:**
- ✅ v0.1.1 completed & merged to main
- ✅ All existing tests passing
- ✅ Clean git working tree

**Team Requirements:**
- 4 developers (can work in parallel)
- 1 tech lead (review & coordination)
- Estimated 40-50 hours per developer

---

## 7. Rollback Plan

**If Migration Fails:**

1. **Week 1-2 (Pilot):** Simple `git revert` - only 1 domain affected
2. **Week 3-4 (Parallel):** Revert specific domain branches
3. **Week 5+:** Feature flags untuk gradually enable new structure

**Rollback Triggers:**
- Build time increases > 20%
- Bundle size increases > 10%
- Critical bugs in production
- Team velocity drops > 30%

---

## 8. Documentation Deliverables

**Must Create:**
1. `docs/architecture/API_CLIENT_GUIDE.md` - How to use new API structure
2. `docs/architecture/HOOKS_GUIDE.md` - Custom hooks patterns
3. `docs/architecture/MIGRATION_GUIDE.md` - For contributors
4. Updated `CONTRIBUTING.md` - New file organization rules

---

## 9. Acceptance Criteria

### Must Have (Critical)
- [ ] All existing functionality works (zero breaking changes)
- [ ] `hermesApi` facade still exports all methods
- [ ] Build passes without errors
- [ ] All existing tests pass
- [ ] No bundle size regression

### Should Have (Important)
- [ ] New imports use domain-based pattern (`kanbanApi`, `chatApi`)
- [ ] Custom hooks extracted from App.tsx
- [ ] Types split by domain
- [ ] Documentation updated

### Nice to Have (Optional)
- [ ] Bundle size reduced via tree-shaking
- [ ] Build time improved
- [ ] Unit tests for new hooks
- [ ] Storybook stories for components

---

## 10. Timeline & Milestones

```
Week 1-2:  ████████ Pilot (Autopilot domain)
Week 3-4:  ████████████████ Parallel Extraction (4 teams)
Week 5:    ████████ Types Migration
Week 6-7:  ████████████████ App.tsx Refactoring
Week 8:    ████████ Cleanup & Documentation
           └─────────────────────────────────┘
           6-8 weeks total
```

**Checkpoints:**
- **End of Week 2:** Pilot successful? Go/No-Go decision
- **End of Week 4:** All domains extracted? Progress review
- **End of Week 6:** App.tsx refactored? Final push
- **End of Week 8:** Release v0.1.1.2

---

## 11. Related Documents

- [REFACTORING_PLAN.md](/REFACTORING_PLAN.md) - Detailed technical plan
- [TASK.md](./TASK.md) - Actionable task breakdown
- [0.1.1/COMPLETION_REPORT.md](../0.1.1/COMPLETION_REPORT.md) - Previous release

---

**Prepared by:** Backend Specialist Agent + Kiro AI Assistant  
**Date:** 2026-09-21  
**Status:** Draft - Awaiting approval
