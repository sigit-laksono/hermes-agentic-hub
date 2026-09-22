/**
 * Autopilot (Cron Jobs) Types — Hermes Agentic Hub
 */

export interface AutopilotJob {
  id: string
  name: string
  assignee: string
  assigneeAvatar?: string
  trigger: string
  lastRun: string
  nextRun: string
  status: 'active' | 'paused'
}
