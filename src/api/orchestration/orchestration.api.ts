/**
 * Orchestration & Squad Management API — Hermes Agentic Hub
 *
 * Extracted from the monolithic hermesApi.ts as part of the domain-based
 * API refactoring (v0.1.1.2 Phase 2 TASK-2.1).
 *
 * Handles orchestration settings, squad derivation, and WebSocket event streams.
 */

import { API_BASE } from '../client'
import { OrchestrationSettings, Squad } from '../../types'
import { getProfiles } from '../agents/profiles.api'

// ─── Orchestration Settings ──────────────────────────────────────────────────

export async function getOrchestrationSettings(): Promise<OrchestrationSettings | null> {
  try {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/orchestration`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function updateOrchestration(payload: Partial<OrchestrationSettings>): Promise<boolean> {
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
}

export async function getOrchestration(): Promise<{
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
}

// ─── Squad Derivation ────────────────────────────────────────────────────────

// Derive a live Squad from orchestration config + the profiles fleet:
// the resolved orchestrator profile is the Lead, remaining profiles are members.
export async function getSquads(): Promise<Squad[]> {
  try {
    const [orch, agents] = await Promise.all([getOrchestration(), getProfiles()])
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
}

// ─── WebSocket Event Stream ──────────────────────────────────────────────────

// Open a realtime event stream to the Kanban WebSocket. Calls onEvent whenever the
// backend pushes task/board events. Returns a cleanup function that closes the socket
// and cancels any pending reconnect. Falls back silently on failure (caller keeps polling).
export function connectEvents(onEvent: () => void, board = 'default'): () => void {
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
}
