/**
 * Common / Shared Types — Hermes Agentic Hub
 */

export type TaskStatus =
  | 'triage'
  | 'todo'
  | 'scheduled'
  | 'ready'
  | 'running'
  | 'blocked'
  | 'review'
  | 'done'
  | 'archived'

export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none'

export type ViewTab =
  | 'my_issues'
  | 'inbox'
  | 'chat'
  | 'issues'
  | 'projects'
  | 'autopilot'
  | 'agents'
  | 'squads'
  | 'skills'
  | 'settings'

export function formatDisplayId(id?: string, displayId?: string): string {
  if (displayId) return displayId
  if (!id) return ''
  if (id.startsWith('t_')) return `#${id.slice(2, 9)}`
  return id
}
