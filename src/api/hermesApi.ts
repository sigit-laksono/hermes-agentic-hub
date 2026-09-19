/// <reference types="vite/client" />
/**
 * Hermes Agent Live API Client
 * Communicates with the local Hermes harness bridge (http://127.0.0.1:9120)
 */

import { TaskStatus, AIAgent, AutopilotJob, Skill, Project } from '../types'

const API_BASE = import.meta.env.VITE_HERMES_API_URL || 'http://127.0.0.1:9120'

export const hermesApi = {
  // Check health
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/health`)
      return res.ok
    } catch {
      return false
    }
  },

  // 1. Kanban Board & Tasks
  async getBoard(): Promise<{ columns: { name: string; tasks: any[] }[]; assignees: any[] }> {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/board`)
    if (!res.ok) throw new Error(`Failed to fetch board: ${res.statusText}`)
    return res.json()
  },

  async createTask(params: {
    title: string
    body?: string
    assignee?: string
    priority?: number
    board?: string
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    if (!res.ok) throw new Error(`Failed to create task: ${res.statusText}`)
    return res.json()
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<any> {
    // Map status string to hermes canonical status
    const statusMap: Record<string, string> = {
      backlog: 'triage',
      todo: 'todo',
      in_progress: 'running',
      in_review: 'review',
      blocked: 'blocked',
      done: 'done'
    }

    const targetStatus = statusMap[status] || status
    const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus })
    })
    if (!res.ok) throw new Error(`Failed to update task: ${res.statusText}`)
    return res.json()
  },

  async getActiveWorkers(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/workers/active`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : data.workers || []
    } catch {
      return []
    }
  },

  // 2. Profiles (Agents & Squads)
  async getProfiles(): Promise<AIAgent[]> {
    try {
      const res = await fetch(`${API_BASE}/api/profiles`)
      if (!res.ok) return []
      const data = await res.json()
      const list = data.profiles || []

      return list.map((p: any) => ({
        id: p.name,
        name: p.name === 'sa-aws' ? 'AWS Solution Architect' : p.name === 'technical-writer' ? 'Technical Writer' : p.name,
        description: p.description || `Hermes Profile: ${p.name}`,
        status: p.gateway_running ? 'online' : 'offline',
        owner: 'Muhammad Sigit',
        access: 'Workspace',
        runtime: `${p.model} (${p.provider})`,
        lastActive: p.gateway_running ? 'Active now' : 'Idle',
        avatar: p.name.includes('aws') ? '⚡' : p.name.includes('writer') ? '📝' : '🤖'
      }))
    } catch {
      return []
    }
  },

  // 3. Autopilot (Hermes Cron Jobs)
  async getCronJobs(): Promise<AutopilotJob[]> {
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
  },

  // 4. Skills Catalog
  async getSkills(): Promise<Skill[]> {
    try {
      const res = await fetch(`${API_BASE}/api/skills`)
      if (!res.ok) return []
      const skills = await res.json()

      return skills.map((s: any, idx: number) => ({
        id: `sk-${idx + 1}`,
        name: s.name,
        usedBy: 'All Agents',
        addedBy: 'System',
        updatedAt: 'Installed'
      }))
    } catch {
      return []
    }
  },

  // 5. Boards (Projects)
  async getBoards(): Promise<Project[]> {
    try {
      const res = await fetch(`${API_BASE}/api/plugins/kanban/boards`)
      if (!res.ok) return []
      const data = await res.json()
      const boards = data.boards || []

      return boards.map((b: any) => ({
        id: b.slug,
        name: b.name || b.slug,
        status: 'active',
        priority: 'medium',
        progressDone: b.counts?.done || 0,
        progressTotal: b.counts?.total || 1,
        lead: 'Muhammad Sigit',
        leadAvatar: '👤',
        createdAt: 'Active',
        description: b.description || `Board ${b.slug}`
      }))
    } catch {
      return []
    }
  }
}
