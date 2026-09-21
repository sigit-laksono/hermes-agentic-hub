/**
 * Kanban & Work Management Types — Hermes Agentic Hub
 */

import { TaskStatus, Priority } from './common.types'

export interface TaskAttachment {
  id: number
  task_id: string
  filename: string
  content_type: string
  size: number
  uploaded_by: string
  stored_path?: string
  created_at: number
}

export interface WorkerProcessInfo {
  run_id: number
  alive: boolean
  pid: number
  cpu_percent?: number | null
  memory_rss_bytes?: number | null
  memory_vms_bytes?: number | null
  num_threads?: number | null
  num_fds?: number | null
  status?: string
  create_time?: number
  cmdline?: string[]
  reason?: string
  error?: string
}

export interface ActiveWorker {
  run_id: number
  task_id: string
  task_title?: string
  task_status?: string
  task_assignee?: string
  profile?: string
  worker_pid?: number
  started_at?: number
  claim_lock?: string
  claim_expires?: number
  last_heartbeat_at?: number
  max_runtime_seconds?: number
}

export interface TaskComment {
  id?: number | string
  author: string
  authorAvatar?: string
  authorRole?: string
  body: string
  created_at?: number | string
}

export interface TaskActivity {
  id?: number | string
  actor: string
  actorAvatar?: string
  action: string
  created_at: string
}

export interface TaskRun {
  id: number
  task_id: string
  profile: string
  step_key?: string
  status: string
  worker_pid?: number
  started_at?: number
  ended_at?: number | null
  outcome?: string | null
  summary?: string | null
  error?: string | null
  duration?: string
  tokens?: string
  cost?: string
  steps?: {
    time: string
    tool: string
    detail: string
    duration: string
  }[]
}

export interface TaskEstimateResult {
  ok: boolean
  est_tokens?: number
  complexity?: 'S' | 'M' | 'L' | 'low' | 'medium' | 'high'
  rationale?: string
  model?: string
  reason?: string
}

export interface TaskLinkItem {
  id: string
  title: string
  status: string
  assignee?: string
}

export interface TaskLinksInfo {
  task_id?: string
  parents: TaskLinkItem[]
  children: TaskLinkItem[]
  subtasks?: TaskLinkItem[]
  blocked_by_active?: boolean
}

export interface TaskDetailsResponse {
  task: any
  comments?: any[]
  events?: any[]
  attachments?: TaskAttachment[]
  links?: Record<string, any>
  child_results?: any[]
  runs?: TaskRun[]
  estimate?: TaskEstimateResult
}

export interface BoardStats {
  total?: number
  byStatus?: Record<string, number>
  byAssignee?: Record<string, number>
  activeWorkers?: number
  oldestReadyAgeSeconds?: number
  /** Derived client-side from oldestReadyAgeSeconds; GET /stats reports only the age. */
  oldestReadyAgeFormatted?: string
}

export interface KanbanConfig {
  default_tenant?: string
  lane_by_profile?: boolean
  include_archived_by_default?: boolean
  render_markdown?: boolean
  [key: string]: any
}

export interface HomeChannel {
  platform: string
  label: string
  enabled: boolean
  subscribed?: boolean
}

export interface Task {
  id: string              // Hermes canonical id (e.g. "t_663b67ed") or mock id
  rawId?: string          // canonical Hermes id (e.g. "t_663b67ed") — present only for live tasks
  displayId?: string      // Human-friendly short display ID (e.g. "#663b67e" or "DIK-55")
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  assigneeType: 'member' | 'agent'
  assigneeName: string
  assigneeProfile?: string
  assigneeAvatar?: string
  projectName: string
  projectTag?: string
  boardSlug?: string
  updatedAt: string
  reviewReport?: string
  currentRunId?: number
  attachments?: TaskAttachment[]
  comments?: TaskComment[]
  activities?: TaskActivity[]
  runs?: TaskRun[]
  subtasksCount?: { done: number; total: number }
  isBlocked?: boolean
  blockedBy?: string[]
  estimate?: TaskEstimateResult
  linkCounts?: { parents: number; children: number }
  diagnostics?: { kind: string; severity: 'warning' | 'error' | 'critical'; message: string }[]
  warnings?: string[]
  executionMetrics?: {
    tokens?: string
    cost?: string
    duration?: string
    producedFiles?: number
    producedCommands?: number
  }
}

export interface Board {
  slug: string
  id?: string
  name: string
  description?: string
  icon?: string
  color?: string
  is_current?: boolean
  counts?: Record<string, number>
  total?: number
  default_workdir?: string
  default_workspace_kind?: string
  project_id?: string
  project_name?: string
  created_at?: number
  updated_at?: number
}

export interface Project {
  id: string
  slug?: string
  name: string
  status: 'planned' | 'active' | 'paused'
  priority: Priority
  progressDone: number
  progressTotal: number
  lead: string
  leadAvatar?: string
  createdAt: string
  description?: string
  default_workdir?: string
  is_current?: boolean
  counts?: Record<string, number>
  total?: number
}
