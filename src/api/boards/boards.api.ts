/**
 * Boards (Projects) API — Hermes Agentic Hub
 *
 * Extracted from the monolithic hermesApi.ts as part of the domain-based
 * API refactoring (v0.1.1.2 Phase 2 TASK-2.1).
 */

import { API_BASE } from '../client'
import { Board } from '../../types'

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getBoards(): Promise<Board[]> {
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
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

// Create a new board (project). slug must be unique; collision returns existing.
export async function createBoard(params: {
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
}

// Update board metadata (name, description/shared context, workdir)
export async function updateBoard(
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
}

// Persist board as active on backend
export async function switchBoard(slug: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/boards/${encodeURIComponent(slug)}/switch`, {
      method: 'POST'
    })
    return res.ok
  } catch {
    return false
  }
}

// Archive or hard-delete a board
export async function deleteBoard(slug: string, hardDelete = false): Promise<boolean> {
  try {
    const query = hardDelete ? '?delete=true' : ''
    const res = await fetch(`${API_BASE}/api/plugins/kanban/boards/${encodeURIComponent(slug)}${query}`, {
      method: 'DELETE'
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Export / Import ─────────────────────────────────────────────────────────

// Export board as Hermes portable archive (.tar.gz)
export async function exportBoardArchive(slug: string): Promise<{ ok: boolean; archive?: string; message?: string }> {
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
}

// Export board as complete JSON (metadata + tasks + links)
export async function exportBoardJson(slug: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/boards/${encodeURIComponent(slug)}/export-json`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// Import board from JSON backup payload
export async function importBoardJson(payload: {
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
}
