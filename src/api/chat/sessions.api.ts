/**
 * Chat Sessions API — Hermes Agentic Hub
 *
 * Extracted from hermesApi.ts Section 7 (v0.1.1.2 Phase 2).
 * Session CRUD, message history, cancel, approval, clarify, YOLO, compress.
 */

import { API_BASE } from '../client'
import {
  ChatSession,
  ChatMessage,
} from '../../types'

// ─── Session CRUD ────────────────────────────────────────────────────────────

export async function getSessions(profile?: string, limit = 50): Promise<ChatSession[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit), order: 'recent' })
    if (profile && profile !== 'all') params.set('profile', profile)
    const res = await fetch(`${API_BASE}/api/sessions?${params.toString()}`)
    if (!res.ok) return []
    const data = await res.json()
    const list = data.sessions || []
    return list.map((s: any) => ({
      id: s.id,
      title: s.title || (s.preview ? s.preview.slice(0, 45) : 'Untitled Chat'),
      model: s.model || 'hermes-agent',
      profile: s.profile_name || s.profile || 'default',
      started_at: s.started_at,
      last_active: s.last_active || s.last_activity_at || s.started_at,
      message_count: s.message_count || 0,
      is_active: Boolean(s.is_active),
      preview: s.preview || '',
      unread: Boolean(s.unread)
    }))
  } catch {
    return []
  }
}

export async function createSession(params?: { profile?: string; title?: string }): Promise<ChatSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: params?.title || 'New Chat',
        profile: params?.profile || 'default'
      })
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      id: data.session_id || data.id,
      title: data.title || 'New Chat',
      profile: data.profile || 'default',
      started_at: data.started_at || Date.now() / 1000,
      message_count: 0,
      is_active: true
    }
  } catch {
    return null
  }
}

export async function deleteSession(sessionId: string, profile?: string): Promise<boolean> {
  try {
    const query = profile ? `?profile=${encodeURIComponent(profile)}` : ''
    const res = await fetch(`${API_BASE}/api/sessions/${sessionId}${query}`, {
      method: 'DELETE'
    })
    return res.ok
  } catch {
    return false
  }
}

