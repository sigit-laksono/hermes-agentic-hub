/**
 * Kanban Tasks API — Hermes Agentic Hub
 * Task CRUD, status updates, bulk operations, execution, and utilities.
 */

import { API_BASE } from '../client'
import { TaskStatus, TaskDetailsResponse } from '../../types'

// Helper to get canonical Hermes task ID (e.g. "t_xxxx")
export function getCanonicalTaskId(taskOrId: string | { id: string; rawId?: string }): string {
  if (typeof taskOrId === 'string') {
    return taskOrId
  }
  return taskOrId.rawId || taskOrId.id
}

// CreateTaskBody has no `status` field: the backend decides the landing status
// ('ready', or 'todo' when a parent is still open). `triage: true` is the one way a
// caller can steer it, forcing the task into the 'triage' column instead.
export async function createTask(params: {
  title: string
  body?: string
  assignee?: string
  priority?: number
  triage?: boolean
  board?: string
}): Promise<any> {
  const { board, ...taskBody } = params
  // The backend takes `board` as a query param; the rest is the JSON body.
  const query = board ? `?board=${encodeURIComponent(board)}` : ''
  const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskBody)
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as any))
    const detail =
      typeof body?.detail === 'string'
        ? body.detail
        : body?.detail
        ? JSON.stringify(body.detail)
        : ''
    throw new Error(detail || `Failed to create task: ${res.statusText}`)
  }
  return res.json()
}

// Add a comment / feedback note to a task's thread.
export async function addTaskComment(taskId: string, body: string, author = 'dashboard'): Promise<any> {
  const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, author })
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({} as any))
    const detail =
      typeof errBody?.detail === 'string'
        ? errBody.detail
        : errBody?.detail
        ? JSON.stringify(errBody.detail)
        : ''
    throw new Error(detail || `Failed to add comment: ${res.statusText}`)
  }
  return res.json()
}

export async function updateTask(
  taskId: string,
  payload: { status?: string; assignee?: string; priority?: number; title?: string; body?: string },
  board?: string
): Promise<any> {
  const query = board ? `?board=${encodeURIComponent(board)}` : ''
  const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}${query}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    // The backend puts the actionable reason in `detail` — a 409 names the blocking
    // parent(s) by title and id, and a 400 explains a rejected status verb. Throwing
    // only res.statusText ("Conflict") discarded all of it.
    const body = await res.json().catch(() => ({} as any))
    const detail =
      typeof body?.detail === 'string'
        ? body.detail
        : body?.detail
        ? JSON.stringify(body.detail)
        : ''
    throw new Error(detail || `Failed to update task: ${res.statusText}`)
  }
  return res.json()
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, board?: string): Promise<any> {
  // Status names now match backend 1:1 — no mapping needed.
  const targetStatus = status
  return updateTask(taskId, { status: targetStatus }, board)
}

// Bulk task update (Fase 2: TASK-2.1)
//
// Backend contract (BulkTaskBody): the id list field is `ids`, NOT `task_ids` — the wrong
// name yields a 422 and silently pushed every call into the fallback path below.
// Response is { results: [{ id, ok, error? }] }, which we normalize to
// { task_id, success, error? } so callers have one shape to read.
//
// `archive` means archive (status -> "archived", reversible), never hard delete.
export async function bulkUpdateTasks(
  taskIds: string[],
  payload: {
    status?: TaskStatus
    assignee?: string
    priority?: number
    archive?: boolean
  },
  board?: string
): Promise<{ success: boolean; updated_count?: number; results?: { task_id: string; success: boolean; error?: string }[] }> {
  const normalize = (
    results: { task_id: string; success: boolean; error?: string }[]
  ) => {
    const updatedCount = results.filter(r => r.success).length
    return { success: updatedCount > 0, updated_count: updatedCount, results }
  }

  const query = board ? `?board=${encodeURIComponent(board)}` : ''
  try {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/bulk${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: taskIds,
        ...payload
      })
    })

    if (res.ok) {
      const data = await res.json()
      // Backend per-task entries are { id, ok, error? }.
      const results = (Array.isArray(data?.results) ? data.results : []).map((r: any) => ({
        task_id: r.id || r.task_id || '',
        success: r.ok !== undefined ? Boolean(r.ok) : Boolean(r.success),
        error: r.error
      }))
      return normalize(results)
    }

    // A 4xx here is a contract/permission problem, not a dead endpoint: report it
    // rather than silently retrying task-by-task with different semantics.
    if (res.status !== 404) {
      const err = await res.json().catch(() => ({} as any))
      throw new Error(err.detail || `Bulk update failed: ${res.statusText}`)
    }
    console.warn('POST /tasks/bulk not available (404), falling back to individual updates.')
  } catch (err: any) {
    if (err instanceof TypeError) {
      // Network/transport failure — fall through to the sequential path.
      console.warn('POST /tasks/bulk unreachable, falling back to individual updates:', err)
    } else {
      throw err
    }
  }

  // Fallback: apply the same patch one task at a time via PATCH /tasks/{id}.
  // Archive goes through status "archived" (handled by _patch_status -> archive_task),
  // which is reversible — deleteTask() here would be an unrecoverable hard delete.
  const results: { task_id: string; success: boolean; error?: string }[] = []
  for (const id of taskIds) {
    try {
      await updateTask(
        id,
        payload.archive
          ? { status: 'archived' }
          : {
              status: payload.status,
              assignee: payload.assignee,
              priority: payload.priority
            },
        board
      )
      results.push({ task_id: id, success: true })
    } catch (err: any) {
      results.push({ task_id: id, success: false, error: err?.message || 'Update failed' })
    }
  }
  return normalize(results)
}

