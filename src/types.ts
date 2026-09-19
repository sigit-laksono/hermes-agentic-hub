export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done'

export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none'

export interface Task {
  id: string              // e.g. "DIK-55"
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  assigneeType: 'member' | 'agent'
  assigneeName: string
  assigneeAvatar?: string
  projectName: string
  projectTag?: string
  updatedAt: string
  reviewReport?: string
}

export interface Project {
  id: string
  name: string
  status: 'planned' | 'active' | 'paused'
  priority: Priority
  progressDone: number
  progressTotal: number
  lead: string
  leadAvatar?: string
  createdAt: string
  description?: string
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
  description: string
  status: 'online' | 'busy' | 'offline'
  owner: string
  access: string
  runtime: string
  lastActive: string
  avatar?: string
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
  | 'runtimes'
  | 'analytics'
  | 'settings'
