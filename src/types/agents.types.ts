/**
 * Agents, Skills & Squads Fleet Types — Hermes Agentic Hub
 */

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