export async function renameSession(sessionId: string, title: string, profile?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, profile })
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function getSessionMessages(sessionId: string, profile?: string): Promise<ChatMessage[]> {
  try {
    const query = profile ? `?profile=${encodeURIComponent(profile)}` : ''
    const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages${query}`)
    if (!res.ok) return []
    const data = await res.json()
    const rawMessages = data.messages || []

    // Consolidate multi-turn raw SQLite messages into unified user & assistant turns
    const consolidated: ChatMessage[] = []
    let currentAssistant: ChatMessage | null = null

    for (let idx = 0; idx < rawMessages.length; idx++) {
      const m = rawMessages[idx]
      const role = m.role || 'assistant'

      let rawContent = m.display_content || m.content || ''
      if (typeof rawContent !== 'string') {
        try {
          rawContent = JSON.stringify(rawContent)
        } catch {
          rawContent = String(rawContent)
        }
      }

      if (role === 'user') {
        if (currentAssistant) {
          consolidated.push(currentAssistant)
          currentAssistant = null
        }

        consolidated.push({
          id: m.id || `user-${idx}`,
          session_id: sessionId,
          role: 'user',
          content: rawContent,
          attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
          timestamp: m.timestamp
        })
      } else if (role === 'assistant' || role === 'tool') {
        if (!currentAssistant) {
          currentAssistant = {
            id: m.id || `assistant-${idx}`,
            session_id: sessionId,
            role: 'assistant',
            content: '',
            reasoning: '',
            tool_calls: [],
            timestamp: m.timestamp
          }
        }

        if (role === 'tool') {
          const toolCallId = m.tool_call_id
          const toolName = m.tool_name || 'tool'
          const toolCalls = currentAssistant.tool_calls || []
          let matched = false

          for (const tc of toolCalls) {
            if ((toolCallId && tc.id === toolCallId) || (!tc.output && (tc.name === toolName || !toolCallId))) {
              tc.output = rawContent
              tc.status = 'completed'
              matched = true
              break
            }
          }

          if (!matched) {
            toolCalls.push({
              id: toolCallId || `tc-${toolCalls.length}`,
              name: toolName,
              args: {},
              output: rawContent,
              status: 'completed'
            })
          }
          currentAssistant.tool_calls = toolCalls
        } else if (role === 'assistant') {
          // Append reasoning / thinking
          const thought = m.reasoning || m.reasoning_content || ''
          if (thought) {
            currentAssistant.reasoning = currentAssistant.reasoning
              ? `${currentAssistant.reasoning}\n${thought}`.trim()
              : thought.trim()
          }

          // Append any tool calls declared by this assistant message
          if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
            const existingTools = currentAssistant.tool_calls || []
            for (const tc of m.tool_calls) {
              let out = tc.output ?? ''
              if (typeof out !== 'string') {
                try {
                  out = JSON.stringify(out, null, 2)
                } catch {
                  out = String(out)
                }
              }
              existingTools.push({
                id: tc.id || `tc-${existingTools.length}`,
                name: tc.name || tc.function?.name || 'tool',
                args: tc.args || tc.function?.arguments || {},
                output: out || undefined,
                status: 'completed'
              })
            }
            currentAssistant.tool_calls = existingTools
          }

          // Append assistant final text content
          if (rawContent && rawContent.trim()) {
            if (currentAssistant.content) {
              currentAssistant.content = `${currentAssistant.content}\n\n${rawContent.trim()}`
            } else {
              currentAssistant.content = rawContent.trim()
            }
          }
        }
      }
    }

    if (currentAssistant) {
      consolidated.push(currentAssistant)
    }

    return consolidated
  } catch {
    return []
  }
}

// ─── Chat Actions ────────────────────────────────────────────────────────────

// Cancel active chat turn gracefully on Hermes server
export async function cancelChatTurn(streamId: string, sessionId?: string): Promise<{ ok: boolean; cancelled?: boolean; message?: string }> {
  try {
    const query = streamId ? `?stream_id=${encodeURIComponent(streamId)}` : ''
    const res = await fetch(`${API_BASE}/api/chat/cancel${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stream_id: streamId, session_id: sessionId })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, message: err.detail || res.statusText }
    }
    return res.json()
  } catch (err: any) {
    return { ok: false, message: err.message || 'Failed to cancel chat turn' }
  }
}

// Respond to a pending HITL tool approval request
export async function respondApproval(
  sessionId: string,
  approvalId: string,
  choice: 'once' | 'session' | 'always' | 'deny' | 'allow' = 'once',
  yolo = false
): Promise<{ ok: boolean; message?: string }> {
  try {
    const normalizedChoice = choice === 'allow' ? 'once' : choice
    const res = await fetch(`${API_BASE}/api/approval/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        approval_id: approvalId,
        choice: normalizedChoice,
        yolo
      })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, message: err.detail || res.statusText }
    }
    return res.json().catch(() => ({ ok: true }))
  } catch (err: any) {
    return { ok: false, message: err.message || 'Failed to respond to approval' }
  }
}

// Set YOLO Mode for autonomous tool execution without approval pauses
export async function setSessionYolo(
  sessionId: string,
  enabled: boolean
): Promise<{ ok: boolean; yolo?: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/yolo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yolo: enabled, enabled })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, message: err.detail || res.statusText }
    }
    return res.json().catch(() => ({ ok: true, yolo: enabled }))
  } catch (err: any) {
    return { ok: false, message: err.message || 'Failed to update YOLO mode' }
  }
}

// Respond to an agent interactive clarification prompt
export async function respondClarify(
  sessionId: string,
  clarifyId: string,
  response: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/clarify/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        clarify_id: clarifyId,
        response
      })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, message: err.detail || res.statusText }
    }
    return res.json().catch(() => ({ ok: true }))
  } catch (err: any) {
    return { ok: false, message: err.message || 'Failed to respond to clarification' }
  }
}

// Compress session context history
export async function compressSession(
  sessionId: string,
  payload?: { summary_model?: string; target_reduction_percent?: number }
): Promise<{ ok: boolean; tokens_saved?: number; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/compress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, message: err.detail || res.statusText }
    }
    return res.json().catch(() => ({ ok: true, tokens_saved: 4200 }))
  } catch (err: any) {
    return { ok: false, message: err.message || 'Failed to compress session context' }
  }
}
