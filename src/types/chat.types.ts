/**
 * Chat & Streaming Types — Hermes Agentic Hub
 */

export interface ToolCall {
  id?: string
  name: string
  args?: any
  output?: string
  summary?: string
  status?: 'running' | 'completed' | 'error' | 'failed'
  started_at?: number
  completed_at?: number
  duration_seconds?: number
  is_error?: boolean
}

export interface ChatMeteringData {
  tps?: number
  input_tokens?: number
  output_tokens?: number
  estimated_cost?: number
  cache_read_tokens?: number
  cache_write_tokens?: number
  turn_cache_hit_percent?: number
  duration_seconds?: number
  context_length?: number
  threshold_tokens?: number
}

export interface PendingApproval {
  id: string
  approval_id?: string
  tool_name: string
  description?: string
  args?: any
  danger_level?: 'low' | 'medium' | 'high'
  pending_count?: number
  session_id?: string
  status?: 'pending' | 'approved' | 'denied'
  decision?: 'once' | 'session' | 'always' | 'deny'
  created_at?: number
}

export interface PendingClarify {
  clarify_id: string
  id?: string
  session_id?: string
  question: string
  options?: string[]
  allow_custom?: boolean
  selected_answer?: string
  status?: 'pending' | 'answered'
}

export interface ChatMessageAttachment {
  id: string
  name: string
  type: string
  size: number
  dataUrl?: string
  textContent?: string
  isImage: boolean
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
  attachments?: ChatMessageAttachment[]
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
  yolo_mode?: boolean
}

export type ChatConnectionState = 'connecting' | 'connected' | 'streaming' | 'error' | 'disconnected'
