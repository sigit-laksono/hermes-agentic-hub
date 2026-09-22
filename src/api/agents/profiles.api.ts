/**
 * Agent Profiles API — Hermes Agentic Hub
 *
 * Extracted from hermesApi.ts Section 2 (Profiles & Squads) as part of
 * the domain-based API refactoring (v0.1.1.2 TASK-2.2).
 */

import { API_BASE } from '../client'
import { AIAgent, ModelOptionsResponse, CreateProfilePayload } from '../../types'

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getProfiles(): Promise<AIAgent[]> {
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
}

// ─── SOUL Management ─────────────────────────────────────────────────────────

export async function getProfileSoul(profileName: string): Promise<{ content: string; exists: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(profileName)}/soul`)
    if (!res.ok) return { content: '', exists: false }
    return res.json()
  } catch {
    return { content: '', exists: false }
  }
}

export async function updateProfileSoul(profileName: string, content: string): Promise<boolean> {
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
}

export async function updateProfileDescription(profileName: string, description: string): Promise<boolean> {
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
}

// ─── Model Management ────────────────────────────────────────────────────────

export async function getModelOptions(): Promise<ModelOptionsResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/model-options`)
    if (!res.ok) return { providers: [] }
    return res.json()
  } catch {
    return { providers: [] }
  }
}

export async function updateProfileModel(profileName: string, provider: string, model: string): Promise<boolean> {
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
}

// ─── Profile CRUD ────────────────────────────────────────────────────────────

export async function createProfile(payload: CreateProfilePayload): Promise<{ ok: boolean; name?: string; message?: string }> {
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
}

// TASK-1.5: Delete agent profile
export async function deleteProfile(name: string): Promise<{ ok: boolean; message?: string }> {
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
}

// TASK-1.5: Export agent profile
export async function exportProfile(name: string): Promise<{ ok: boolean; data?: any; message?: string }> {
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
}

// TASK-1.5: Import agent profile
export async function importProfile(fileData: any): Promise<{ ok: boolean; name?: string; message?: string }> {
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
}

// ─── Active Profile ──────────────────────────────────────────────────────────

// TASK-1.5: Get active profile
export async function getActiveProfile(): Promise<{ profile?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/profiles/active`)
    if (!res.ok) return {}
    return res.json()
  } catch {
    return {}
  }
}

// TASK-1.5: Set active profile
export async function setActiveProfile(name: string): Promise<boolean> {
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
}

// TASK-1.6: AI Auto-Describe Profile
export async function autoDescribeProfile(name: string): Promise<{ ok: boolean; description?: string; message?: string }> {
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
}
