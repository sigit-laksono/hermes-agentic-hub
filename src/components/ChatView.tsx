import React, { useState, useEffect, useRef } from 'react'
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Send,
  StopCircle,
  Copy,
  Check,
  Sparkles,
  Terminal,
  FileCode,
  Globe,
  Code2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Edit2,
  CheckSquare,
  User,
  Cpu
} from 'lucide-react'
import {
  ChatMessage,
  ChatSession,
  ToolCall,
  ChatConnectionState,
  AIAgent
} from '../types'
import { hermesApi, ChatSocketController } from '../api/hermesApi'
import { MarkdownRenderer } from './MarkdownRenderer'

interface ChatViewProps {
  agents?: AIAgent[]
  onConvertToIssue?: (issueData: { title: string; description: string; assignee?: string }) => void
  initialProfile?: string
}

export const ChatView: React.FC<ChatViewProps> = ({
  agents = [],
  onConvertToIssue,
  initialProfile = 'default'
}) => {
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<string>(initialProfile)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputPrompt, setInputPrompt] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionState>('disconnected')
  const [searchFilter, setSearchFilter] = useState('')
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | number | null>(null)
  const [copiedToolId, setCopiedToolId] = useState<string | null>(null)
  const [collapsedTools, setCollapsedTools] = useState<Record<string, boolean>>({})
  const [collapsedReasoning, setCollapsedReasoning] = useState<Record<string, boolean>>({})

  // Refs
  const chatControllerRef = useRef<ChatSocketController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const currentSessionIdRef = useRef<string | null>(null)
  const streamingMessageRef = useRef<ChatMessage | null>(null)

  // Auto scroll to bottom of messages
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  // Load Sessions on Mount
  const loadSessions = async (selectFirst = true) => {
    setIsLoadingSessions(true)
    try {
      const data = await hermesApi.getSessions()
      setSessions(data)
      if (selectFirst && data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  useEffect(() => {
    loadSessions(true)
  }, [])

  // Handle Switch Profile (switches to existing session or creates fresh session for that profile)
  const handleSwitchProfile = async (newProfile: string) => {
    setSelectedProfile(newProfile)
    // 1. Check if an active/existing session belongs to this profile
    const existing = sessions.find((s) => s.profile === newProfile)
    if (existing) {
      setActiveSessionId(existing.id)
    } else {
      // 2. Automatically create a fresh session for this profile!
      const agentObj = agents.find((a) => a.id === newProfile)
      const agentTitle = agentObj?.displayName || agentObj?.name || newProfile
      try {
        const created = await hermesApi.createSession({
          profile: newProfile,
          title: `New ${agentTitle} Conversation`
        })
        if (created) {
          setSessions((prev) => [created, ...prev])
          setActiveSessionId(created.id)
          setMessages([])
          setStreamingMessage(null)
        }
      } catch (err) {
        console.error('Failed to create session for profile:', newProfile, err)
      }
    }
  }

  // React to initialProfile prop changes
  useEffect(() => {
    if (initialProfile && initialProfile !== selectedProfile) {
      handleSwitchProfile(initialProfile)
    }
  }, [initialProfile])

  // Sync selectedProfile with active session profile if available
  useEffect(() => {
    if (activeSessionId) {
      const current = sessions.find(s => s.id === activeSessionId)
      if (current?.profile && current.profile !== selectedProfile) {
        setSelectedProfile(current.profile)
      }
    }
  }, [activeSessionId, sessions])

  // Connect to Active Session & Load Messages
  useEffect(() => {
    if (!activeSessionId) return
    currentSessionIdRef.current = activeSessionId

    const currentSession = sessions.find(s => s.id === activeSessionId)
    const profileToUse = currentSession?.profile || selectedProfile

    // 1. Cleanup existing connection
    if (chatControllerRef.current) {
      chatControllerRef.current.close()
      chatControllerRef.current = null
    }

    setStreamingMessage(null)

    // 2. Load historical messages for this session
    let isCancelled = false
    setIsLoadingMessages(true)

    hermesApi.getSessionMessages(activeSessionId, profileToUse)
      .then((history) => {
        if (!isCancelled) {
          setMessages(history)
          setIsLoadingMessages(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load session messages:', err)
        if (!isCancelled) {
          setMessages([])
          setIsLoadingMessages(false)
        }
      })

    // 3. Open WebSocket for interactive chat with Hermes
    const controller = hermesApi.connectChat(activeSessionId, profileToUse, {
      onStatusChange: (status) => {
        if (currentSessionIdRef.current === activeSessionId) {
          setConnectionStatus(status)
        }
      },
      onReady: () => {
        if (currentSessionIdRef.current === activeSessionId) {
          setConnectionStatus('connected')
        }
      },
      onToken: (token) => {
        if (currentSessionIdRef.current !== activeSessionId) return

        setStreamingMessage((prev) => {
          const next: ChatMessage = !prev ? {
            id: `streaming-${Date.now()}`,
            session_id: activeSessionId,
            role: 'assistant',
            content: token,
            isStreaming: true,
            timestamp: Date.now() / 1000
          } : {
            ...prev,
            content: prev.content + token,
            isStreaming: true
          }
          streamingMessageRef.current = next
          return next
        })
      },
      onThinking: (thinking) => {
        if (currentSessionIdRef.current !== activeSessionId) return

        setStreamingMessage((prev) => {
          const next: ChatMessage = !prev ? {
            id: `streaming-${Date.now()}`,
            session_id: activeSessionId,
            role: 'assistant',
            content: '',
            reasoning: thinking,
            isStreaming: true,
            timestamp: Date.now() / 1000
          } : {
            ...prev,
            reasoning: (prev.reasoning || '') + thinking
          }
          streamingMessageRef.current = next
          return next
        })
      },
      onToolStart: (tool) => {
        if (currentSessionIdRef.current !== activeSessionId) return

        setStreamingMessage((prev) => {
          const currentTools = prev?.tool_calls || []
          const existingIdx = currentTools.findIndex(t => t.id === tool.id)
          let updated: ToolCall[]

          if (existingIdx >= 0) {
            updated = [...currentTools]
            updated[existingIdx] = { ...updated[existingIdx], ...tool, status: 'running' }
          } else {
            updated = [...currentTools, { ...tool, status: 'running' }]
          }

          const next: ChatMessage = !prev ? {
            id: `streaming-${Date.now()}`,
            session_id: activeSessionId,
            role: 'assistant',
            content: '',
            tool_calls: updated,
            isStreaming: true,
            timestamp: Date.now() / 1000
          } : {
            ...prev,
            tool_calls: updated
          }
          streamingMessageRef.current = next
          return next
        })
      },
      onToolEnd: (tool) => {
        if (currentSessionIdRef.current !== activeSessionId) return

        setStreamingMessage((prev) => {
          if (!prev) return null
          const currentTools = prev.tool_calls || []
          const updated = currentTools.map((t) => {
            if (t.id === tool.id || t.name === tool.name) {
              return { ...t, ...tool, status: 'completed' as const }
            }
            return t
          })

          const next: ChatMessage = {
            ...prev,
            tool_calls: updated
          }
          streamingMessageRef.current = next
          return next
        })
      },
      onComplete: (msg) => {
        if (currentSessionIdRef.current !== activeSessionId) return

        const currentStreaming = streamingMessageRef.current
        const finalizedText = msg.text || currentStreaming?.content || ''
        const finalizedReasoning = msg.reasoning || currentStreaming?.reasoning || ''
        const finalizedToolCalls = currentStreaming?.tool_calls

        // 1. Clear streaming message state & ref immediately
        streamingMessageRef.current = null
        setStreamingMessage(null)

        // 2. Append finalized message only if content exists
        if (finalizedText || finalizedReasoning || (finalizedToolCalls && finalizedToolCalls.length > 0)) {
          const finalized: ChatMessage = {
            id: currentStreaming?.id || `msg-${Date.now()}`,
            session_id: activeSessionId,
            role: 'assistant',
            content: finalizedText,
            reasoning: finalizedReasoning,
            tool_calls: finalizedToolCalls,
            timestamp: Date.now() / 1000,
            isStreaming: false
          }

          setMessages((prev) => {
            // Deduplicate: if the last message in state is already identical, do not re-add
            if (prev.length > 0) {
              const last = prev[prev.length - 1]
              if (
                last.role === 'assistant' &&
                last.content.trim() === finalized.content.trim()
              ) {
                return prev
              }
            }
            return [...prev, finalized]
          })
        }

        // 3. Refresh session list quietly
        hermesApi.getSessions().then(setSessions).catch(() => {})
      },
      onTitleChange: (newTitle) => {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, title: newTitle } : s))
        )
      },
      onError: (err) => {
        console.warn('Chat socket error:', err)
      }
    })

    chatControllerRef.current = controller

    return () => {
      isCancelled = true
      controller.close()
    }
  }, [activeSessionId, selectedProfile])

  // Handle Send Message
  const handleSendMessage = () => {
    const text = inputPrompt.trim()
    if (!text || connectionStatus === 'streaming') return

    // Optimistically add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      session_id: activeSessionId || '',
      role: 'user',
      content: text,
      timestamp: Date.now() / 1000
    }

    setMessages((prev) => [...prev, userMsg])
    setInputPrompt('')

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Dispatch prompt over WebSocket
    if (chatControllerRef.current) {
      chatControllerRef.current.sendMessage(text)
    }
  }

  // Handle Keydown in Textarea (Enter = submit, Shift+Enter = newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handle Interrupt / Stop Generation
  const handleInterrupt = () => {
    if (chatControllerRef.current) {
      chatControllerRef.current.interrupt()
    }

    const currentStreaming = streamingMessageRef.current
    streamingMessageRef.current = null
    setStreamingMessage(null)

    if (currentStreaming) {
      setMessages((prev) => [...prev, { ...currentStreaming, isStreaming: false }])
    }
  }

  // Handle Create New Chat Session
  const handleCreateNewChat = async () => {
    try {
      const agentObj = agents.find((a) => a.id === selectedProfile)
      const agentTitle = agentObj?.displayName || agentObj?.name || selectedProfile
      const created = await hermesApi.createSession({
        profile: selectedProfile,
        title: `New ${agentTitle} Conversation`
      })

      if (created) {
        setSessions((prev) => [created, ...prev])
        setActiveSessionId(created.id)
        setMessages([])
        setStreamingMessage(null)
      }
    } catch (err) {
      console.error('Failed to create new session:', err)
    }
  }

  // Handle Delete Session
  const handleDeleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this chat session?')) return

    const targetSession = sessions.find((s) => s.id === sid)
    const profileToDelete = targetSession?.profile || 'default'

    try {
      await hermesApi.deleteSession(sid, profileToDelete)
      setSessions((prev) => prev.filter((s) => s.id !== sid))

      if (activeSessionId === sid) {
        const remaining = sessions.filter((s) => s.id !== sid)
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id)
        } else {
          setActiveSessionId(null)
          setMessages([])
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  // Handle Rename Session
  const handleSaveTitle = async () => {
    if (!activeSessionId || !titleDraft.trim()) {
      setIsEditingTitle(false)
      return
    }

    const currentSession = sessions.find((s) => s.id === activeSessionId)
    const profileToUse = currentSession?.profile || 'default'

    try {
      await hermesApi.renameSession(activeSessionId, titleDraft.trim(), profileToUse)
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, title: titleDraft.trim() } : s))
      )
    } catch (err) {
      console.error('Failed to rename session:', err)
    } finally {
      setIsEditingTitle(false)
    }
  }

  // Handle Copy Message Content
  const handleCopyMessage = (id: string | number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedMessageId(id)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  // Handle Copy Tool Output
  const handleCopyToolOutput = (toolId: string, output: string) => {
    navigator.clipboard.writeText(output)
    setCopiedToolId(toolId)
    setTimeout(() => setCopiedToolId(null), 2000)
  }

  // Handle Convert to Kanban Issue (TASK-2.5)
  const handleConvertToIssue = (msg: ChatMessage) => {
    if (!onConvertToIssue) return

    // Derive concise title from first non-empty line or content snippet
    const lines = msg.content.split('\n').map(l => l.replace(/^#+\s*/, '').trim()).filter(Boolean)
    let derivedTitle = lines[0] || 'Technical Task from Chat'
    if (derivedTitle.length > 70) {
      derivedTitle = derivedTitle.slice(0, 67) + '...'
    }

    const description = `### Context from Hermes Chat\n\n${msg.content}\n\n---\n*Created from Hermes Chat session: ${activeSessionId}*`

    onConvertToIssue({
      title: derivedTitle,
      description,
      assignee: selectedProfile
    })
  }

  // Filtered session list
  const filteredSessions = sessions.filter((s) => {
    if (!searchFilter.trim()) return true
    const term = searchFilter.toLowerCase()
    return (
      (s.title || '').toLowerCase().includes(term) ||
      (s.preview || '').toLowerCase().includes(term)
    )
  })

  // Selected agent metadata
  const currentAgent = agents.find((a) => a.id === selectedProfile) || {
    id: selectedProfile,
    name: selectedProfile === 'sa-aws' ? 'AWS Solution Architect' : selectedProfile,
    avatar: selectedProfile.includes('aws') ? '⚡' : selectedProfile.includes('writer') ? '📝' : '🤖'
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  // Quick Starter Prompts
  const quickPrompts = [
    {
      title: 'Architect AWS VPC with Terraform',
      prompt: 'Help me design and specify a multi-AZ AWS VPC architecture with Terraform modules, NAT Gateways, and private subnets.'
    },
    {
      title: 'Analyze Slow PostgreSQL Queries',
      prompt: 'What are the best practices to investigate and optimize slow queries on PostgreSQL RDS with pg_stat_statements?'
    },
    {
      title: 'Decompose Kubernetes Migration',
      prompt: 'Break down a monolithic application migration to EKS into actionable phased technical milestones.'
    },
    {
      title: 'Review IAM Security & S3 Policies',
      prompt: 'Review common security misconfigurations in AWS IAM policies and S3 bucket policies to enforce least privilege.'
    }
  ]

  // Render Tool Call Icon
  const getToolIcon = (toolName: string) => {
    const name = toolName.toLowerCase()
    if (name.includes('terminal') || name.includes('bash') || name.includes('exec')) {
      return <Terminal className="w-3.5 h-3.5 text-amber-400" />
    }
    if (name.includes('file') || name.includes('patch') || name.includes('read') || name.includes('write')) {
      return <FileCode className="w-3.5 h-3.5 text-blue-400" />
    }
    if (name.includes('web') || name.includes('search') || name.includes('extract')) {
      return <Globe className="w-3.5 h-3.5 text-emerald-400" />
    }
    return <Code2 className="w-3.5 h-3.5 text-purple-400" />
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0D0F12] text-slate-200">
      {/* ── LEFT PANEL: SESSIONS SIDEBAR ────────────────────────────────────── */}
      <aside className="w-72 border-r border-[#1C2128] bg-[#12151B] flex flex-col shrink-0 select-none">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-[#1C2128] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
              Chat Sessions
            </span>
          </div>
          <button
            onClick={handleCreateNewChat}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors shadow-sm"
            title="Start new chat session"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Search Filter */}
        <div className="p-2.5 border-b border-[#1C2128]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#0D0F12] border border-[#2D333B] rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1C2128]/40">
          {isLoadingSessions && sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
              <span>Loading sessions...</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No chat sessions found.
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isActive = s.id === activeSessionId
              const timeDisplay = s.last_active
                ? new Date(s.last_active * 1000).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  })
                : ''

              return (
                <div
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`group relative px-3 py-2.5 cursor-pointer text-left transition-colors flex items-start justify-between gap-2 ${
                    isActive
                      ? 'bg-[#1C2128] text-slate-100 font-medium'
                      : 'hover:bg-[#161B22] text-slate-400'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs truncate font-medium text-slate-200">
                        {s.title || 'Untitled Session'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="truncate">{s.profile || 'default'}</span>
                      {timeDisplay && (
                        <>
                          <span>•</span>
                          <span>{timeDisplay}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {s.message_count !== undefined && s.message_count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2D333B] text-slate-400">
                        {s.message_count}
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition-opacity"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* ── RIGHT PANEL: CHAT WORKSPACE ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0D0F12]">
        {/* Header Bar */}
        <header className="h-14 border-b border-[#1C2128] bg-[#12151B] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="px-2 py-1 text-sm bg-[#0D0F12] border border-amber-500/50 rounded text-slate-100 focus:outline-none"
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 group">
                <h2 className="text-sm font-semibold text-slate-100 truncate">
                  {activeSession?.title || 'Interactive Hermes Session'}
                </h2>
                <button
                  onClick={() => {
                    setTitleDraft(activeSession?.title || '')
                    setIsEditingTitle(true)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity"
                  title="Rename session"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Profile Tag */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1C2128] text-[11px] text-slate-300 border border-[#2D333B]">
              <span>{currentAgent.avatar || '🤖'}</span>
              <span className="font-mono text-amber-400">{selectedProfile}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Agent Profile Selector Dropdown */}
            <div className="relative flex items-center gap-1.5">
              <label className="text-xs text-slate-500 hidden sm:inline">Profile:</label>
              <select
                value={selectedProfile}
                onChange={(e) => handleSwitchProfile(e.target.value)}
                className="text-xs bg-[#1C2128] border border-[#2D333B] text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-500/50 cursor-pointer"
              >
                {agents.length > 0 ? (
                  agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.avatar || '🤖'} {a.displayName || a.name} ({a.id})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="default">Default Profile (default)</option>
                  </>
                )}
              </select>
            </div>

            {/* Live Connection Status Badge */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#161B22] border border-[#2D333B] text-[11px]">
              {connectionStatus === 'streaming' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span className="text-blue-400 font-medium">Generating</span>
                </>
              ) : connectionStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400 font-medium">Live Agent</span>
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-400 font-medium">Connecting</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-slate-400">Idle</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Message Thread Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingMessages ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <span>Loading conversation history...</span>
            </div>
          ) : messages.length === 0 && !streamingMessage ? (
            /* Welcome / Empty State */
            <div className="max-w-2xl mx-auto py-12 px-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mb-4 shadow-lg shadow-amber-500/5">
                {currentAgent.avatar || '☤'}
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-1">
                Consult with {currentAgent.name}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-8">
                Ask architectural questions, request code implementations, or explore technical solutions. Any message can be converted into a Kanban issue.
              </p>

              {/* Starter Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {quickPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputPrompt(item.prompt)
                      textareaRef.current?.focus()
                    }}
                    className="p-3.5 rounded-lg bg-[#14181F] border border-[#21262D] hover:border-amber-500/40 hover:bg-[#181D26] transition-all text-left group"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 group-hover:text-amber-400 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Existing Message Thread */}
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user'

                return (
                  <div
                    key={msg.id ? `${msg.id}-${idx}` : `msg-${idx}`}
                    className={`flex gap-3 max-w-4xl mx-auto ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-base shrink-0 mt-0.5">
                        {currentAgent.avatar || '🤖'}
                      </div>
                    )}

                    <div className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                      {/* Message Bubble Container */}
                      <div
                        className={`rounded-xl px-4 py-3 text-sm leading-relaxed max-w-2xl border ${
                          isUser
                            ? 'bg-[#1E2530] text-slate-100 border-[#2D3748]'
                            : 'bg-[#14171C] text-slate-200 border-[#21262D] shadow-sm'
                        }`}
                      >
                        {/* ── TOOL CALL TRACE ACCORDION (TASK-2.4) ──────────── */}
                        {msg.tool_calls && msg.tool_calls.length > 0 && (
                          <div className="mb-3 space-y-2 border-b border-[#21262D] pb-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Cpu className="w-3 h-3 text-amber-400" />
                              <span>Tool Execution Trace</span>
                            </div>

                            {msg.tool_calls.map((tc, tcIdx) => {
                              const toolKey = `${msg.id}-tc-${tcIdx}`
                              const isCollapsed = collapsedTools[toolKey] !== false // default collapsed

                              return (
                                <div
                                  key={tc.id || tcIdx}
                                  className="rounded-lg bg-[#0D0F12] border border-[#21262D] overflow-hidden text-xs"
                                >
                                  <div
                                    onClick={() =>
                                      setCollapsedTools((prev) => ({
                                        ...prev,
                                        [toolKey]: !isCollapsed
                                      }))
                                    }
                                    className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#161B22] select-none"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {getToolIcon(tc.name)}
                                      <span className="font-mono text-slate-200 font-medium truncate">
                                        {tc.name}
                                      </span>
                                      {tc.status === 'running' ? (
                                        <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                          Executing
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                          ✓ Done
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-slate-500">
                                      {isCollapsed ? (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                  </div>

                                  {!isCollapsed && (
                                    <div className="p-3 border-t border-[#21262D] bg-[#0A0C0E] space-y-2">
                                      {tc.args && Object.keys(tc.args).length > 0 && (
                                        <div>
                                          <div className="text-[10px] font-medium text-slate-500 uppercase mb-1">
                                            Arguments:
                                          </div>
                                          <pre className="p-2 rounded bg-[#0D0F12] border border-[#1C2128] text-[11px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
                                            {typeof tc.args === 'string'
                                              ? tc.args
                                              : JSON.stringify(tc.args, null, 2)}
                                          </pre>
                                        </div>
                                      )}

                                      {tc.output && (
                                        <div>
                                          <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 uppercase mb-1">
                                            <span>Output:</span>
                                            <button
                                              onClick={() =>
                                                handleCopyToolOutput(
                                                  tc.id || toolKey,
                                                  tc.output || ''
                                                )
                                              }
                                              className="hover:text-slate-300 flex items-center gap-1"
                                            >
                                              {copiedToolId === (tc.id || toolKey) ? (
                                                <Check className="w-3 h-3 text-emerald-400" />
                                              ) : (
                                                <Copy className="w-3 h-3" />
                                              )}
                                              <span>Copy</span>
                                            </button>
                                          </div>
                                          <pre className="p-2 rounded bg-[#0D0F12] border border-[#1C2128] text-[11px] text-emerald-400/90 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                                            {tc.output}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* ── REASONING / THOUGHT TRACE ACCORDION ─────────────── */}
                        {msg.reasoning && (
                          <div className="mb-3 rounded-lg bg-[#0D0F12] border border-[#21262D] overflow-hidden text-xs">
                            <div
                              onClick={() => {
                                const k = `reasoning-${msg.id || idx}`
                                setCollapsedReasoning((prev) => ({ ...prev, [k]: !prev[k] }))
                              }}
                              className="px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-[#161B22] select-none text-slate-400"
                            >
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span className="font-medium text-[11px]">
                                  Hermes Thought Trace
                                </span>
                              </div>
                              {collapsedReasoning[`reasoning-${msg.id || idx}`] ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </div>

                            {!collapsedReasoning[`reasoning-${msg.id || idx}`] && (
                              <div className="p-3 border-t border-[#21262D] bg-[#0A0C0E] text-[11px] text-slate-400 italic font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                {msg.reasoning}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message Main Text Content */}
                        {isUser ? (
                          <div className="whitespace-pre-wrap break-words leading-relaxed select-text">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="leading-relaxed select-text">
                            <MarkdownRenderer content={msg.content} />
                          </div>
                        )}
                      </div>

                      {/* Message Actions (Assistant Bubble Footer - TASK-2.5) */}
                      {!isUser && (
                        <div className="flex items-center gap-2 mt-1.5 px-1">
                          <button
                            onClick={() => handleCopyMessage(msg.id || idx, msg.content)}
                            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 py-0.5 px-1.5 rounded hover:bg-[#1C2128] transition-colors"
                            title="Copy message text"
                          >
                            {copiedMessageId === (msg.id || idx) ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Convert to Kanban Issue Button */}
                          <button
                            onClick={() => handleConvertToIssue(msg)}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 hover:text-amber-300 py-0.5 px-2 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                            title="Convert this message into a Kanban issue"
                          >
                            <CheckSquare className="w-3 h-3" />
                            <span>Convert to Issue</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-sm shrink-0 mt-0.5 text-blue-400">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Live Streaming Assistant Message */}
              {streamingMessage && (
                <div className="flex gap-3 max-w-4xl mx-auto justify-start">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-base shrink-0 mt-0.5">
                    {currentAgent.avatar || '🤖'}
                  </div>

                  <div className="flex flex-col items-start min-w-0 max-w-2xl">
                    <div className="rounded-xl px-4 py-3 text-sm leading-relaxed bg-[#14171C] text-slate-200 border border-[#21262D] shadow-sm w-full">
                      {/* Streaming Tool Calls */}
                      {streamingMessage.tool_calls && streamingMessage.tool_calls.length > 0 && (
                        <div className="mb-3 space-y-2 border-b border-[#21262D] pb-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Cpu className="w-3 h-3 text-amber-400" />
                            <span>Tool Execution Trace</span>
                          </div>

                          {streamingMessage.tool_calls.map((tc, tcIdx) => (
                            <div
                              key={tc.id || tcIdx}
                              className="rounded-lg bg-[#0D0F12] border border-[#21262D] px-3 py-2 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {getToolIcon(tc.name)}
                                <span className="font-mono text-slate-200 font-medium">
                                  {tc.name}
                                </span>
                                {tc.status === 'running' ? (
                                  <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                    Executing...
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    ✓ Completed
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Streaming Reasoning / Thinking */}
                      {streamingMessage.reasoning && (
                        <div className="mb-3 rounded-lg bg-[#0D0F12] border border-[#21262D] p-3 text-xs text-slate-400 italic font-mono whitespace-pre-wrap leading-relaxed">
                          <div className="flex items-center gap-1.5 text-amber-400 font-medium mb-1 not-italic">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Thinking...</span>
                          </div>
                          {streamingMessage.reasoning}
                        </div>
                      )}

                      {/* Streaming Content */}
                      <div className="whitespace-pre-wrap break-words leading-relaxed">
                        {streamingMessage.content}
                        <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-0.5 align-middle" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Footer */}
        <div className="p-4 border-t border-[#1C2128] bg-[#12151B]">
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-xl bg-[#0D0F12] border border-[#21262D] focus-within:border-amber-500/50 shadow-inner flex flex-col transition-colors">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${currentAgent.name} (Shift+Enter for newline, Enter to send)...`}
                rows={2}
                disabled={connectionStatus === 'streaming'}
                className="w-full bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none disabled:opacity-60"
              />

              <div className="flex items-center justify-between px-3 py-2 border-t border-[#1C2128]/50">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 select-none">
                  <span>Press <kbd className="px-1 py-0.5 rounded bg-[#1C2128] text-slate-400 font-mono text-[10px]">Enter ↵</kbd> to send</span>
                </div>

                <div className="flex items-center gap-2">
                  {connectionStatus === 'streaming' ? (
                    <button
                      onClick={handleInterrupt}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      <StopCircle className="w-4 h-4" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputPrompt.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shadow-amber-500/20"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
