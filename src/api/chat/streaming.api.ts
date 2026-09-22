/**
 * Chat Streaming API — Hermes Agentic Hub
 * Real-time chat streaming via SSE (primary) and WebSocket (auxiliary).
 */

import { API_BASE } from '../client'
import {
  ToolCall,
  ChatConnectionState,
  ChatMeteringData,
  PendingApproval,
  PendingClarify
} from '../../types'
import { cancelChatTurn, respondApproval, respondClarify } from './sessions.api'

export interface ChatSocketHandlers {
  onReady?: () => void
  onToken?: (token: string) => void
  onThinking?: (thinking: string) => void
  onToolStart?: (tool: ToolCall) => void
  onToolEnd?: (tool: ToolCall) => void
  onApproval?: (approval: PendingApproval) => void
  onClarify?: (clarify: PendingClarify) => void
  onMetering?: (metering: ChatMeteringData) => void
  onComplete?: (message: { text: string; reasoning?: string; usage?: any }) => void
  onError?: (error: string) => void
  onTitleChange?: (title: string) => void
  onStatusChange?: (status: ChatConnectionState) => void
}

export interface ChatSocketController {
  sendMessage: (
    text: string,
    attachments?: Array<{ name: string; dataUrl?: string; isImage?: boolean; textContent?: string }>
  ) => void | Promise<void>
  interrupt: () => void | Promise<void>
  close: () => void
  getStreamId?: () => string | null
  transport?: 'sse' | 'ws'
  respondApproval?: (
    approvalId: string,
    choice: 'once' | 'session' | 'always' | 'deny' | 'allow',
    yolo?: boolean
  ) => void | Promise<any>
  respondClarify?: (clarifyId: string, response: string) => void | Promise<any>
}

