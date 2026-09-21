/**
 * Kanban AI Actions API — Hermes Agentic Hub
 * Native AI actions: specify, decompose, and estimate tasks.
 */

import { API_BASE } from '../client'
import { TaskEstimateResult } from '../../types'
import { getCanonicalTaskId } from './tasks.api'

export async function specifyTask(
  taskId: string,
  board?: string
): Promise<{ ok: boolean; task_id?: string; new_title?: string; reason?: string }> {
  try {
    const canonicalId = getCanonicalTaskId(taskId)
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
}

export async function decomposeTask(
  taskId: string,
  board?: string
): Promise<{ ok: boolean; task_id?: string; reason?: string; fanout?: boolean; child_ids?: string[]; new_title?: string }> {
  try {
    const canonicalId = getCanonicalTaskId(taskId)
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
}

export async function estimateTask(taskId: string, board?: string): Promise<TaskEstimateResult> {
  try {
    const canonicalId = getCanonicalTaskId(taskId)
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
}
