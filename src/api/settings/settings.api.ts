/**
 * Settings & System Configuration API — Hermes Agentic Hub
 *
 * Provides API methods for the Settings Hub (v0.1.2):
 *   - Config management (config.yaml read/write)
 *   - Environment variable management (.env read/write/reveal)
 *   - System status & stats (gateway, health)
 *   - Messaging platform status
 *   - Custom endpoint providers
 *
 * All methods preserve defensive error-handling:
 *   - Read methods return empty defaults on failure
 *   - Write methods return boolean success
 */

import { API_BASE } from '../client'

// ─── Config ──────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<Record<string, any>> {
  try {
    const res = await fetch(`${API_BASE}/api/config`)
    if (!res.ok) return {}
    return res.json()
  } catch {
    return {}
  }
}

export async function getConfigSchema(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/config/schema`)
    if (!res.ok) return {}
    return res.json()
  } catch {
    return {}
  }
}

export async function getConfigDefaults(): Promise<Record<string, any>> {
  try {
    const res = await fetch(`${API_BASE}/api/config/defaults`)
    if (!res.ok) return {}
    return res.json()
  } catch {
    return {}
  }
}

export async function updateConfig(data: Record<string, any>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Environment Variables ───────────────────────────────────────────────────

export async function getEnvVars(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/env`)
    if (!res.ok) return { vars: [] }
    return res.json()
  } catch {
    return { vars: [] }
  }
}

export async function updateEnvVar(key: string, value: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/env`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteEnvVar(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/env`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    })
    return res.ok
  } catch {
    return false
  }
}

export async function revealEnvVar(key: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/env/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.value ?? ''
  } catch {
    return ''
  }
}

// ─── System Status & Stats ──────────────────────────────────────────────────

export async function getSystemStatus(): Promise<Record<string, any>> {
  try {
    const res = await fetch(`${API_BASE}/api/status`)
    if (!res.ok) return {}
    return res.json()
  } catch {
    return {}
  }
}

export async function getSystemStats(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/system/stats`)
    if (!res.ok) return {}
    return res.json()
  } catch {
    return {}
  }
}

// ─── Gateway & Messaging Platforms ───────────────────────────────────────────

export async function getMessagingPlatforms(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/api/messaging/platforms`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.platforms ?? []
  } catch {
    return []
  }
}

// ─── Custom Endpoint Providers ───────────────────────────────────────────────

export async function getCustomEndpoints(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/api/providers/custom-endpoints`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.endpoints ?? []
  } catch {
    return []
  }
}