// Native Server-Sent Events (SSE) streaming chat client (Fase 1: TASK-CHAT-1.1 & TASK-CHAT-1.3)
export function connectChatStream(
  sessionId: string,
  profile: string,
  handlers: ChatSocketHandlers
): ChatSocketController {
  let closed = false
  let activeStreamId: string | null = null
  let abortController: AbortController | null = null
  let lastEventId = ''

  // Signal connected and ready for HTTP/SSE
  handlers.onStatusChange?.('connected')
  handlers.onReady?.()

  const parseSseChunk = (
    block: string
  ): { event: string; data: string; id?: string } | null => {
    const lines = block.split(/\r?\n/)
    let event = 'message'
    const dataLines: string[] = []
    let id: string | undefined = undefined

    for (const line of lines) {
      if (!line || line.startsWith(':')) continue
      if (line.startsWith('event:')) {
        event = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      } else if (line.startsWith('id:')) {
        id = line.slice(3).trim()
      }
    }

    if (dataLines.length === 0 && event === 'message') {
      return null
    }

    return { event, data: dataLines.join('\n'), id }
  }

  const consumeSseStream = async (streamId: string, reconnectAttempts = 0) => {
    if (closed) return
    abortController = new AbortController()

    try {
      const params = new URLSearchParams({
        session_id: sessionId,
        stream_id: streamId
      })
      if (lastEventId) {
        params.set('after_event_id', lastEventId)
      }

      const streamUrl = `${API_BASE}/api/chat/stream?${params.toString()}`
      const res = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream'
        },
        signal: abortController.signal
      })

      if (!res.ok) {
        throw new Error(`SSE stream failed with status ${res.status}: ${res.statusText}`)
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported or empty body in response')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let terminalReached = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split(/\r?\n\r?\n/)
        buffer = blocks.pop() || ''

        for (const block of blocks) {
          if (!block.trim()) continue
          const parsed = parseSseChunk(block)
          if (!parsed) continue

          if (parsed.id) {
            lastEventId = parsed.id
          }

          let d: any = {}
          try {
            d = JSON.parse(parsed.data)
          } catch {
            d = { text: parsed.data }
          }

          // Update lastEventId if passed inside payload
          if (d?.event_id || d?.seq) {
            lastEventId = String(d.event_id || d.seq)
          }

          switch (parsed.event) {
            case 'token': {
              const tokenText = d?.text ?? d?.delta ?? ''
              if (tokenText) {
                handlers.onToken?.(tokenText)
              }
              break
            }

            case 'reasoning': {
              const thoughtText = d?.text ?? d?.reasoning ?? ''
              if (thoughtText) {
                handlers.onThinking?.(thoughtText)
              }
              break
            }

            case 'tool':
            case 'tool_start': {
              handlers.onToolStart?.({
                id: d?.id || d?.tool_call_id || String(Date.now()),
                name: d?.name || d?.tool_name || 'tool',
                args: d?.args || {},
                status: 'running',
                started_at: Date.now()
              })
              break
            }

            case 'tool_complete': {
              let rawOutput = d?.output ?? d?.result ?? d?.summary ?? ''
              if (typeof rawOutput !== 'string') {
                try {
                  rawOutput = JSON.stringify(rawOutput, null, 2)
                } catch {
                  rawOutput = String(rawOutput)
                }
              }
              const isError = Boolean(d?.is_error || d?.error)
              handlers.onToolEnd?.({
                id: d?.id || d?.tool_call_id || '',
                name: d?.name || d?.tool_name || 'tool',
                output: rawOutput,
                summary: d?.summary || '',
                status: isError ? 'failed' : 'completed',
                is_error: isError,
                duration_seconds: typeof d?.duration_seconds === 'number' ? d.duration_seconds : undefined,
                completed_at: Date.now()
              })
              break
            }

            case 'approval': {
              handlers.onApproval?.({
                id: d?.id || d?.approval_id || String(Date.now()),
                approval_id: d?.approval_id || d?.id,
                tool_name: d?.name || d?.tool_name || 'tool',
                description: d?.description || '',
                args: d?.args || {},
                danger_level: d?.danger_level || 'medium',
                pending_count: d?.pending_count || 1
              })
              break
            }

            case 'clarify': {
              handlers.onClarify?.({
                clarify_id: d?.clarify_id || d?.id || '',
                question: d?.question || '',
                options: Array.isArray(d?.options) ? d.options : [],
                allow_custom: d?.allow_custom !== false
              })
              break
            }

            case 'metering': {
              handlers.onMetering?.({
                tps: typeof d?.tps === 'number' ? d.tps : undefined,
                input_tokens: typeof d?.input_tokens === 'number' ? d.input_tokens : undefined,
                output_tokens: typeof d?.output_tokens === 'number' ? d.output_tokens : undefined,
                estimated_cost: typeof d?.estimated_cost === 'number' ? d.estimated_cost : undefined,
                turn_cache_hit_percent: typeof d?.turn_cache_hit_percent === 'number' ? d.turn_cache_hit_percent : undefined,
                duration_seconds: typeof d?.duration_seconds === 'number' ? d.duration_seconds : undefined,
                context_length: typeof d?.context_length === 'number' ? d.context_length : undefined,
                threshold_tokens: typeof d?.threshold_tokens === 'number' ? d.threshold_tokens : undefined
              })
              break
            }

            case 'title': {
              if (d?.title) {
                handlers.onTitleChange?.(d.title)
              }
              break
            }

            case 'done': {
              terminalReached = true
              handlers.onStatusChange?.('connected')
              handlers.onComplete?.({
                text: d?.text || '',
                reasoning: d?.reasoning || '',
                usage: d?.usage
              })
              break
            }

            case 'cancel': {
              terminalReached = true
              handlers.onStatusChange?.('connected')
              break
            }

            case 'apperror':
            case 'error': {
              terminalReached = true
              const errMsg = d?.message || d?.error || 'Hermes streaming error'
              handlers.onError?.(errMsg)
              handlers.onStatusChange?.('error')
              break
            }
          }
        }
      }

      // Handle premature disconnect & Stream Resiliency Cursor Reconnect (TASK-CHAT-1.3)
      if (!terminalReached && !closed && reconnectAttempts < 3) {
        const delayMs = Math.min(600 * Math.pow(2, reconnectAttempts), 3000)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        if (!closed) {
          await consumeSseStream(streamId, reconnectAttempts + 1)
        }
      } else if (!terminalReached && !closed) {
        handlers.onStatusChange?.('connected')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Normal interruption by user
        return
      }

      // Try reconnect if within limit
      if (!closed && reconnectAttempts < 3) {
        const delayMs = Math.min(800 * Math.pow(2, reconnectAttempts), 4000)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        if (!closed) {
          return consumeSseStream(streamId, reconnectAttempts + 1)
        }
      }

      handlers.onError?.(err?.message || 'SSE connection failed')
      handlers.onStatusChange?.('connected')
    }
  }

  return {
    transport: 'sse',
    getStreamId: () => activeStreamId,
    sendMessage: async (
      text: string,
      attachments?: Array<{ name: string; dataUrl?: string; isImage?: boolean; textContent?: string }>
    ) => {
      handlers.onStatusChange?.('streaming')

      // Build attachments payload
      const attachmentNames: string[] = []
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          attachmentNames.push(att.name)
        }
      }

      try {
        const res = await fetch(`${API_BASE}/api/chat/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            message: text || 'Please inspect the attached files.',
            profile: profile && profile !== 'default' ? profile : undefined,
            attachments: attachmentNames
          })
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          const errorMsg = errData.detail || errData.error || res.statusText
          handlers.onError?.(errorMsg)
          handlers.onStatusChange?.('error')
          return
        }

        const startData = await res.json()
        const streamId = startData.stream_id || startData.streamId || startData.id
        if (!streamId) {
          throw new Error('Backend did not return a valid stream_id')
        }

        activeStreamId = streamId
        lastEventId = ''

        // Start consuming SSE stream
        await consumeSseStream(streamId, 0)
      } catch (err: any) {
        handlers.onError?.(err?.message || 'Failed to start chat stream')
        handlers.onStatusChange?.('connected')
      }
    },
    interrupt: async () => {
      if (abortController) {
        abortController.abort()
        abortController = null
      }
      if (activeStreamId) {
        const sid = activeStreamId
        activeStreamId = null
        await cancelChatTurn(sid, sessionId)
      }
      handlers.onStatusChange?.('connected')
    },
    respondApproval: async (approvalId, choice = 'once', yolo = false) => {
      return respondApproval(sessionId, approvalId, choice, yolo)
    },
    respondClarify: async (clarifyId, response) => {
      return respondClarify(sessionId, clarifyId, response)
    },
    close: () => {
      closed = true
      if (abortController) {
        abortController.abort()
        abortController = null
      }
      activeStreamId = null
      handlers.onStatusChange?.('disconnected')
    }
  }
}

// Interactive Live Chat via WebSocket connection (Auxiliary / Gateway connection)
export function connectChatWS(
  sessionId: string,
  profile: string,
  handlers: ChatSocketHandlers
): ChatSocketController {
  let socket: WebSocket | null = null
  let closed = false
  let runtimeSessionId: string = sessionId
  let reqCounter = 1
  let isGatewayReady = false
  const pendingQueue: Array<() => void> = []

  const wsBase = () => {
    if (API_BASE) return API_BASE.replace(/^http/, 'ws')
    if (typeof window !== 'undefined') {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      return `${proto}://${window.location.host}`
    }
    return 'ws://127.0.0.1:9120'
  }

  const fetchToken = async (): Promise<string> => {
    try {
      const res = await fetch(`${API_BASE}/api/ws-token`)
      if (!res.ok) return ''
      const data = await res.json()
      return data.token || ''
    } catch {
      return ''
    }
  }

  const pendingRpcs = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>()

  const sendRpc = (method: string, params: Record<string, any>) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pendingQueue.push(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          const id = ++reqCounter
          socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
        }
      })
      return
    }
    const id = ++reqCounter
    socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
    return id
  }

  const sendRpcAsync = (method: string, params: Record<string, any>, timeoutMs = 6000): Promise<any> => {
    return new Promise((resolve) => {
      const execute = () => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          return resolve(null)
        }
        const id = ++reqCounter
        const timer = setTimeout(() => {
          pendingRpcs.delete(id)
          resolve(null)
        }, timeoutMs)
        pendingRpcs.set(id, {
          resolve: (val) => {
            clearTimeout(timer)
            resolve(val)
          },
          reject: () => {
            clearTimeout(timer)
            resolve(null)
          }
        })
        socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
      }

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        pendingQueue.push(execute)
      } else {
        execute()
      }
    })
  }

  const initConnection = async () => {
    handlers.onStatusChange?.('connecting')
    const token = await fetchToken()
    if (closed) return

    const profileParam = profile && profile !== 'default' ? `&profile=${encodeURIComponent(profile)}` : ''
    const url = `${wsBase()}/api/chat/ws?token=${encodeURIComponent(token)}${profileParam}`
    socket = new WebSocket(url)

    socket.onopen = () => {
      // Connected to websocket gateway
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (!data) return

        // Handle RPC responses
        if (data.id) {
          if (pendingRpcs.has(data.id)) {
            const p = pendingRpcs.get(data.id)!
            pendingRpcs.delete(data.id)
            if (data.error) {
              p.reject(new Error(data.error.message || 'RPC error'))
            } else {
              p.resolve(data.result)
            }
          }

          if (data.result && data.result.session_id) {
            runtimeSessionId = data.result.session_id
          }
        }

        // Handle Gateway Ready
        if (data.method === 'event' && data.params?.type === 'gateway.ready') {
          isGatewayReady = true
          handlers.onStatusChange?.('connected')
          handlers.onReady?.()

          // Try to resume existing session or create session
          if (sessionId) {
            sendRpcAsync('session.resume', {
              session_id: sessionId,
              profile: profile || undefined
            }).then((res) => {
              if (res && res.session_id) {
                runtimeSessionId = res.session_id
              } else {
                // If session not found in state.db, create fresh session
                sendRpcAsync('session.create', {
                  profile: profile || 'default',
                  title: 'New Chat'
                }).then((createRes) => {
                  if (createRes && createRes.session_id) {
                    runtimeSessionId = createRes.session_id
                  }
                })
              }
            }).catch(() => {
              sendRpcAsync('session.create', {
                profile: profile || 'default',
                title: 'New Chat'
              })
            })
          } else {
            sendRpcAsync('session.create', {
              profile: profile || 'default',
              title: 'New Chat'
            }).then((createRes) => {
              if (createRes && createRes.session_id) {
                runtimeSessionId = createRes.session_id
              }
            })
          }

          // Drain any pending sends that occurred before gateway.ready
          setTimeout(() => {
            while (pendingQueue.length > 0) {
              const fn = pendingQueue.shift()
              try {
                fn?.()
              } catch (err) {
                console.warn('Queue flush error:', err)
              }
            }
          }, 50)
        }

        // Handle Events
        if (data.method === 'event' && data.params) {
          const { type, payload } = data.params

          switch (type) {
            case 'message.start':
              handlers.onStatusChange?.('streaming')
              break

            case 'thinking.delta':
            case 'reasoning.delta':
              if (payload?.text) {
                handlers.onThinking?.(payload.text)
              }
              break

            case 'message.delta': {
              const text = payload?.text ?? payload?.delta ?? ''
              if (text) {
                handlers.onToken?.(text)
              }
              break
            }

            case 'tool.generating':
            case 'tool.start':
              handlers.onToolStart?.({
                id: payload?.id || String(Date.now()),
                name: payload?.name || 'tool',
                args: payload?.args || {},
                status: 'running',
                started_at: Date.now()
              })
              break

            case 'tool.complete': {
              let rawOutput = payload?.output ?? payload?.result ?? payload?.summary ?? ''
              if (typeof rawOutput !== 'string') {
                try {
                  rawOutput = JSON.stringify(rawOutput, null, 2)
                } catch {
                  rawOutput = String(rawOutput)
                }
              }
              handlers.onToolEnd?.({
                id: payload?.id || '',
                name: payload?.name || 'tool',
                output: rawOutput,
                summary: payload?.summary || '',
                status: payload?.is_error ? 'failed' : 'completed',
                is_error: Boolean(payload?.is_error),
                duration_seconds: typeof payload?.duration_seconds === 'number' ? payload.duration_seconds : undefined
              })
              break
            }

            case 'message.complete':
              handlers.onStatusChange?.('connected')
              handlers.onComplete?.({
                text: payload?.text || '',
                reasoning: payload?.reasoning || '',
                usage: payload?.usage
              })
              break

            case 'session.title':
              if (payload?.title) {
                handlers.onTitleChange?.(payload.title)
              }
              break

            case 'approval':
            case 'tool.approval_request':
            case 'approval.request': {
              handlers.onApproval?.({
                id: payload?.id || payload?.approval_id || String(Date.now()),
                approval_id: payload?.approval_id || payload?.id,
                tool_name: payload?.name || payload?.tool_name || payload?.tool || 'tool',
                description: payload?.description || '',
                args: payload?.args || payload?.parameters || {},
                danger_level: payload?.danger_level || 'medium',
                pending_count: payload?.pending_count || 1
              })
              break
            }

            case 'clarify':
            case 'clarify.request':
            case 'agent.clarify': {
              handlers.onClarify?.({
                clarify_id: payload?.clarify_id || payload?.id || '',
                question: payload?.question || '',
                options: Array.isArray(payload?.options) ? payload.options : [],
                allow_custom: payload?.allow_custom !== false
              })
              break
            }

            case 'metering': {
              handlers.onMetering?.(payload)
              break
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse chat WS frame:', e)
      }
    }

    socket.onerror = () => {
      handlers.onStatusChange?.('error')
      handlers.onError?.('WebSocket error')
    }

    socket.onclose = () => {
      if (!closed) {
        handlers.onStatusChange?.('disconnected')
      }
    }
  }

  initConnection()

  return {
    transport: 'ws',
    sendMessage: async (
      text: string,
      attachments?: Array<{ name: string; dataUrl?: string; isImage?: boolean; textContent?: string }>
    ) => {
      const doSend = async () => {
        const sid = runtimeSessionId || sessionId
        handlers.onStatusChange?.('streaming')

        // 1. Attach any images/files first via Hermes JSON-RPC
        if (attachments && attachments.length > 0) {
          for (const att of attachments) {
            if (att.isImage && att.dataUrl) {
              try {
                await sendRpcAsync('image.attach_bytes', {
                  session_id: sid,
                  content_base64: att.dataUrl,
                  filename: att.name
                })
              } catch (e) {
                console.warn('Failed to attach image to Hermes session:', e)
              }
            } else if (!att.isImage && att.dataUrl) {
              try {
                await sendRpcAsync('file.attach', {
                  session_id: sid,
                  name: att.name,
                  data_url: att.dataUrl
                })
              } catch (e) {
                console.warn('Failed to attach file to Hermes session:', e)
              }
            }
          }
        }

        // 2. Submit prompt to Hermes
        sendRpc('prompt.submit', {
          session_id: sid,
          text: text || 'Please inspect the attached file or image.'
        })
      }

      if (!socket || socket.readyState !== WebSocket.OPEN || !isGatewayReady) {
        pendingQueue.push(doSend)
      } else {
        await doSend()
      }
    },
    interrupt: () => {
      sendRpc('session.interrupt', {
        session_id: runtimeSessionId || sessionId
      })
      handlers.onStatusChange?.('connected')
    },
    respondApproval: async (approvalId, choice = 'once', yolo = false) => {
      const normalizedChoice = choice === 'allow' ? 'once' : choice
      sendRpc('approval.respond', {
        session_id: runtimeSessionId || sessionId,
        approval_id: approvalId,
        choice: normalizedChoice,
        yolo
      })
      return respondApproval(runtimeSessionId || sessionId, approvalId, normalizedChoice, yolo)
    },
    respondClarify: async (clarifyId, response) => {
      sendRpc('clarify.respond', {
        session_id: runtimeSessionId || sessionId,
        clarify_id: clarifyId,
        response
      })
      return respondClarify(runtimeSessionId || sessionId, clarifyId, response)
    },
    close: () => {
      closed = true
      try {
        socket?.close()
      } catch {
        /* ignore */
      }
    }
  }
}

// Dual-Transport Live Chat Controller
// Connects immediately via WebSocket (hot gateway on port 9120) with automatic
// SSE streaming fallback/selection for endpoints that expose /api/chat/start
export function connectChat(
  sessionId: string,
  profile: string,
  handlers: ChatSocketHandlers
): ChatSocketController {
  return connectChatWS(sessionId, profile, handlers)
}
