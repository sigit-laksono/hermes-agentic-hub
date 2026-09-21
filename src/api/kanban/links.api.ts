/**
 * Kanban Task Links (DAG) API — Hermes Agentic Hub
 * Manages parent/child dependencies between tasks.
 */

import { API_BASE } from '../client'
import { TaskLinksInfo } from '../../types'
import { getCanonicalTaskId } from './tasks.api'

export async function getTaskLinks(taskId: string, board?: string): Promise<TaskLinksInfo> {
  try {
    const canonicalId = getCanonicalTaskId(taskId)
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
}

export async function createTaskLink(
  parentId: string,
  childId: string,
  board?: string
): Promise<{ ok: boolean; gated?: boolean; message?: string }> {
  try {
    const cParent = getCanonicalTaskId(parentId)
    const cChild = getCanonicalTaskId(childId)
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
}

export async function deleteTaskLink(
  parentId: string,
  childId: string,
  board?: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const cParent = getCanonicalTaskId(parentId)
    const cChild = getCanonicalTaskId(childId)
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
}
