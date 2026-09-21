/**
 * Skills API — Hermes Agentic Hub
 *
 * Extracted from hermesApi.ts Section 2 (profile-scoped skills) and Section 4
 * (global skills catalog) as part of the domain-based API refactoring (v0.1.1.2 TASK-2.2).
 */

import { API_BASE } from '../client'
import { Skill, SkillContent } from '../../types'

// ─── Per-Profile Skills ──────────────────────────────────────────────────────

export async function getProfileSkills(profileName: string): Promise<Skill[]> {
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
}

export async function toggleProfileSkill(profileName: string, skillName: string, enabled: boolean): Promise<boolean> {
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
}

export async function getSkillContent(skillName: string, profileName?: string): Promise<SkillContent | null> {
  try {
    const params = new URLSearchParams({ name: skillName })
    if (profileName) params.set('profile', profileName)
    const res = await fetch(`${API_BASE}/api/skills/content?${params.toString()}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function toggleSkill(skillName: string, enabled: boolean): Promise<boolean> {
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
}

// ─── Global Skills Catalog ───────────────────────────────────────────────────

export async function getSkills(): Promise<Skill[]> {
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
}

// TASK-1.3: Create a new custom skill
export async function createSkill(payload: {
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
}

// TASK-1.3: Update skill content (SKILL.md)
export async function updateSkillContent(name: string, content: string): Promise<boolean> {
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
}
