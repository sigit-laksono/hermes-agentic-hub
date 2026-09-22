/**
 * Kanban Board API — Hermes Agentic Hub
 * Board-level operations: fetch board, assignees, stats, config.
 */

import { API_BASE, formatAge } from '../client'
import { BoardStats } from '../../types'

// 1. Kanban Board & Tasks
//
// `include_archived` defaults to false server-side, and the backend only emits an
// "archived" column when it is true — so the flag has to be sent for the Archived
// column to ever have content.
// `tenant` is a per-task filter (tasks.tenant), a different axis from `board` — which
// selects the board itself. They are not interchangeable.
export async function getBoard(
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
}

// Get known assignees (active profiles + historical assignees used on board)
export async function getAssignees(board?: string): Promise<string[]> {
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
}

// 1c. Board Stats Dashboard (Fase 2: TASK-2.3)
// GET /stats returns snake_case:
//   { by_status, by_assignee, oldest_ready_age_seconds, now }
// Returning that raw left every camelCase field on BoardStats undefined, so the UI
// silently fell back to a hardcoded "5m". Map it here instead.
// Note: oldest_ready_age_seconds is null when nothing is in 'ready'.
export async function getBoardStats(board?: string): Promise<BoardStats> {
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
}

// 1e. Kanban Config Integration (Fase 2: TASK-2.5)
export async function getKanbanConfig(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/config`)
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}
