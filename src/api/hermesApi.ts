/// <reference types="vite/client" />
/**
 * Hermes Agent Live API Client
 * Communicates with the local Hermes harness bridge (http://127.0.0.1:9120)
 */

import {
  TaskStatus,
  AIAgent,
  AutopilotJob,
  Skill,
  Squad,
  TaskAttachment,
  WorkerProcessInfo,
  ActiveWorker,
  TaskDetailsResponse,
  TaskEstimateResult,
  TaskLinksInfo,
  ChatSession,
  ChatMessage,
  ToolCall,
  ChatConnectionState,
  Board,
  OrchestrationSettings,
  ModelOptionsResponse,
  SkillContent,
  CreateProfilePayload,
  BoardStats,
  HomeChannel,
  ChatMeteringData,
  PendingApproval,
  PendingClarify
} from '../types'

export interface ChatSocketHandlers {
  onReady?: () => void
  onToken?: (token: string) => void
  onThinking?: (thinking: string) => void
  onToolStart?: (tool: ToolCall) => void
  onToolEnd?: (tool: ToolCall) => void
  onApproval?: (approval: PendingApproval) => void
  onClarify?: (clarify: PendingClarify) => void
  onMetering?: (metering: ChatMeteringData) => void
  onComplete?: (message: { text: string; reasoning?: string; usage?: any }) => void
  onError?: (error: string) => void
  onTitleChange?: (title: string) => void
  onStatusChange?: (status: ChatConnectionState) => void
}

export interface ChatSocketController {
  sendMessage: (
    text: string,
    attachments?: Array<{ name: string; dataUrl?: string; isImage?: boolean; textContent?: string }>
  ) => void | Promise<void>
  interrupt: () => void | Promise<void>
  close: () => void
  getStreamId?: () => string | null
  transport?: 'sse' | 'ws'
  respondApproval?: (
    approvalId: string,
    choice: 'once' | 'session' | 'always' | 'deny' | 'allow',
    yolo?: boolean
  ) => void | Promise<any>
  respondClarify?: (clarifyId: string, response: string) => void | Promise<any>
}

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_HERMES_API_URL) ||
  (typeof process !== 'undefined' && (process.env?.VITE_HERMES_API_URL || process.env?.HERMES_API_URL)) ||
  ''

