# Phase 2 Progress Report — Domain Extraction (WIP)

**Date:** 2026-09-21  
**Status:** Partial completion — 3/6 domains extracted  
**Context:** Phase 2 parallel extraction in progress

---

## ✅ Completed Domains (Ready for integration)

### 1. Agents/Profiles Domain (460 lines)
**Files:**
- `src/api/agents/profiles.api.ts` (278 lines) — 13 methods
- `src/api/agents/skills.api.ts` (134 lines) — 7 methods
- `src/api/agents/index.ts` (48 lines) — barrel export + agentsApi namespace

**Extracted from:** hermesApi.ts Section 2 (lines 811-1106) + Section 4 (lines 1119-1178)

**Methods:**
- Profiles: getProfiles, getProfileSoul, updateProfileSoul, updateProfileDescription, getModelOptions, updateProfileModel, createProfile, deleteProfile, exportProfile, importProfile, getActiveProfile, setActiveProfile, autoDescribeProfile
- Skills: getProfileSkills, toggleProfileSkill, getSkillContent, toggleSkill, getSkills, createSkill, updateSkillContent

### 2. Boards Domain (184 lines)
**Files:**
- `src/api/boards/boards.api.ts` (184 lines) — 8 methods
- `src/api/boards/index.ts` — barrel export + boardsApi namespace

**Extracted from:** hermesApi.ts Section 5 (lines 1180-1333)

**Methods:** getBoards, createBoard, updateBoard, switchBoard, deleteBoard, exportBoardArchive, exportBoardJson, importBoardJson

### 3. Orchestration Domain (175 lines)
**Files:**
- `src/api/orchestration/orchestration.api.ts` (175 lines) — 5 methods
- `src/api/orchestration/index.ts` — barrel export + orchestrationApi namespace

**Extracted from:** hermesApi.ts Section 6 (lines 1335-1484)

**Methods:** getOrchestrationSettings, updateOrchestration, getOrchestration, getSquads, connectEvents

**Note:** getSquads() has cross-domain dependency — imports getProfiles from agents/profiles.api

---

## ⏳ In Progress

### 4. Kanban Domain (~715 lines estimated)
**Files partially created:**
- `src/api/kanban/board.api.ts` (85 lines) — ✅ getBoard, getAssignees, getBoardStats, getKanbanConfig
- `src/api/kanban/tasks.api.ts` (301 lines) — ✅ Partial (createTask, updateTask, etc.)

**Still needed:**
- `src/api/kanban/ai-actions.api.ts` — specifyTask, decomposeTask, estimateTask
- `src/api/kanban/links.api.ts` — getTaskLinks, createTaskLink, deleteTaskLink
- `src/api/kanban/workers.api.ts` — getActiveWorkers, inspectRun, terminateRun, reclaimTask
- `src/api/kanban/attachments.api.ts` — task attachments CRUD
- `src/api/kanban/channels.api.ts` — home channels subscription
- `src/api/kanban/index.ts` — barrel export

**Challenge:** Section has `this.` cross-references (getCanonicalTaskId used by many methods)

---

## ❌ Not Started

### 5. Chat Domain (~1057 lines)
**Agent failed:** Input too long error

**Files partially created:**
- `src/api/chat/sessions.api.ts` (partial) — getSessions extracted

**Still needed:**
- Complete sessions.api.ts
- `src/api/chat/streaming.api.ts` — SSE/WebSocket (largest, most complex)
- `src/api/chat/index.ts` — barrel export
- Move ChatSocketHandlers and ChatSocketController interfaces

**Challenge:** Largest section with complex streaming logic and `this.` references

---

## 📊 Overall Progress

| Domain | Lines | Files | Status |
|--------|-------|-------|--------|
| Autopilot (Phase 1) | 138 | 3 | ✅ Complete & integrated |
| Agents/Profiles | 460 | 3 | ✅ Complete, pending integration |
| Boards | 184 | 2 | ✅ Complete, pending integration |
| Orchestration | 175 | 2 | ✅ Complete, pending integration |
| Kanban | ~715 | 2/8 | ⏳ In progress (26% done) |
| Chat | ~1057 | 1/3 | ❌ Not started (agent failed) |
| **Total** | **~2729** | **13/21** | **52% complete** |

---

## 🚀 Next Steps

### Option A: Incremental integration (Recommended)
1. Integrate agents + boards + orchestration domains into hermesApi.ts
2. Verify build & tests
3. Commit "Phase 2a: Agents, Boards, Orchestration domains"
4. Continue with kanban in Phase 2b
5. Handle chat in Phase 2c

### Option B: Complete all extractions first
1. Finish kanban domain (6 more files)
2. Extract chat domain manually
3. Integrate all at once
4. Single big commit

**Recommendation:** Option A for safer, incremental progress with easier rollback.

---

## 🔍 Technical Notes

**Cross-domain dependencies discovered:**
- `orchestration.api.ts` → `agents/profiles.api.ts` (getSquads imports getProfiles)
- `kanban/*.api.ts` → internal getCanonicalTaskId utility (resolved via export from tasks.api.ts)

**TypeScript status:** ✅ Zero errors with current extracted files

**Build status:** Not tested yet (hermesApi.ts not yet delegating to new modules)

---

**Created by:** Kiro AI + Fork Agents (parallel extraction)  
**Session time:** ~25 minutes  
**Context used:** 137K/200K tokens
