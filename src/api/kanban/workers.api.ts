/**
 * Kanban Workers & Runs API — Hermes Agentic Hub
 * Telemetry and lifecycle control for running worker processes.
 */

import { API_BASE } from '../client'
import { ActiveWorker, WorkerProcessInfo } from '../../types'

export async function getActiveWorkers(): Promise<ActiveWorker[]> {
  try {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/workers/active`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.workers || []
  } catch {
    return []
  }
}

// Inspect live worker process telemetry (CPU, Memory, PID, threads)
export async function inspectRun(runId: number, board?: string): Promise<WorkerProcessInfo | null> {
  try {
    const query = board ? `?board=${encodeURIComponent(board)}` : ''
    const res = await fetch(`${API_BASE}/api/plugins/kanban/runs/${runId}/inspect${query}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// Terminate an active run worker immediately (SIGTERM -> SIGKILL)
export async function terminateRun(
  runId: number,
  reason = 'Terminated from dashboard',
  board?: string
): Promise<{ ok: boolean; message?: string }> {
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
}

// Reclaim a task directly (releasing any active worker claim)
export async function reclaimTask(
  taskId: string,
  reason = 'Reclaimed from dashboard',
  board?: string
): Promise<{ ok: boolean; message?: string }> {
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
}