// 1d. Safe Reassign Task with Reclaim Support (Fase 2: TASK-2.4)
//
// The backend body is ReassignBody { profile, reclaim_first, reason }. Every field is
// optional there, so sending the wrong key name does NOT fail loudly — it resolves to
// profile=None, which the backend treats as "unassign". Keep this key as `profile`.
export async function reassignTask(
  taskId: string,
  profile: string,
  reclaimFirst: boolean = false,
  reason?: string,
  board?: string
): Promise<any> {
  const canonicalId = getCanonicalTaskId(taskId)

  // Guard against an accidental unassign: this method only ever reassigns.
  if (!profile || !profile.trim()) {
    throw new Error('Cannot reassign: no target profile provided')
  }

  const query = board ? `?board=${encodeURIComponent(board)}` : ''
  const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${canonicalId}/reassign${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile: profile.trim(),
      reclaim_first: reclaimFirst,
      reason
    })
  })

  if (res.ok) return res.json()

  // Surface the backend's message instead of retrying via PATCH — a 409 here means the
  // task is still running and needs reclaim_first, and PATCH /tasks/{id} would hit the
  // same guard in assign_task() and fail the same way.
  const err = await res.json().catch(() => ({} as any))
  throw new Error(err.detail || `Failed to reassign task: ${res.statusText}`)
}

// Trigger immediate execution of a specific task with Hermes Agent
export async function runTask(taskId: string, board?: string, assignee?: string): Promise<{ ok: boolean; status?: string; is_spawned?: boolean; message?: string }> {
  try {
    const params = new URLSearchParams()
    if (board) params.set('board', board)
    if (assignee) params.set('assignee', assignee)
    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}/run${query}`, {
      method: 'POST'
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, message: err.detail || res.statusText }
    }
    return res.json()
  } catch (err: any) {
    return { ok: false, message: err.message || 'Failed to dispatch agent' }
  }
}

// Trigger a full dispatch pass across the board
export async function dispatch(board?: string): Promise<any> {
  try {
    const query = board ? `?board=${encodeURIComponent(board)}` : ''
    const res = await fetch(`${API_BASE}/api/plugins/kanban/dispatch${query}`, {
      method: 'POST'
    })
    return res.ok ? res.json() : null
  } catch {
    return null
  }
}

// Get live worker output / terminal log for a task
export async function getTaskLog(taskId: string, board?: string): Promise<{ exists: boolean; content: string; size_bytes: number }> {
  try {
    const query = board ? `?board=${encodeURIComponent(board)}` : ''
    const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}/log${query}`)
    if (!res.ok) return { exists: false, content: '', size_bytes: 0 }
    return res.json()
  } catch {
    return { exists: false, content: '', size_bytes: 0 }
  }
}

// Delete a task permanently
export async function deleteTask(taskId: string, board?: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const query = board ? `?board=${encodeURIComponent(board)}` : ''
    const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}${query}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, message: err.detail || res.statusText }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, message: err.message || 'Failed to delete task' }
  }
}

// Get comprehensive task details (comments, runs, events, attachments)
export async function getTaskDetails(taskId: string, board?: string): Promise<TaskDetailsResponse | null> {
  try {
    const query = board ? `?board=${encodeURIComponent(board)}` : ''
    const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}${query}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
