/**
 * Autopilot (Cron Jobs) API — Hermes Agentic Hub
 *
 * Extracted from the monolithic hermesApi.ts as the Phase 1 pilot of the
 * domain-based API refactoring (v0.1.1.2 TASK-1.1).
 *
 * All methods preserve their original error-handling behaviour exactly:
 *   - getCronJobs returns [] on failure
 *   - trigger/pause/resume/create/update/delete return boolean
 *   - getCronJobHistory returns { runs: [] } on failure
 */

import { API_BASE } from '../client'
import { AutopilotJob } from '../../types'

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getCronJobs(): Promise<AutopilotJob[]> {
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
}

export async function getCronJobHistory(jobId: string): Promise<{
  runs: Array<{
    id: string
    started_at: number
    ended_at?: number
    status: 'success' | 'failed' | 'running'
    duration_seconds?: number
    summary?: string
    error?: string
  }>
}> {
  try {
    const res = await fetch(`${API_BASE}/api/cron/jobs/${jobId}/history`)
    if (!res.ok) return { runs: [] }
    return res.json()
  } catch {
    return { runs: [] }
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

// Trigger a cron job to run immediately. The backend runs the job which may take a
// while, so we fire the request with a short client timeout and treat a timeout as
// "accepted" (the run continues server-side; the live poll will reflect last_run).
export async function triggerCronJob(jobId: string): Promise<boolean> {
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
}

export async function pauseCronJob(jobId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/cron/jobs/${jobId}/pause`, { method: 'POST' })
    return res.ok
  } catch {
    return false
  }
}

export async function resumeCronJob(jobId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/cron/jobs/${jobId}/resume`, { method: 'POST' })
    return res.ok
  } catch {
    return false
  }
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

// Create a new cron (autopilot) job. schedule is a cron expression string.
export async function createCronJob(params: {
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
}

// TASK-1.1: Update an existing cron job
export async function updateCronJob(jobId: string, params: {
  name?: string
  schedule?: string
  prompt?: string
  profile?: string
  enabled?: boolean
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/cron/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    return res.ok
  } catch {
    return false
  }
}

// TASK-1.1: Delete a cron job
export async function deleteCronJob(jobId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/cron/jobs/${jobId}`, {
      method: 'DELETE'
    })
    return res.ok
  } catch {
    return false
  }
}