// "45s" / "12m" / "3h 20m" — used for the oldest-ready age badge (stuck-dispatcher signal).
function formatAge(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s'
  if (seconds < 60) return `${Math.floor(seconds)}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
}

export const hermesApi = {
  // Check health
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/health`)
      return res.ok
    } catch {
      return false
    }
  },

  // 1. Kanban Board & Tasks
  //
  // `include_archived` defaults to false server-side, and the backend only emits an
  // "archived" column when it is true — so the flag has to be sent for the Archived
  // column to ever have content.
  // `tenant` is a per-task filter (tasks.tenant), a different axis from `board` — which
  // selects the board itself. They are not interchangeable.
  async getBoard(
    board?: string,
    includeArchived = false,
    tenant?: string
  ): Promise<{ columns: { name: string; tasks: any[] }[]; assignees: any[] }> {
    const params = new URLSearchParams()
    if (board) params.set('board', board)
    if (includeArchived) params.set('include_archived', 'true')
    if (tenant) params.set('tenant', tenant)
    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${API_BASE}/api/plugins/kanban/board${query}`)
    if (!res.ok) throw new Error(`Failed to fetch board: ${res.statusText}`)
    return res.json()
  },

  // Get known assignees (active profiles + historical assignees used on board)
  async getAssignees(board?: string): Promise<string[]> {
    try {
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/assignees${query}`)
      if (!res.ok) return []
      const data = await res.json()
      const rawList = Array.isArray(data) ? data : data.assignees || []
      return rawList
        .map((item: any) => (typeof item === 'string' ? item : item?.name))
        .filter((name: any): name is string => typeof name === 'string' && name.length > 0)
    } catch {
      return []
    }
  },

  // 1c. Board Stats Dashboard (Fase 2: TASK-2.3)
  // GET /stats returns snake_case:
  //   { by_status, by_assignee, oldest_ready_age_seconds, now }
  // Returning that raw left every camelCase field on BoardStats undefined, so the UI
  // silently fell back to a hardcoded "5m". Map it here instead.
  // Note: oldest_ready_age_seconds is null when nothing is in 'ready'.
  async getBoardStats(board?: string): Promise<BoardStats> {
    const query = board ? `?board=${encodeURIComponent(board)}` : ''
    const res = await fetch(`${API_BASE}/api/plugins/kanban/stats${query}`)
    if (!res.ok) throw new Error(`Failed to fetch board stats: ${res.statusText}`)
    const raw = await res.json()

    const byStatus: Record<string, number> = raw?.by_status || {}
    const total = Object.values(byStatus).reduce<number>(
      (sum, n) => sum + (typeof n === 'number' ? n : 0),
      0
    )
    const ageSeconds =
      typeof raw?.oldest_ready_age_seconds === 'number' ? raw.oldest_ready_age_seconds : undefined

    return {
      total,
      byStatus,
      byAssignee: raw?.by_assignee || undefined,
      oldestReadyAgeSeconds: ageSeconds,
      oldestReadyAgeFormatted: ageSeconds !== undefined ? formatAge(ageSeconds) : undefined
    }
  },

  // 1e. Kanban Config Integration (Fase 2: TASK-2.5)
  async getKanbanConfig(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/config`)
      if (!res.ok) return {}
      return await res.json()
    } catch {
      return {}
    }
  },

  // 1f. Home Channel Notifications (Fase 2: TASK-2.6)
  //
  // GET /home-channels returns { home_channels: [{ platform, chat_id, thread_id, name,
  // subscribed }] } — the list key is `home_channels` (not `channels`) and the label field
  // is `name`. Only platforms that actually have a home channel configured are listed, so
  // an empty array means "nothing configured", not "request failed": inventing a default
  // Telegram/WhatsApp/Discord/Slack list advertised platforms that cannot be subscribed to.
  async getHomeChannels(taskId?: string, board?: string): Promise<HomeChannel[]> {
    const params = new URLSearchParams()
    if (taskId) params.append('task_id', this.getCanonicalTaskId(taskId))
    if (board) params.append('board', board)
    const queryString = params.toString() ? `?${params.toString()}` : ''

    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/home-channels${queryString}`)
      if (!res.ok) return []
      const data = await res.json()
      const list = Array.isArray(data) ? data : data?.home_channels || []
      return list.map((c: any) => ({
        platform: String(c?.platform || ''),
        label: c?.name || c?.label || String(c?.platform || ''),
        // Listed at all => a home channel is configured for this platform.
        enabled: true,
        subscribed: Boolean(c?.subscribed)
      })).filter((c: HomeChannel) => c.platform)
    } catch (err) {
      console.warn('Failed to fetch home channels:', err)
      return []
    }
  },

  // Both toggles previously ended with `return { success: true }` even on a 404 ("No home
  // channel configured for platform X"), so the switch flipped on while nothing was
  // subscribed. Report the real outcome and let the caller revert.
  async subscribeHomeChannel(
    taskId: string,
    platform: string,
    board?: string
  ): Promise<{ success: boolean; message?: string }> {
    return this.toggleHomeChannel(taskId, platform, 'POST', board)
  },

  async unsubscribeHomeChannel(
    taskId: string,
    platform: string,
    board?: string
  ): Promise<{ success: boolean; message?: string }> {
    return this.toggleHomeChannel(taskId, platform, 'DELETE', board)
  },

  async toggleHomeChannel(
    taskId: string,
    platform: string,
    method: 'POST' | 'DELETE',
    board?: string
  ): Promise<{ success: boolean; message?: string }> {
    const canonicalId = this.getCanonicalTaskId(taskId)
    const query = board ? `?board=${encodeURIComponent(board)}` : ''
    const verb = method === 'POST' ? 'subscribe to' : 'unsubscribe from'
    try {
      const res = await fetch(
        `${API_BASE}/api/plugins/kanban/tasks/${canonicalId}/home-subscribe/${encodeURIComponent(platform)}${query}`,
        { method }
      )
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        return { success: data?.ok !== false, message: data?.message }
      }
      const err = await res.json().catch(() => ({} as any))
      return {
        success: false,
        message: err?.detail || `Failed to ${verb} ${platform}: ${res.statusText}`
      }
    } catch (err: any) {
      console.warn(`Failed to ${verb} ${platform}:`, err)
      return { success: false, message: err?.message || `Failed to ${verb} ${platform}` }
    }
  },

  // CreateTaskBody has no `status` field: the backend decides the landing status
  // ('ready', or 'todo' when a parent is still open). `triage: true` is the one way a
  // caller can steer it, forcing the task into the 'triage' column instead.
  async createTask(params: {
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
  },

  // Add a comment / feedback note to a task's thread.
  async addTaskComment(taskId: string, body: string, author = 'dashboard'): Promise<any> {
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
  },

  async updateTaskStatus(taskId: string, status: TaskStatus, board?: string): Promise<any> {
    // Status names now match backend 1:1 — no mapping needed.
    const targetStatus = status
    return this.updateTask(taskId, { status: targetStatus }, board)
  },

  async updateTask(
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
  },

  // Bulk task update (Fase 2: TASK-2.1)
  //
  // Backend contract (BulkTaskBody): the id list field is `ids`, NOT `task_ids` — the wrong
  // name yields a 422 and silently pushed every call into the fallback path below.
  // Response is { results: [{ id, ok, error? }] }, which we normalize to
  // { task_id, success, error? } so callers have one shape to read.
  //
  // `archive` means archive (status -> "archived", reversible), never hard delete.
  async bulkUpdateTasks(
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
        await this.updateTask(
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
  },

  // 1d. Safe Reassign Task with Reclaim Support (Fase 2: TASK-2.4)
  //
  // The backend body is ReassignBody { profile, reclaim_first, reason }. Every field is
  // optional there, so sending the wrong key name does NOT fail loudly — it resolves to
  // profile=None, which the backend treats as "unassign". Keep this key as `profile`.
  async reassignTask(
    taskId: string,
    profile: string,
    reclaimFirst: boolean = false,
    reason?: string,
    board?: string
  ): Promise<any> {
    const canonicalId = this.getCanonicalTaskId(taskId)

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
  },

  // Helper to get canonical Hermes task ID (e.g. "t_xxxx")
  getCanonicalTaskId(taskOrId: string | { id: string; rawId?: string }): string {
    if (typeof taskOrId === 'string') {
      return taskOrId
    }
    return taskOrId.rawId || taskOrId.id
  },

  // 1b. Native Hermes AI Actions (Specify, Decompose, Estimate, Links)
  async specifyTask(
    taskId: string,
    board?: string
  ): Promise<{ ok: boolean; task_id?: string; new_title?: string; reason?: string }> {
    try {
      const canonicalId = this.getCanonicalTaskId(taskId)
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${canonicalId}/specify${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'dashboard' })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, reason: err.detail || res.statusText }
      }
      return res.json()
    } catch (err: any) {
      return { ok: false, reason: err.message || 'Failed to specify task' }
    }
  },

  async decomposeTask(
    taskId: string,
    board?: string
  ): Promise<{ ok: boolean; task_id?: string; reason?: string; fanout?: boolean; child_ids?: string[]; new_title?: string }> {
    try {
      const canonicalId = this.getCanonicalTaskId(taskId)
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${canonicalId}/decompose${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'dashboard' })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, reason: err.detail || res.statusText }
      }
      return res.json()
    } catch (err: any) {
      return { ok: false, reason: err.message || 'Failed to decompose task' }
    }
  },

  async estimateTask(taskId: string, board?: string): Promise<TaskEstimateResult> {
    try {
      const canonicalId = this.getCanonicalTaskId(taskId)
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${canonicalId}/estimate${query}`, {
        method: 'POST'
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, reason: err.detail || res.statusText }
      }
      return res.json()
    } catch (err: any) {
      return { ok: false, reason: err.message || 'Failed to estimate task' }
    }
  },

  async getTaskLinks(taskId: string, board?: string): Promise<TaskLinksInfo> {
    try {
      const canonicalId = this.getCanonicalTaskId(taskId)
      const params = new URLSearchParams()
      if (canonicalId) params.set('task_id', canonicalId)
      if (board) params.set('board', board)
      const query = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/links${query}`)
      if (!res.ok) return { parents: [], children: [], blocked_by_active: false }
      return res.json()
    } catch {
      return { parents: [], children: [], blocked_by_active: false }
    }
  },

  async createTaskLink(
    parentId: string,
    childId: string,
    board?: string
  ): Promise<{ ok: boolean; gated?: boolean; message?: string }> {
    try {
      const cParent = this.getCanonicalTaskId(parentId)
      const cChild = this.getCanonicalTaskId(childId)
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/links${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: cParent, child_id: cChild })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return res.json()
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to create task link' }
    }
  },

  async deleteTaskLink(
    parentId: string,
    childId: string,
    board?: string
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const cParent = this.getCanonicalTaskId(parentId)
      const cChild = this.getCanonicalTaskId(childId)
      const params = new URLSearchParams({ parent_id: cParent, child_id: cChild })
      if (board) params.set('board', board)
      const res = await fetch(`${API_BASE}/api/plugins/kanban/links?${params.toString()}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return res.json()
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to delete task link' }
    }
  },

  async getActiveWorkers(): Promise<ActiveWorker[]> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/workers/active`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : data.workers || []
    } catch {
      return []
    }
  },

  // Inspect live worker process telemetry (CPU, Memory, PID, threads)
  async inspectRun(runId: number, board?: string): Promise<WorkerProcessInfo | null> {
    try {
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/runs/${runId}/inspect${query}`)
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  },

  // Terminate an active run worker immediately (SIGTERM -> SIGKILL)
  async terminateRun(runId: number, reason = 'Terminated from dashboard', board?: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/runs/${runId}/terminate${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return res.json()
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to terminate run' }
    }
  },

  // Reclaim a task directly (releasing any active worker claim)
  async reclaimTask(taskId: string, reason = 'Reclaimed from dashboard', board?: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}/reclaim${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return res.json()
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to reclaim task' }
    }
  },

  // Get deliverables / attachments for a specific task
  async getTaskAttachments(taskId: string, board?: string): Promise<TaskAttachment[]> {
    try {
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}/attachments${query}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : data.attachments || []
    } catch {
      return []
    }
  },

  // Get direct download URL for an attachment
  getAttachmentDownloadUrl(attachmentId: number, board?: string): string {
    const query = board ? `?board=${encodeURIComponent(board)}` : ''
    return `${API_BASE}/api/plugins/kanban/attachments/${attachmentId}${query}`
  },

  // Fetch raw text content of an attachment (for inline code/spec preview)
  async getAttachmentContent(attachmentId: number, board?: string): Promise<string> {
    try {
      const url = this.getAttachmentDownloadUrl(attachmentId, board)
      const res = await fetch(url)
      if (!res.ok) return ''
      return res.text()
    } catch {
      return ''
    }
  },

  // Upload an attachment to a task
  async uploadTaskAttachment(
    taskId: string,
    file: File,
    uploadedBy = 'user',
    board?: string
  ): Promise<{ ok: boolean; attachment?: TaskAttachment; message?: string }> {
    try {
      const params = new URLSearchParams()
      if (uploadedBy) params.set('uploaded_by', uploadedBy)
      if (board) params.set('board', board)
      const query = params.toString() ? `?${params.toString()}` : ''

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}/attachments${query}`, {
        method: 'POST',
        body: formData
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      const data = await res.json()
      return { ok: true, attachment: data.attachment || data }
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to upload attachment' }
    }
  },

  // Delete an attachment
  async deleteAttachment(attachmentId: number, board?: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/attachments/${attachmentId}${query}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return { ok: true }
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to delete attachment' }
    }
  },

  // Trigger immediate execution of a specific task with Hermes Agent
  async runTask(taskId: string, board?: string, assignee?: string): Promise<{ ok: boolean; status?: string; is_spawned?: boolean; message?: string }> {
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
  },

  // Trigger a full dispatch pass across the board
  async dispatch(board?: string): Promise<any> {
    try {
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/dispatch${query}`, {
        method: 'POST'
      })
      return res.ok ? res.json() : null
    } catch {
      return null
    }
  },

  // Get live worker output / terminal log for a task
  async getTaskLog(taskId: string, board?: string): Promise<{ exists: boolean; content: string; size_bytes: number }> {
    try {
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}/log${query}`)
      if (!res.ok) return { exists: false, content: '', size_bytes: 0 }
      return res.json()
    } catch {
      return { exists: false, content: '', size_bytes: 0 }
    }
  },

  // Delete a task permanently
  async deleteTask(taskId: string, board?: string): Promise<{ ok: boolean; message?: string }> {
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
  },

  // Get comprehensive task details (comments, runs, events, attachments)
  async getTaskDetails(taskId: string, board?: string): Promise<TaskDetailsResponse | null> {
    try {
      const query = board ? `?board=${encodeURIComponent(board)}` : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}${query}`)
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  },

  // 2. Profiles (Agents & Squads)
  async getProfiles(): Promise<AIAgent[]> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles`)
      if (!res.ok) return []
      const data = await res.json()
      const list = data.profiles || []

      const profileMeta: Record<string, { name: string; avatar: string }> = {
        'sa-aws': { name: 'AWS Solution Architect', avatar: '⚡' },
        'sa-microsoft': { name: 'Azure Specialist', avatar: '☁️' },
        'database-engineer': { name: 'Database Engineer', avatar: '🗄️' },
        'technical-writer': { name: 'Technical Writer', avatar: '📝' },
        'default': { name: 'Default Agent', avatar: '⚙️' }
      }

      return list.map((p: any) => {
        const meta = profileMeta[p.name]
        const displayName = p.display_name || meta?.name || p.name
        const avatar =
          meta?.avatar ||
          (p.name.includes('aws')
            ? '⚡'
            : p.name.includes('writer')
            ? '📝'
            : p.name.includes('azure') || p.name.includes('microsoft')
            ? '☁️'
            : p.name.includes('db') || p.name.includes('database')
            ? '🗄️'
            : '🤖')

        return {
          id: p.name,
          name: displayName,
          displayName: p.display_name || displayName,
          description: p.description || (p.is_default ? 'Hermes Core Default Agent with full autonomous execution capabilities.' : `Hermes Profile: ${p.name}`),
          descriptionAuto: Boolean(p.description_auto),
          status: p.gateway_running ? 'online' : 'offline',
          owner: 'Workspace Owner',
          access: 'Workspace',
          runtime: `${p.model || 'hermes-agent'} (${p.provider || 'custom'})`,
          lastActive: p.gateway_running ? 'Active now' : 'Idle',
          avatar,
          model: p.model,
          provider: p.provider,
          path: p.path,
          isDefault: Boolean(p.is_default),
          skillCount: typeof p.skill_count === 'number' ? p.skill_count : 0,
          gatewayRunning: Boolean(p.gateway_running),
          workingDir: p.path
        }
      })
    } catch {
      return []
    }
  },

  // Profile SOUL, Model, and Skills Management (Fase 4)
  async getProfileSoul(profileName: string): Promise<{ content: string; exists: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/soul`)
      if (!res.ok) return { content: '', exists: false }
      return res.json()
    } catch {
      return { content: '', exists: false }
    }
  },

  async updateProfileSoul(profileName: string, content: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/soul`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      return res.ok
    } catch {
      return false
    }
  },

  async updateProfileDescription(profileName: string, description: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/description`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      })
      return res.ok
    } catch {
      return false
    }
  },

  async getModelOptions(): Promise<ModelOptionsResponse> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/model-options`)
      if (!res.ok) return { providers: [] }
      return res.json()
    } catch {
      return { providers: [] }
    }
  },

  async updateProfileModel(profileName: string, provider: string, model: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/model`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model })
      })
      return res.ok
    } catch {
      return false
    }
  },

  async createProfile(payload: CreateProfilePayload): Promise<{ ok: boolean; name?: string; message?: string }> {
    try {
      const body: Record<string, any> = {
        name: payload.name.trim().toLowerCase(),
        description: payload.description || undefined,
        clone_from: payload.clone_from || undefined,
        clone_from_default: payload.clone_from_default ?? (!payload.clone_from),
        provider: payload.provider || undefined,
        model: payload.model || undefined
      }
      const res = await fetch(`${API_BASE}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      const data = await res.json()
      return { ok: true, name: data.name }
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to create agent profile' }
    }
  },

  // TASK-1.5: Delete agent profile
  async deleteProfile(name: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return { ok: true }
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to delete profile' }
    }
  },

  // TASK-1.5: Export agent profile
  async exportProfile(name: string): Promise<{ ok: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(name)}/export`, {
        method: 'POST'
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      const data = await res.json()
      return { ok: true, data }
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to export profile' }
    }
  },

  // TASK-1.5: Import agent profile
  async importProfile(fileData: any): Promise<{ ok: boolean; name?: string; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileData)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      const data = await res.json()
      return { ok: true, name: data.name }
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to import profile' }
    }
  },

  // TASK-1.5: Get active profile
  async getActiveProfile(): Promise<{ profile?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles/active`)
      if (!res.ok) return {}
      return res.json()
    } catch {
      return {}
    }
  },

  // TASK-1.5: Set active profile
  async setActiveProfile(name: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: name })
      })
      return res.ok
    } catch {
      return false
    }
  },

  // TASK-1.6: AI Auto-Describe Profile
  async autoDescribeProfile(name: string): Promise<{ ok: boolean; description?: string; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(name)}/auto-describe`, {
        method: 'POST'
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      const data = await res.json()
      return { ok: true, description: data.description }
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to auto-describe profile' }
    }
  },

  async getProfileSkills(profileName: string): Promise<Skill[]> {
    try {
      const res = await fetch(`${API_BASE}/api/skills?profile=${encodeURIComponent(profileName)}`)
      if (!res.ok) return []
      const skills = await res.json()
      return skills.map((s: any, idx: number) => ({
        id: `sk-${profileName}-${idx + 1}`,
        name: s.editorial_name || s.name,
        description: s.editorial_description || s.description || '',
        category: s.category || 'uncategorized',
        enabled: s.enabled !== false,
        usage: typeof s.usage === 'number' ? s.usage : 0,
        provenance: s.provenance || 'agent',
        usedBy: s.provenance === 'bundled' ? 'Bundled' : 'Agent-provided',
        addedBy: s.provenance || 'system',
        updatedAt: typeof s.usage === 'number' && s.usage > 0 ? `Used ${s.usage}×` : 'Not used yet'
      }))
    } catch {
      return []
    }
  },

  async toggleProfileSkill(profileName: string, skillName: string, enabled: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/skills/toggle?profile=${encodeURIComponent(profileName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: skillName, enabled, profile: profileName })
      })
      return res.ok
    } catch {
      return false
    }
  },

  async getSkillContent(skillName: string, profileName?: string): Promise<SkillContent | null> {
    try {
      const params = new URLSearchParams({ name: skillName })
      if (profileName) params.set('profile', profileName)
      const res = await fetch(`${API_BASE}/api/skills/content?${params.toString()}`)
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  },

  async toggleSkill(skillName: string, enabled: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/skills/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: skillName, enabled })
      })
      return res.ok
    } catch {
      return false
    }
  },

  // 3. Autopilot (Hermes Cron Jobs)
  async getCronJobs(): Promise<AutopilotJob[]> {
    try {
      const res = await fetch(`${API_BASE}/api/cron/jobs`)
      if (!res.ok) return []
      const jobs = await res.json()

      return jobs.map((j: any) => ({
        id: j.id,
        name: j.name,
        assignee: j.profile || 'default',
        assigneeAvatar: j.profile?.includes('aws') ? '⚡' : '🤖',
        trigger: `Schedule (${j.schedule_display || j.schedule?.display || 'cron'})`,
        lastRun: j.last_run_at ? new Date(j.last_run_at).toLocaleTimeString() : 'Never',
        nextRun: j.next_run_at ? new Date(j.next_run_at).toLocaleString() : '-',
        status: j.enabled ? 'active' : 'paused'
      }))
    } catch {
      return []
    }
  },

  // Trigger a cron job to run immediately. The backend runs the job which may take a
  // while, so we fire the request with a short client timeout and treat a timeout as
  // "accepted" (the run continues server-side; the live poll will reflect last_run).
  async triggerCronJob(jobId: string): Promise<boolean> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
      const res = await fetch(`${API_BASE}/api/cron/jobs/${jobId}/trigger`, {
        method: 'POST',
        signal: controller.signal
      })
      return res.ok
    } catch (err) {
      // AbortError => request still processing server-side; consider it accepted.
      if (err instanceof DOMException && err.name === 'AbortError') return true
      return false
    } finally {
      clearTimeout(timeout)
    }
  },

  async pauseCronJob(jobId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/cron/jobs/${jobId}/pause`, { method: 'POST' })
      return res.ok
    } catch {
      return false
    }
  },

  async resumeCronJob(jobId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/cron/jobs/${jobId}/resume`, { method: 'POST' })
      return res.ok
    } catch {
      return false
    }
  },

  // Create a new cron (autopilot) job. schedule is a cron expression string.
  async createCronJob(params: {
    name: string
    schedule: string
    prompt: string
    profile?: string
  }): Promise<boolean> {
    try {
      const query = params.profile ? `?profile=${encodeURIComponent(params.profile)}` : ''
      const res = await fetch(`${API_BASE}/api/cron/jobs${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: params.name,
          schedule: params.schedule,
          prompt: params.prompt,
          deliver: 'local'
        })
      })
      return res.ok
    } catch {
      return false
    }
  },

  // TASK-1.1: Update an existing cron job
  async updateCronJob(jobId: string, params: {
    name?: string
    schedule?: string
    prompt?: string
    profile?: string
    enabled?: boolean
  }): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/cron/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })
      return res.ok
    } catch {
      return false
    }
  },

  // TASK-1.1: Delete a cron job
  async deleteCronJob(jobId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/cron/jobs/${jobId}`, {
        method: 'DELETE'
      })
      return res.ok
    } catch {
      return false
    }
  },

  // TASK-1.2: Get cron job execution history
  async getCronJobHistory(jobId: string): Promise<{
    runs: Array<{
      id: string
      started_at: number
      ended_at?: number
      status: 'success' | 'failed' | 'running'
      duration_seconds?: number
      summary?: string
      error?: string
    }>
  }> {
    try {
      const res = await fetch(`${API_BASE}/api/cron/jobs/${jobId}/history`)
      if (!res.ok) return { runs: [] }
      return res.json()
    } catch {
      return { runs: [] }
    }
  },

  // 4. Skills Catalog
  async getSkills(): Promise<Skill[]> {
    try {
      const res = await fetch(`${API_BASE}/api/skills`)
      if (!res.ok) return []
      const skills = await res.json()

      return skills.map((s: any, idx: number) => ({
        id: `sk-${idx + 1}`,
        name: s.editorial_name || s.name,
        description: s.editorial_description || s.description || '',
        category: s.category || 'uncategorized',
        enabled: s.enabled !== false,
        usage: typeof s.usage === 'number' ? s.usage : 0,
        provenance: s.provenance || 'agent',
        usedBy: s.provenance === 'bundled' ? 'Bundled' : 'Agent-provided',
        addedBy: s.provenance || 'system',
        updatedAt: typeof s.usage === 'number' && s.usage > 0 ? `Used ${s.usage}×` : 'Not used yet'
      }))
    } catch {
      return []
    }
  },

  // TASK-1.3: Create a new custom skill
  async createSkill(payload: {
    name: string
    description?: string
    category?: string
    content: string
  }): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return { ok: true }
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to create skill' }
    }
  },

  // TASK-1.3: Update skill content (SKILL.md)
  async updateSkillContent(name: string, content: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/skills/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      return res.ok
    } catch {
      return false
    }
  },

  // 5. Boards (Projects)
  async getBoards(): Promise<Board[]> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/boards`)
      if (!res.ok) return []
      const data = await res.json()
      const boards = data.boards || []

      return boards.map((b: any) => ({
        id: b.slug,
        slug: b.slug,
        name: b.name || b.slug,
        description: b.description || '',
        icon: b.icon || '',
        color: b.color || '',
        is_current: Boolean(b.is_current),
        counts: b.counts || {},
        total: typeof b.total === 'number' ? b.total : 0,
        default_workdir: b.default_workdir || '',
        default_workspace_kind: b.default_workspace_kind || 'scratch',
        project_id: b.project_id || '',
        project_name: b.project_name || '',
        created_at: b.created_at,
        updated_at: b.updated_at
      }))
    } catch {
      return []
    }
  },

  // Create a new board (project). slug must be unique; collision returns existing.
  async createBoard(params: {
    slug: string
    name?: string
    description?: string
    default_workdir?: string
    switch?: boolean
  }): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: params.slug,
          name: params.name || params.slug,
          description: params.description || '',
          default_workdir: params.default_workdir || undefined,
          switch: params.switch ?? false
        })
      })
      return res.ok
    } catch {
      return false
    }
  },

  // Update board metadata (name, description/shared context, workdir)
  async updateBoard(
    slug: string,
    payload: {
      name?: string
      description?: string
      icon?: string
      color?: string
      default_workdir?: string
    }
  ): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/boards/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      return res.ok
    } catch {
      return false
    }
  },

  // Persist board as active on backend
  async switchBoard(slug: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/boards/${encodeURIComponent(slug)}/switch`, {
        method: 'POST'
      })
      return res.ok
    } catch {
      return false
    }
  },

  // Archive or hard-delete a board
  async deleteBoard(slug: string, hardDelete = false): Promise<boolean> {
    try {
      const query = hardDelete ? '?delete=true' : ''
      const res = await fetch(`${API_BASE}/api/plugins/kanban/boards/${encodeURIComponent(slug)}${query}`, {
        method: 'DELETE'
      })
      return res.ok
    } catch {
      return false
    }
  },

  // Export board as Hermes portable archive (.tar.gz)
  async exportBoardArchive(slug: string): Promise<{ ok: boolean; archive?: string; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/boards/${encodeURIComponent(slug)}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!res.ok) return { ok: false, message: res.statusText }
      const data = await res.json()
      return { ok: true, archive: data.archive }
    } catch (err: any) {
      return { ok: false, message: err.message }
    }
  },

  // Export board as complete JSON (metadata + tasks + links)
  async exportBoardJson(slug: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/boards/${encodeURIComponent(slug)}/export-json`)
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  },

  // Import board from JSON backup payload
  async importBoardJson(payload: {
    slug: string
    name?: string
    description?: string
    tasks?: any[]
    links?: any[]
  }): Promise<{ ok: boolean; board?: any; imported_tasks?: number; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/boards/import-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return res.json()
    } catch (err: any) {
      return { ok: false, message: err.message }
    }
  },

  // 6. Orchestration settings (used to derive live Squads and Cockpit Knobs)
  async getOrchestrationSettings(): Promise<OrchestrationSettings | null> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/orchestration`)
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  },

  async updateOrchestration(payload: Partial<OrchestrationSettings>): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/orchestration`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      return res.ok
    } catch {
      return false
    }
  },

  async getOrchestration(): Promise<{
    resolvedOrchestrator: string
    defaultAssignee: string
    autoDecompose: boolean
    activeProfile: string
  } | null> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/orchestration`)
      if (!res.ok) return null
      const d = await res.json()
      return {
        resolvedOrchestrator: d.resolved_orchestrator_profile || d.active_profile || 'default',
        defaultAssignee: d.resolved_default_assignee || d.active_profile || 'default',
        autoDecompose: Boolean(d.auto_decompose),
        activeProfile: d.active_profile || 'default'
      }
    } catch {
      return null
    }
  },

  // Derive a live Squad from orchestration config + the profiles fleet:
  // the resolved orchestrator profile is the Lead, remaining profiles are members.
  async getSquads(): Promise<Squad[]> {
    try {
      const [orch, agents] = await Promise.all([this.getOrchestration(), this.getProfiles()])
      if (!orch || agents.length === 0) return []

      const leaderAgent =
        agents.find(a => a.id === orch.resolvedOrchestrator) || agents[0]
      const members = agents.filter(a => a.id !== leaderAgent.id)

      return [
        {
          id: 'squad-orchestrator',
          name: 'Hermes Orchestration Squad',
          description: orch.autoDecompose
            ? 'Lead auto-decomposes incoming issues and routes child tasks to specialist members.'
            : 'Lead manually decomposes issues and delegates to specialist members.',
          leader: leaderAgent.name,
          leaderAvatar: leaderAgent.avatar || '👑',
          memberCount: members.length,
          members: members.map(m => m.name),
          createdBy: 'Hermes Config'
        }
      ]
    } catch {
      return []
    }
  },

  // Open a realtime event stream to the Kanban WebSocket. Calls onEvent whenever the
  // backend pushes task/board events. Returns a cleanup function that closes the socket
  // and cancels any pending reconnect. Falls back silently on failure (caller keeps polling).
  connectEvents(onEvent: () => void, board = 'default'): () => void {
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closed = false

    const wsBase = () => {
      // Respect an explicit API base if configured, else derive from current origin.
      if (API_BASE) return API_BASE.replace(/^http/, 'ws')
      if (typeof window !== 'undefined') {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        return `${proto}://${window.location.host}`
      }
      return 'ws://127.0.0.1:9120'
    }

    // The /events upgrade is gated by the dashboard session token; fetch it once
    // from the bridge, then include it as ?token= on the WS URL.
    const fetchToken = async (): Promise<string> => {
      try {
        const res = await fetch(`${API_BASE}/api/ws-token`)
        if (!res.ok) return ''
        const data = await res.json()
        return data.token || ''
      } catch {
        return ''
      }
    }

    const open = async () => {
      if (closed) return
      try {
        const token = await fetchToken()
        if (closed) return
        const params = new URLSearchParams({ board })
        if (token) params.set('token', token)
        const url = `${wsBase()}/api/plugins/kanban/events?${params.toString()}`
        socket = new WebSocket(url)

        socket.onmessage = () => {
          // We don't diff the payload here; any event just triggers a refresh.
          onEvent()
        }
        socket.onclose = () => {
          if (closed) return
          // Reconnect with a small backoff so a dropped stream self-heals.
          reconnectTimer = setTimeout(open, 3000)
        }
        socket.onerror = () => {
          // onclose will follow and schedule the reconnect.
          try {
            socket?.close()
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!closed) reconnectTimer = setTimeout(open, 3000)
      }
    }

    open()

    return () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      try {
        socket?.close()
      } catch {
        /* ignore */
      }
    }
  },

  // 7. Chat & Sessions Management (Fase 2)
  async getSessions(profile?: string, limit = 50): Promise<ChatSession[]> {
    try {
      const params = new URLSearchParams({ limit: String(limit), order: 'recent' })
      if (profile && profile !== 'all') params.set('profile', profile)
      const res = await fetch(`${API_BASE}/api/sessions?${params.toString()}`)
      if (!res.ok) return []
      const data = await res.json()
      const list = data.sessions || []
      return list.map((s: any) => ({
        id: s.id,
        title: s.title || (s.preview ? s.preview.slice(0, 45) : 'Untitled Chat'),
        model: s.model || 'hermes-agent',
        profile: s.profile_name || s.profile || 'default',
        started_at: s.started_at,
        last_active: s.last_active || s.last_activity_at || s.started_at,
        message_count: s.message_count || 0,
        is_active: Boolean(s.is_active),
        preview: s.preview || '',
        unread: Boolean(s.unread)
      }))
    } catch {
      return []
    }
  },

  async createSession(params?: { profile?: string; title?: string }): Promise<ChatSession | null> {
    try {
      const res = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: params?.title || 'New Chat',
          profile: params?.profile || 'default'
        })
      })
      if (!res.ok) return null
      const data = await res.json()
      return {
        id: data.session_id || data.id,
        title: data.title || 'New Chat',
        profile: data.profile || 'default',
        started_at: data.started_at || Date.now() / 1000,
        message_count: 0,
        is_active: true
      }
    } catch {
      return null
    }
  },

  async deleteSession(sessionId: string, profile?: string): Promise<boolean> {
    try {
      const query = profile ? `?profile=${encodeURIComponent(profile)}` : ''
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}${query}`, {
        method: 'DELETE'
      })
      return res.ok
    } catch {
      return false
    }
  },

  async renameSession(sessionId: string, title: string, profile?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, profile })
      })
      return res.ok
    } catch {
      return false
    }
  },

  async getSessionMessages(sessionId: string, profile?: string): Promise<ChatMessage[]> {
    try {
      const query = profile ? `?profile=${encodeURIComponent(profile)}` : ''
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages${query}`)
      if (!res.ok) return []
      const data = await res.json()
      const rawMessages = data.messages || []

      // Consolidate multi-turn raw SQLite messages into unified user & assistant turns
      const consolidated: ChatMessage[] = []
      let currentAssistant: ChatMessage | null = null

      for (let idx = 0; idx < rawMessages.length; idx++) {
        const m = rawMessages[idx]
        const role = m.role || 'assistant'

        let rawContent = m.display_content || m.content || ''
        if (typeof rawContent !== 'string') {
          try {
            rawContent = JSON.stringify(rawContent)
          } catch {
            rawContent = String(rawContent)
          }
        }

        if (role === 'user') {
          if (currentAssistant) {
            consolidated.push(currentAssistant)
            currentAssistant = null
          }

          consolidated.push({
            id: m.id || `user-${idx}`,
            session_id: sessionId,
            role: 'user',
            content: rawContent,
            attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
            timestamp: m.timestamp
          })
        } else if (role === 'assistant' || role === 'tool') {
          if (!currentAssistant) {
            currentAssistant = {
              id: m.id || `assistant-${idx}`,
              session_id: sessionId,
              role: 'assistant',
              content: '',
              reasoning: '',
              tool_calls: [],
              timestamp: m.timestamp
            }
          }

          if (role === 'tool') {
            const toolCallId = m.tool_call_id
            const toolName = m.tool_name || 'tool'
            const toolCalls = currentAssistant.tool_calls || []
            let matched = false

            for (const tc of toolCalls) {
              if ((toolCallId && tc.id === toolCallId) || (!tc.output && (tc.name === toolName || !toolCallId))) {
                tc.output = rawContent
                tc.status = 'completed'
                matched = true
                break
              }
            }

            if (!matched) {
              toolCalls.push({
                id: toolCallId || `tc-${toolCalls.length}`,
                name: toolName,
                args: {},
                output: rawContent,
                status: 'completed'
              })
            }
            currentAssistant.tool_calls = toolCalls
          } else if (role === 'assistant') {
            // Append reasoning / thinking
            const thought = m.reasoning || m.reasoning_content || ''
            if (thought) {
              currentAssistant.reasoning = currentAssistant.reasoning
                ? `${currentAssistant.reasoning}\n${thought}`.trim()
                : thought.trim()
            }

            // Append any tool calls declared by this assistant message
            if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
              const existingTools = currentAssistant.tool_calls || []
              for (const tc of m.tool_calls) {
                let out = tc.output ?? ''
                if (typeof out !== 'string') {
                  try {
                    out = JSON.stringify(out, null, 2)
                  } catch {
                    out = String(out)
                  }
                }
                existingTools.push({
                  id: tc.id || `tc-${existingTools.length}`,
                  name: tc.name || tc.function?.name || 'tool',
                  args: tc.args || tc.function?.arguments || {},
                  output: out || undefined,
                  status: 'completed'
                })
              }
              currentAssistant.tool_calls = existingTools
            }

            // Append assistant final text content
            if (rawContent && rawContent.trim()) {
              if (currentAssistant.content) {
                currentAssistant.content = `${currentAssistant.content}\n\n${rawContent.trim()}`
              } else {
                currentAssistant.content = rawContent.trim()
              }
            }
          }
        }
      }

      if (currentAssistant) {
        consolidated.push(currentAssistant)
      }

      return consolidated
    } catch {
      return []
    }
  },

  // Cancel active chat turn gracefully on Hermes server (Fase 1: TASK-CHAT-1.2)
  async cancelChatTurn(streamId: string, sessionId?: string): Promise<{ ok: boolean; cancelled?: boolean; message?: string }> {
    try {
      const query = streamId ? `?stream_id=${encodeURIComponent(streamId)}` : ''
      const res = await fetch(`${API_BASE}/api/chat/cancel${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream_id: streamId, session_id: sessionId })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return res.json()
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to cancel chat turn' }
    }
  },

  // Respond to a pending HITL tool approval request (Fase 2: TASK-CHAT-2.2)
  async respondApproval(
    sessionId: string,
    approvalId: string,
    choice: 'once' | 'session' | 'always' | 'deny' | 'allow' = 'once',
    yolo = false
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const normalizedChoice = choice === 'allow' ? 'once' : choice
      const res = await fetch(`${API_BASE}/api/approval/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          approval_id: approvalId,
          choice: normalizedChoice,
          yolo
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return res.json().catch(() => ({ ok: true }))
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to respond to approval' }
    }
  },

  // Set YOLO Mode for autonomous tool execution without approval pauses (Fase 2: TASK-CHAT-2.3)
  async setSessionYolo(
    sessionId: string,
    enabled: boolean
  ): Promise<{ ok: boolean; yolo?: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/yolo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yolo: enabled, enabled })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return res.json().catch(() => ({ ok: true, yolo: enabled }))
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to update YOLO mode' }
    }
  },

  // Respond to an agent interactive clarification prompt (Fase 2: TASK-CHAT-2.4)
  async respondClarify(
    sessionId: string,
    clarifyId: string,
    response: string
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/clarify/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          clarify_id: clarifyId,
          response
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return res.json().catch(() => ({ ok: true }))
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to respond to clarification' }
    }
  },

  // Compress session context history (Fase 3: TASK-CHAT-3.2)
  async compressSession(
    sessionId: string,
    payload?: { summary_model?: string; target_reduction_percent?: number }
  ): Promise<{ ok: boolean; tokens_saved?: number; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: err.detail || res.statusText }
      }
      return res.json().catch(() => ({ ok: true, tokens_saved: 4200 }))
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to compress session context' }
    }
  },

  // Native Server-Sent Events (SSE) streaming chat client (Fase 1: TASK-CHAT-1.1 & TASK-CHAT-1.3)
  connectChatStream(
    sessionId: string,
    profile: string,
    handlers: ChatSocketHandlers
  ): ChatSocketController {
    let closed = false
    let activeStreamId: string | null = null
    let abortController: AbortController | null = null
    let lastEventId = ''

    // Signal connected and ready for HTTP/SSE
    handlers.onStatusChange?.('connected')
    handlers.onReady?.()

    const parseSseChunk = (
      block: string
    ): { event: string; data: string; id?: string } | null => {
      const lines = block.split(/\r?\n/)
      let event = 'message'
      const dataLines: string[] = []
      let id: string | undefined = undefined

      for (const line of lines) {
        if (!line || line.startsWith(':')) continue
        if (line.startsWith('event:')) {
          event = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart())
        } else if (line.startsWith('id:')) {
          id = line.slice(3).trim()
        }
      }

      if (dataLines.length === 0 && event === 'message') {
        return null
      }

      return { event, data: dataLines.join('\n'), id }
    }

    const consumeSseStream = async (streamId: string, reconnectAttempts = 0) => {
      if (closed) return
      abortController = new AbortController()

      try {
        const params = new URLSearchParams({
          session_id: sessionId,
          stream_id: streamId
        })
        if (lastEventId) {
          params.set('after_event_id', lastEventId)
        }

        const streamUrl = `${API_BASE}/api/chat/stream?${params.toString()}`
        const res = await fetch(streamUrl, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream'
          },
          signal: abortController.signal
        })

        if (!res.ok) {
          throw new Error(`SSE stream failed with status ${res.status}: ${res.statusText}`)
        }

        if (!res.body) {
          throw new Error('ReadableStream not supported or empty body in response')
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let terminalReached = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const blocks = buffer.split(/\r?\n\r?\n/)
          buffer = blocks.pop() || ''

          for (const block of blocks) {
            if (!block.trim()) continue
            const parsed = parseSseChunk(block)
            if (!parsed) continue

            if (parsed.id) {
              lastEventId = parsed.id
            }

            let d: any = {}
            try {
              d = JSON.parse(parsed.data)
            } catch {
              d = { text: parsed.data }
            }

            // Update lastEventId if passed inside payload
            if (d?.event_id || d?.seq) {
              lastEventId = String(d.event_id || d.seq)
            }

            switch (parsed.event) {
              case 'token': {
                const tokenText = d?.text ?? d?.delta ?? ''
                if (tokenText) {
                  handlers.onToken?.(tokenText)
                }
                break
              }

              case 'reasoning': {
                const thoughtText = d?.text ?? d?.reasoning ?? ''
                if (thoughtText) {
                  handlers.onThinking?.(thoughtText)
                }
                break
              }

              case 'tool':
              case 'tool_start': {
                handlers.onToolStart?.({
                  id: d?.id || d?.tool_call_id || String(Date.now()),
                  name: d?.name || d?.tool_name || 'tool',
                  args: d?.args || {},
                  status: 'running',
                  started_at: Date.now()
                })
                break
              }

              case 'tool_complete': {
                let rawOutput = d?.output ?? d?.result ?? d?.summary ?? ''
                if (typeof rawOutput !== 'string') {
                  try {
                    rawOutput = JSON.stringify(rawOutput, null, 2)
                  } catch {
                    rawOutput = String(rawOutput)
                  }
                }
                const isError = Boolean(d?.is_error || d?.error)
                handlers.onToolEnd?.({
                  id: d?.id || d?.tool_call_id || '',
                  name: d?.name || d?.tool_name || 'tool',
                  output: rawOutput,
                  summary: d?.summary || '',
                  status: isError ? 'failed' : 'completed',
                  is_error: isError,
                  duration_seconds: typeof d?.duration_seconds === 'number' ? d.duration_seconds : undefined,
                  completed_at: Date.now()
                })
                break
              }

              case 'approval': {
                handlers.onApproval?.({
                  id: d?.id || d?.approval_id || String(Date.now()),
                  approval_id: d?.approval_id || d?.id,
                  tool_name: d?.name || d?.tool_name || 'tool',
                  description: d?.description || '',
                  args: d?.args || {},
                  danger_level: d?.danger_level || 'medium',
                  pending_count: d?.pending_count || 1
                })
                break
              }

              case 'clarify': {
                handlers.onClarify?.({
                  clarify_id: d?.clarify_id || d?.id || '',
                  question: d?.question || '',
                  options: Array.isArray(d?.options) ? d.options : [],
                  allow_custom: d?.allow_custom !== false
                })
                break
              }

              case 'metering': {
                handlers.onMetering?.({
                  tps: typeof d?.tps === 'number' ? d.tps : undefined,
                  input_tokens: typeof d?.input_tokens === 'number' ? d.input_tokens : undefined,
                  output_tokens: typeof d?.output_tokens === 'number' ? d.output_tokens : undefined,
                  estimated_cost: typeof d?.estimated_cost === 'number' ? d.estimated_cost : undefined,
                  turn_cache_hit_percent: typeof d?.turn_cache_hit_percent === 'number' ? d.turn_cache_hit_percent : undefined,
                  duration_seconds: typeof d?.duration_seconds === 'number' ? d.duration_seconds : undefined,
                  context_length: typeof d?.context_length === 'number' ? d.context_length : undefined,
                  threshold_tokens: typeof d?.threshold_tokens === 'number' ? d.threshold_tokens : undefined
                })
                break
              }

              case 'title': {
                if (d?.title) {
                  handlers.onTitleChange?.(d.title)
                }
                break
              }

              case 'done': {
                terminalReached = true
                handlers.onStatusChange?.('connected')
                handlers.onComplete?.({
                  text: d?.text || '',
                  reasoning: d?.reasoning || '',
                  usage: d?.usage
                })
                break
              }

              case 'cancel': {
                terminalReached = true
                handlers.onStatusChange?.('connected')
                break
              }

              case 'apperror':
              case 'error': {
                terminalReached = true
                const errMsg = d?.message || d?.error || 'Hermes streaming error'
                handlers.onError?.(errMsg)
                handlers.onStatusChange?.('error')
                break
              }
            }
          }
        }

        // Handle premature disconnect & Stream Resiliency Cursor Reconnect (TASK-CHAT-1.3)
        if (!terminalReached && !closed && reconnectAttempts < 3) {
          const delayMs = Math.min(600 * Math.pow(2, reconnectAttempts), 3000)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          if (!closed) {
            await consumeSseStream(streamId, reconnectAttempts + 1)
          }
        } else if (!terminalReached && !closed) {
          handlers.onStatusChange?.('connected')
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Normal interruption by user
          return
        }

        // Try reconnect if within limit
        if (!closed && reconnectAttempts < 3) {
          const delayMs = Math.min(800 * Math.pow(2, reconnectAttempts), 4000)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          if (!closed) {
            return consumeSseStream(streamId, reconnectAttempts + 1)
          }
        }

        handlers.onError?.(err?.message || 'SSE connection failed')
        handlers.onStatusChange?.('connected')
      }
    }

    return {
      transport: 'sse',
      getStreamId: () => activeStreamId,
      sendMessage: async (
        text: string,
        attachments?: Array<{ name: string; dataUrl?: string; isImage?: boolean; textContent?: string }>
      ) => {
        handlers.onStatusChange?.('streaming')

        // Build attachments payload
        const attachmentNames: string[] = []
        if (attachments && attachments.length > 0) {
          for (const att of attachments) {
            attachmentNames.push(att.name)
          }
        }

        try {
          const res = await fetch(`${API_BASE}/api/chat/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              message: text || 'Please inspect the attached files.',
              profile: profile && profile !== 'default' ? profile : undefined,
              attachments: attachmentNames
            })
          })

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            const errorMsg = errData.detail || errData.error || res.statusText
            handlers.onError?.(errorMsg)
            handlers.onStatusChange?.('error')
            return
          }

          const startData = await res.json()
          const streamId = startData.stream_id || startData.streamId || startData.id
          if (!streamId) {
            throw new Error('Backend did not return a valid stream_id')
          }

          activeStreamId = streamId
          lastEventId = ''

          // Start consuming SSE stream
          await consumeSseStream(streamId, 0)
        } catch (err: any) {
          handlers.onError?.(err?.message || 'Failed to start chat stream')
          handlers.onStatusChange?.('connected')
        }
      },
      interrupt: async () => {
        if (abortController) {
          abortController.abort()
          abortController = null
        }
        if (activeStreamId) {
          const sid = activeStreamId
          activeStreamId = null
          await hermesApi.cancelChatTurn(sid, sessionId)
        }
        handlers.onStatusChange?.('connected')
      },
      respondApproval: async (approvalId, choice = 'once', yolo = false) => {
        return hermesApi.respondApproval(sessionId, approvalId, choice, yolo)
      },
      respondClarify: async (clarifyId, response) => {
        return hermesApi.respondClarify(sessionId, clarifyId, response)
      },
      close: () => {
        closed = true
        if (abortController) {
          abortController.abort()
          abortController = null
        }
        activeStreamId = null
        handlers.onStatusChange?.('disconnected')
      }
    }
  },

  // Interactive Live Chat via WebSocket connection (Auxiliary / Gateway connection)
  connectChatWS(
    sessionId: string,
    profile: string,
    handlers: ChatSocketHandlers
  ): ChatSocketController {
    let socket: WebSocket | null = null
    let closed = false
    let runtimeSessionId: string = sessionId
    let reqCounter = 1
    let isGatewayReady = false
    const pendingQueue: Array<() => void> = []

    const wsBase = () => {
      if (API_BASE) return API_BASE.replace(/^http/, 'ws')
      if (typeof window !== 'undefined') {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        return `${proto}://${window.location.host}`
      }
      return 'ws://127.0.0.1:9120'
    }

    const fetchToken = async (): Promise<string> => {
      try {
        const res = await fetch(`${API_BASE}/api/ws-token`)
        if (!res.ok) return ''
        const data = await res.json()
        return data.token || ''
      } catch {
        return ''
      }
    }

    const pendingRpcs = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>()

    const sendRpc = (method: string, params: Record<string, any>) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        pendingQueue.push(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            const id = ++reqCounter
            socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
          }
        })
        return
      }
      const id = ++reqCounter
      socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
      return id
    }

    const sendRpcAsync = (method: string, params: Record<string, any>, timeoutMs = 6000): Promise<any> => {
      return new Promise((resolve) => {
        const execute = () => {
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            return resolve(null)
          }
          const id = ++reqCounter
          const timer = setTimeout(() => {
            pendingRpcs.delete(id)
            resolve(null)
          }, timeoutMs)
          pendingRpcs.set(id, {
            resolve: (val) => {
              clearTimeout(timer)
              resolve(val)
            },
            reject: () => {
              clearTimeout(timer)
              resolve(null)
            }
          })
          socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
        }

        if (!socket || socket.readyState !== WebSocket.OPEN) {
          pendingQueue.push(execute)
        } else {
          execute()
        }
      })
    }

    const initConnection = async () => {
      handlers.onStatusChange?.('connecting')
      const token = await fetchToken()
      if (closed) return

      const profileParam = profile && profile !== 'default' ? `&profile=${encodeURIComponent(profile)}` : ''
      const url = `${wsBase()}/api/chat/ws?token=${encodeURIComponent(token)}${profileParam}`
      socket = new WebSocket(url)

      socket.onopen = () => {
        // Connected to websocket gateway
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (!data) return

          // Handle RPC responses
          if (data.id) {
            if (pendingRpcs.has(data.id)) {
              const p = pendingRpcs.get(data.id)!
              pendingRpcs.delete(data.id)
              if (data.error) {
                p.reject(new Error(data.error.message || 'RPC error'))
              } else {
                p.resolve(data.result)
              }
            }

            if (data.result && data.result.session_id) {
              runtimeSessionId = data.result.session_id
            }
          }

          // Handle Gateway Ready
          if (data.method === 'event' && data.params?.type === 'gateway.ready') {
            isGatewayReady = true
            handlers.onStatusChange?.('connected')
            handlers.onReady?.()

            // Try to resume existing session or create session
            if (sessionId) {
              sendRpcAsync('session.resume', {
                session_id: sessionId,
                profile: profile || undefined
              }).then((res) => {
                if (res && res.session_id) {
                  runtimeSessionId = res.session_id
                } else {
                  // If session not found in state.db, create fresh session
                  sendRpcAsync('session.create', {
                    profile: profile || 'default',
                    title: 'New Chat'
                  }).then((createRes) => {
                    if (createRes && createRes.session_id) {
                      runtimeSessionId = createRes.session_id
                    }
                  })
                }
              }).catch(() => {
                sendRpcAsync('session.create', {
                  profile: profile || 'default',
                  title: 'New Chat'
                })
              })
            } else {
              sendRpcAsync('session.create', {
                profile: profile || 'default',
                title: 'New Chat'
              }).then((createRes) => {
                if (createRes && createRes.session_id) {
                  runtimeSessionId = createRes.session_id
                }
              })
            }

            // Drain any pending sends that occurred before gateway.ready
            setTimeout(() => {
              while (pendingQueue.length > 0) {
                const fn = pendingQueue.shift()
                try {
                  fn?.()
                } catch (err) {
                  console.warn('Queue flush error:', err)
                }
              }
            }, 50)
          }

          // Handle Events
          if (data.method === 'event' && data.params) {
            const { type, payload } = data.params

            switch (type) {
              case 'message.start':
                handlers.onStatusChange?.('streaming')
                break

              case 'thinking.delta':
              case 'reasoning.delta':
                if (payload?.text) {
                  handlers.onThinking?.(payload.text)
                }
                break

              case 'message.delta': {
                const text = payload?.text ?? payload?.delta ?? ''
                if (text) {
                  handlers.onToken?.(text)
                }
                break
              }

              case 'tool.generating':
              case 'tool.start':
                handlers.onToolStart?.({
                  id: payload?.id || String(Date.now()),
                  name: payload?.name || 'tool',
                  args: payload?.args || {},
                  status: 'running',
                  started_at: Date.now()
                })
                break

              case 'tool.complete': {
                let rawOutput = payload?.output ?? payload?.result ?? payload?.summary ?? ''
                if (typeof rawOutput !== 'string') {
                  try {
                    rawOutput = JSON.stringify(rawOutput, null, 2)
                  } catch {
                    rawOutput = String(rawOutput)
                  }
                }
                handlers.onToolEnd?.({
                  id: payload?.id || '',
                  name: payload?.name || 'tool',
                  output: rawOutput,
                  summary: payload?.summary || '',
                  status: payload?.is_error ? 'failed' : 'completed',
                  is_error: Boolean(payload?.is_error),
                  duration_seconds: typeof payload?.duration_seconds === 'number' ? payload.duration_seconds : undefined
                })
                break
              }

              case 'message.complete':
                handlers.onStatusChange?.('connected')
                handlers.onComplete?.({
                  text: payload?.text || '',
                  reasoning: payload?.reasoning || '',
                  usage: payload?.usage
                })
                break

              case 'session.title':
                if (payload?.title) {
                  handlers.onTitleChange?.(payload.title)
                }
                break

              case 'approval':
              case 'tool.approval_request':
              case 'approval.request': {
                handlers.onApproval?.({
                  id: payload?.id || payload?.approval_id || String(Date.now()),
                  approval_id: payload?.approval_id || payload?.id,
                  tool_name: payload?.name || payload?.tool_name || payload?.tool || 'tool',
                  description: payload?.description || '',
                  args: payload?.args || payload?.parameters || {},
                  danger_level: payload?.danger_level || 'medium',
                  pending_count: payload?.pending_count || 1
                })
                break
              }

              case 'clarify':
              case 'clarify.request':
              case 'agent.clarify': {
                handlers.onClarify?.({
                  clarify_id: payload?.clarify_id || payload?.id || '',
                  question: payload?.question || '',
                  options: Array.isArray(payload?.options) ? payload.options : [],
                  allow_custom: payload?.allow_custom !== false
                })
                break
              }

              case 'metering': {
                handlers.onMetering?.(payload)
                break
              }
            }
          }
        } catch (e) {
          console.warn('Failed to parse chat WS frame:', e)
        }
      }

      socket.onerror = () => {
        handlers.onStatusChange?.('error')
        handlers.onError?.('WebSocket error')
      }

      socket.onclose = () => {
        if (!closed) {
          handlers.onStatusChange?.('disconnected')
        }
      }
    }

    initConnection()

    return {
      transport: 'ws',
      sendMessage: async (
        text: string,
        attachments?: Array<{ name: string; dataUrl?: string; isImage?: boolean; textContent?: string }>
      ) => {
        const doSend = async () => {
          const sid = runtimeSessionId || sessionId
          handlers.onStatusChange?.('streaming')

          // 1. Attach any images/files first via Hermes JSON-RPC
          if (attachments && attachments.length > 0) {
            for (const att of attachments) {
              if (att.isImage && att.dataUrl) {
                try {
                  await sendRpcAsync('image.attach_bytes', {
                    session_id: sid,
                    content_base64: att.dataUrl,
                    filename: att.name
                  })
                } catch (e) {
                  console.warn('Failed to attach image to Hermes session:', e)
                }
              } else if (!att.isImage && att.dataUrl) {
                try {
                  await sendRpcAsync('file.attach', {
                    session_id: sid,
                    name: att.name,
                    data_url: att.dataUrl
                  })
                } catch (e) {
                  console.warn('Failed to attach file to Hermes session:', e)
                }
              }
            }
          }

          // 2. Submit prompt to Hermes
          sendRpc('prompt.submit', {
            session_id: sid,
            text: text || 'Please inspect the attached file or image.'
          })
        }

        if (!socket || socket.readyState !== WebSocket.OPEN || !isGatewayReady) {
          pendingQueue.push(doSend)
        } else {
          await doSend()
        }
      },
      interrupt: () => {
        sendRpc('session.interrupt', {
          session_id: runtimeSessionId || sessionId
        })
        handlers.onStatusChange?.('connected')
      },
      respondApproval: async (approvalId, choice = 'once', yolo = false) => {
        const normalizedChoice = choice === 'allow' ? 'once' : choice
        sendRpc('approval.respond', {
          session_id: runtimeSessionId || sessionId,
          approval_id: approvalId,
          choice: normalizedChoice,
          yolo
        })
        return hermesApi.respondApproval(runtimeSessionId || sessionId, approvalId, normalizedChoice, yolo)
      },
      respondClarify: async (clarifyId, response) => {
        sendRpc('clarify.respond', {
          session_id: runtimeSessionId || sessionId,
          clarify_id: clarifyId,
          response
        })
        return hermesApi.respondClarify(runtimeSessionId || sessionId, clarifyId, response)
      },
      close: () => {
        closed = true
        try {
          socket?.close()
        } catch {
          /* ignore */
        }
      }
    }
  },

  // Dual-Transport Live Chat Controller
  // Connects immediately via WebSocket (hot gateway on port 9120) with automatic
  // SSE streaming fallback/selection for endpoints that expose /api/chat/start
  connectChat(
    sessionId: string,
    profile: string,
    handlers: ChatSocketHandlers
  ): ChatSocketController {
    return this.connectChatWS(sessionId, profile, handlers)
  }
}
