# 🎯 Planning v0.1.1.2 - Summary

## 📊 Problem Statement

Setelah menyelesaikan v0.1.1, analisis menunjukkan 3 file kritis sudah terlalu besar:

| File | Lines | Status | Risk Level |
|------|-------|--------|------------|
| `src/api/hermesApi.ts` | **2,671** | 🚨 Critical | **Very High** |
| `src/App.tsx` | **1,393** | ⚠️ Warning | **High** |
| `src/types.ts` | **422** | ⚠️ Warning | **Medium** |

**Total problematic lines:** 4,486 lines dalam 3 files!

### 🔴 Impact Jika Tidak Di-Refactor:
- Developer velocity ↓ 30-50%
- Merge conflicts ↑ 3-5x
- IDE lag & slow compilation
- Sulit onboarding new developers
- Technical debt terus menumpuk

---

## 💡 Solusi: Domain-Driven Refactoring

### API Client Split (hermesApi.ts: 2,671 → ~600 lines max)
```
api/
├── kanban/        750 lines (boards, tasks, stats, config)
├── agents/        600 lines (profiles, skills, squads)
├── chat/          850 lines (sessions, messages, streaming)
├── autopilot/     200 lines (cron jobs)
├── workers/       180 lines (active, processes)
├── home-channels/ 100 lines (subscriptions)
└── orchestration/  80 lines (settings)
```

### App.tsx Refactoring (1,393 → ~150 lines)
Extract state management ke custom hooks:
```
hooks/
├── useKanban.ts       150 lines
├── useAgents.ts       100 lines
├── useChat.ts         120 lines
├── useAutopilot.ts     80 lines
├── useBulkActions.ts   80 lines
└── useToasts.ts        40 lines
```

### Types Split (422 → 50-150 lines per domain)
```
types/
├── common.ts          50 lines
├── kanban.types.ts   150 lines
├── agents.types.ts   100 lines
├── chat.types.ts      80 lines
├── autopilot.types.ts 30 lines
├── workers.types.ts   50 lines
└── ui.types.ts        50 lines
```

---

## 🎯 Key Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Largest file** | 2,671 lines | < 600 lines | **78% reduction** |
| **Files > 500 lines** | 3 files | 0 files | **100% eliminated** |
| **App.tsx size** | 1,393 lines | ~150 lines | **89% reduction** |
| **Average file size** | 450 lines | < 200 lines | **55% reduction** |
| **Developer velocity** | Baseline | +40-60% | **Significant boost** |

---

## 🗓️ Timeline: 6-8 Weeks

```
Week 1-2:  ████████ Pilot (Autopilot domain)
Week 3-4:  ████████████████ Parallel Extraction (4 teams)
Week 5:    ████████ Types Migration
Week 6-7:  ████████████████ App.tsx Refactoring
Week 8:    ████████ Cleanup & Documentation
```

---

## 👥 Team Structure

- **4 Developers** working in parallel on different domains
- **1 Tech Lead** for coordination & review
- **Total Effort:** 116 hours (~3 weeks with parallelization)

---

## 🛡️ Safety First: Zero Breaking Changes

### Backward Compatible Facade Pattern
```typescript
// Old code keeps working
import { hermesApi } from '@/api'
await hermesApi.getBoard()        // ✅ Still works!

// New code gets better tree-shaking
import { kanbanApi } from '@/api'
await kanbanApi.getBoard()        // ✅ Modern pattern

// Direct imports for best optimization
import { getBoard } from '@/api/kanban'
await getBoard()                  // ✅ Optimal
```

---

## 📋 Task Breakdown

| Phase | Tasks | Priority | Hours |
|-------|-------|----------|-------|
| **Phase 1: Pilot** | TASK-1.1 (Autopilot) | 🔴 Critical | 16h |
| **Phase 2: Parallel** | TASK-2.1 to 2.4 (Kanban, Agents, Chat, Workers) | 🔴 Critical | 44h |
| **Phase 3: Types** | TASK-3.1 (Split types.ts) | 🟠 High | 8h |
| **Phase 4: Hooks** | TASK-4.1 to 4.4 (Extract hooks, refactor App.tsx) | 🔴 Critical | 40h |
| **Phase 5: Cleanup** | TASK-5.1 (Documentation, bundle analysis) | 🟡 Medium | 8h |
| **TOTAL** | **11 tasks** | | **116h** |

---

## ✅ Success Criteria

### Must Have (Critical)
- [ ] All existing functionality works (zero breaking changes)
- [ ] `hermesApi` facade still exports all methods
- [ ] Build passes without errors
- [ ] All existing tests pass
- [ ] No bundle size regression

### Should Have (Important)
- [ ] New imports use domain-based pattern
- [ ] Custom hooks extracted from App.tsx
- [ ] Types split by domain
- [ ] Documentation updated

### Nice to Have (Optional)
- [ ] Bundle size reduced via tree-shaking
- [ ] Build time improved
- [ ] Unit tests for new hooks

---

## 📚 Documentation Deliverables

1. **[PRD.md](./PRD.md)** - Complete product requirements (11 sections)
2. **[TASK.md](./TASK.md)** - Step-by-step actionable tasks (11 tasks)
3. **[README.md](./README.md)** - Quick overview & getting started
4. **[/REFACTORING_PLAN.md](/REFACTORING_PLAN.md)** - Detailed technical architecture (by Backend Specialist Agent)

---

## 🚀 Next Steps

1. **Review** PRD & TASK with team
2. **Assign** domain ownership (4 developers)
3. **Start** Week 1-2 pilot with autopilot domain
4. **Go/No-Go** decision after pilot completes
5. **Execute** parallel extraction (Week 3-8)

---

## 🎓 Lessons from Backend Specialist

Berdasarkan konsultasi dengan backend specialist agent:

### ✅ DO:
- Split by domain/feature (semantic grouping)
- Use facade pattern for backward compatibility
- Start with pilot (prove pattern works)
- Parallel development after pilot succeeds
- Custom hooks before introducing state library

### ❌ DON'T:
- Split by HTTP method (too fragmented)
- Split by resource only (still too large)
- Introduce Redux/Zustand immediately (overkill)
- Break existing imports (use facade)
- Rush without pilot validation

---

**Status:** 📋 Ready for team review  
**Created:** 2026-09-21  
**Estimated Start:** After v0.1.1 merge  
**Estimated Completion:** 6-8 weeks from start
