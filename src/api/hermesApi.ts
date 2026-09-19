/// <reference types="vite/client" />
/**
 * Hermes Agent Live API Client
 * Communicates with the local Hermes harness bridge (http://127.0.0.1:9120)
 */

import { TaskStatus, AIAgent, AutopilotJob, Skill, Project, Squad } from '../types'

const API_BASE = import.meta.env.VITE_HERMES_API_URL || ''

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
  async getBoard(): Promise<{ columns: { name: string; tasks: any[] }[]; assignees: any[] }> {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/board`)
    if (!res.ok) throw new Error(`Failed to fetch board: ${res.statusText}`)
    return res.json()
  },

  async createTask(params: {
    title: string
    body?: string
    assignee?: string
    priority?: number
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
    if (!res.ok) throw new Error(`Failed to create task: ${res.statusText}`)
    return res.json()
  },

  // Add a comment / feedback note to a task's thread.
  async addTaskComment(taskId: string, body: string, author = 'dashboard'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, author })
    })
    if (!res.ok) throw new Error(`Failed to add comment: ${res.statusText}`)
    return res.json()
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<any> {
    // Map status string to hermes canonical status
    const statusMap: Record<string, string> = {
      backlog: 'triage',
      todo: 'todo',
      in_progress: 'running',
      in_review: 'review',
      blocked: 'blocked',
      done: 'done'
    }

    const targetStatus = statusMap[status] || status
    const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus })
    })
    if (!res.ok) throw new Error(`Failed to update task: ${res.statusText}`)
    return res.json()
  },

  async getActiveWorkers(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/workers/active`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : data.workers || []
    } catch {
      return []
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

  // Get comprehensive task details (comments, runs, events, attachments)
  async getTaskDetails(taskId: string, board?: string): Promise<any> {
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
        const displayName = meta?.name || p.display_name || p.name
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
          description: p.description || `Hermes Profile: ${p.name}`,
          status: p.gateway_running ? 'online' : 'offline',
          owner: 'Muhammad Sigit',
          access: 'Workspace',
          runtime: `${p.model} (${p.provider})`,
          lastActive: p.gateway_running ? 'Active now' : 'Idle',
          avatar
        }
      })
    } catch {
      return []
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

  // 5. Boards (Projects)
  async getBoards(): Promise<Project[]> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/boards`)
      if (!res.ok) return []
      const data = await res.json()
      const boards = data.boards || []

      return boards.map((b: any) => ({
        id: b.slug,
        name: b.name || b.slug,
        status: 'active',
        priority: 'medium',
        progressDone: b.counts?.done || 0,
        progressTotal: b.counts?.total || 1,
        lead: 'Muhammad Sigit',
        leadAvatar: '👤',
        createdAt: 'Active',
        description: b.description || `Board ${b.slug}`
      }))
    } catch {
      return []
    }
  },

  // Create a new board (project). slug must be unique; collision returns existing.
  async createBoard(params: { slug: string; name?: string; description?: string }): Promise<boolean> {    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: params.slug,
          name: params.name,
          description: params.description
        })
      })
      return res.ok
    } catch {
      return false
    }
  },

  // 6. Orchestration settings (used to derive live Squads)
  async getOrchestration(): Promise<{    resolvedOrchestrator: string
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
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      return `${proto}://${window.location.host}`
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
  }
}
