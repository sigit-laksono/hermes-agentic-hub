export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done'

export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none'

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

export interface Task {
  id: string              // e.g. "DIK-55" (UI display id)
  rawId?: string          // canonical Hermes id (e.g. "t_663b67ed") — present only for live tasks
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

export interface AIAgent {
  id: string
  name: string
  displayName?: string
  description: string
  descriptionAuto?: boolean
  status: 'online' | 'busy' | 'offline'
  owner: string
  access: string
  runtime: string
  lastActive: string
  avatar?: string
  model?: string
  provider?: string
  path?: string
  isDefault?: boolean
  skillCount?: number
  gatewayRunning?: boolean
  workingDir?: string
}

export interface OrchestrationSettings {
  orchestrator_profile?: string
  default_assignee?: string
  auto_decompose?: boolean
  auto_promote_children?: boolean
  resolved_orchestrator_profile?: string
  resolved_default_assignee?: string
  active_profile?: string
}

export interface ModelOptionProvider {
  slug: string
  label: string
  models: string[]
}

export interface ModelOptionsResponse {
  providers: ModelOptionProvider[]
}

export interface SkillContent {
  name: string
  content: string
  path?: string
}

export interface CreateProfilePayload {
  name: string
  display_name?: string
  description?: string
  clone_from?: string
  clone_from_default?: boolean
  provider?: string
  model?: string
}

export interface Squad {
  id: string
  name: string
  description: string
  leader: string
  leaderAvatar?: string
  memberCount: number
  members: string[]
  createdBy: string
}

export interface Skill {
  id: string
  name: string
  description?: string
  category?: string
  enabled?: boolean
  usage?: number
  provenance?: string
  usedBy: string
  addedBy: string
  updatedAt: string
}

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

export interface ToolCall {
  id?: string
  name: string
  args?: any
  output?: string
  summary?: string
  status?: 'running' | 'completed' | 'error'
  started_at?: number
}

export interface ChatMessage {
  id?: string | number
  session_id?: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_name?: string
  tool_call_id?: string
  reasoning?: string
  timestamp?: number | string
  isStreaming?: boolean
}

export interface ChatSession {
  id: string
  title?: string
  model?: string
  profile?: string
  started_at?: number
  last_active?: number
  message_count?: number
  is_active?: boolean
  preview?: string
  unread?: boolean
}

export type ChatConnectionState = 'connecting' | 'connected' | 'streaming' | 'error' | 'disconnected'

