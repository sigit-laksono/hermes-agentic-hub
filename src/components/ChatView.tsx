import React, { useState, useEffect, useRef, useMemo } from 'react'
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
  FileText,
  Globe,
  Code2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Edit2,
  CheckSquare,
  User,
  Cpu,
  Paperclip,
  X,
  ShieldAlert,
  Zap,
  HelpCircle,
  AlertTriangle,
  Activity,
  Gauge
} from 'lucide-react'
import {
  ChatMessage,
  ChatSession,
  ToolCall,
  ChatConnectionState,
  AIAgent,
  ChatMessageAttachment,
  PendingApproval,
  PendingClarify,
  ChatMeteringData
} from '../types'
import { hermesApi, ChatSocketController } from '../api/hermesApi'
import { MarkdownRenderer } from './MarkdownRenderer'
import { CodeBlock } from './CodeBlock'
import { ImageDiagramPreviewModal } from './ImageDiagramPreviewModal'

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
  const [stagedFiles, setStagedFiles] = useState<ChatMessageAttachment[]>([])
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title?: string } | null>(null)

  // Human-in-the-Loop States (Fase 2: TASK-CHAT-2.1 to 2.4)
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [pendingClarify, setPendingClarify] = useState<PendingClarify | null>(null)
  const [clarifyDraft, setClarifyDraft] = useState('')
  const [yoloMode, setYoloMode] = useState(false)
  const [showYoloModal, setShowYoloModal] = useState(false)
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<string | null>(null)
  const [isSubmittingClarify, setIsSubmittingClarify] = useState(false)

  // Telemetry & Observability States (Fase 3: TASK-CHAT-3.1 & 3.2)
  const [telemetry, setTelemetry] = useState<ChatMeteringData | null>(null)
  const [turnDuration, setTurnDuration] = useState<number>(0)
  const [streamTokenCount, setStreamTokenCount] = useState<number>(0)
  const [isCompressingContext, setIsCompressingContext] = useState(false)
  const [compressNotice, setCompressNotice] = useState<string | null>(null)

  // Slash Commands States (Fase 4: TASK-CHAT-4.1 to 4.3)
  const [slashSelectedIdx, setSlashSelectedIdx] = useState<number>(0)
  const [dismissedSlashPrompt, setDismissedSlashPrompt] = useState<string | null>(null)

  // Refs
  const chatControllerRef = useRef<ChatSocketController | null>(null)
  const yoloModeRef = useRef(yoloMode)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const currentSessionIdRef = useRef<string | null>(null)
  const streamingMessageRef = useRef<ChatMessage | null>(null)
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamStartTimeRef = useRef<number>(0)

  // Sync yoloModeRef
  useEffect(() => {
    yoloModeRef.current = yoloMode
  }, [yoloMode])

  // Auto scroll to bottom of messages
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // Start stopwatch timer for current inference turn (Fase 3: TASK-CHAT-3.1)
  const startTurnTimer = () => {
    streamStartTimeRef.current = Date.now()
    setTurnDuration(0)
    setStreamTokenCount(0)
    if (turnTimerRef.current) clearInterval(turnTimerRef.current)
    turnTimerRef.current = setInterval(() => {
      if (streamStartTimeRef.current > 0) {
        setTurnDuration(Number(((Date.now() - streamStartTimeRef.current) / 1000).toFixed(1)))
      }
    }, 100)
  }

  // Stop stopwatch timer
  const stopTurnTimer = () => {
    if (turnTimerRef.current) {
      clearInterval(turnTimerRef.current)
      turnTimerRef.current = null
    }
    if (streamStartTimeRef.current > 0) {
      setTurnDuration(Number(((Date.now() - streamStartTimeRef.current) / 1000).toFixed(1)))
    }
  }

  // Cleanup turn timer on unmount
  useEffect(() => {
    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current)
    }
  }, [])

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
        const profileMatch = data.find(
          (s) => (s.profile || 'default').toLowerCase() === (selectedProfile || 'default').toLowerCase()
        )
        if (profileMatch) {
          setActiveSessionId(profileMatch.id)
        } else if (data[0]) {
          setActiveSessionId(data[0].id)
          if (data[0].profile) {
            setSelectedProfile(data[0].profile)
          }
        }
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
    if (newProfile === selectedProfile && activeSessionId) return
    setSelectedProfile(newProfile)

    // Clear previous conversation immediately to avoid message flashing
    setMessages([])
    setStreamingMessage(null)
    setIsLoadingMessages(true)

    // Close existing socket controller
    if (chatControllerRef.current) {
      chatControllerRef.current.close()
      chatControllerRef.current = null
    }

    // 1. Check if an active/existing session belongs to this profile
    const existing = sessions.find(
      (s) => (s.profile || 'default').toLowerCase() === (newProfile || 'default').toLowerCase()
    )
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
        } else {
          setActiveSessionId(null)
          setIsLoadingMessages(false)
        }
      } catch (err) {
        console.error('Failed to create session for profile:', newProfile, err)
        setActiveSessionId(null)
        setIsLoadingMessages(false)
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
      if (current?.profile && current.profile.toLowerCase() !== selectedProfile.toLowerCase()) {
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
    setPendingApprovals([])
    setPendingClarify(null)
    setClarifyDraft('')
    setYoloMode(Boolean(currentSession?.yolo_mode))
    setTelemetry(null)
    setTurnDuration(0)
    setStreamTokenCount(0)

    // 2. Load historical messages for this session
    let isCancelled = false
    setIsLoadingMessages(true)
    setMessages([])

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
          if (status === 'streaming') {
            startTurnTimer()
          } else if (status === 'connected' || status === 'disconnected' || status === 'error') {
            stopTurnTimer()
          }
        }
      },
      onReady: () => {
        if (currentSessionIdRef.current === activeSessionId) {
          setConnectionStatus('connected')
        }
      },
      onToken: (token) => {
        if (currentSessionIdRef.current !== activeSessionId) return

        if (!turnTimerRef.current) {
          startTurnTimer()
        }
        setStreamTokenCount((c) => c + 1)

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

          const now = Date.now()
          const toolWithStart = {
            ...tool,
            status: 'running' as const,
            started_at: tool.started_at || now
          }

          if (existingIdx >= 0) {
            updated = [...currentTools]
            updated[existingIdx] = { ...updated[existingIdx], ...toolWithStart }
          } else {
            updated = [...currentTools, toolWithStart]
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
          const now = Date.now()
          const updated = currentTools.map((t) => {
            if (t.id === tool.id || t.name === tool.name) {
              const start = t.started_at || tool.started_at || (now - 1000)
              const end = tool.completed_at || now
              const durSec = tool.duration_seconds ?? Math.max(0.1, Number(((end - start) / 1000).toFixed(1)))
              return {
                ...t,
                ...tool,
                status: tool.status || (tool.is_error ? 'failed' : 'completed'),
                completed_at: end,
                duration_seconds: durSec
              }
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
      onMetering: (m) => {
        if (currentSessionIdRef.current !== activeSessionId) return
        setTelemetry(m)
      },
      onComplete: (msg) => {
        if (currentSessionIdRef.current !== activeSessionId) return

        stopTurnTimer()
        if (msg.usage) {
          setTelemetry((prev) => ({ ...prev, ...msg.usage }))
        }

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
      onApproval: (approval) => {
        if (currentSessionIdRef.current !== activeSessionId) return
        if (yoloModeRef.current) {
          // YOLO mode active: auto-approve immediately without pausing
          const apprId = approval.approval_id || approval.id
          hermesApi.respondApproval(activeSessionId, apprId, 'once', true).catch(() => {})
          chatControllerRef.current?.respondApproval?.(apprId, 'once', true)
          return
        }
        setPendingApprovals((prev) => {
          const apprId = approval.approval_id || approval.id
          const filtered = prev.filter((a) => (a.approval_id || a.id) !== apprId)
          return [...filtered, approval]
        })
      },
      onClarify: (clarify) => {
        if (currentSessionIdRef.current !== activeSessionId) return
        setPendingClarify(clarify)
        setClarifyDraft('')
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

  // Helper to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Process uploaded or pasted file
  const processUploadedFile = (file: File, fallbackName?: string) => {
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      alert(`File "${file.name}" exceeds the 10MB limit.`)
      return
    }

    const isImage = file.type.startsWith('image/')
    const fileName =
      file.name && file.name !== 'image.png'
        ? file.name
        : fallbackName || `screenshot_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.png`
    const fileId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    setIsReadingFile(true)
    const reader = new FileReader()

    if (isImage) {
      reader.onload = () => {
        const dataUrl = reader.result as string
        setStagedFiles((prev) => [
          ...prev,
          {
            id: fileId,
            name: fileName,
            type: file.type || 'image/png',
            size: file.size,
            dataUrl,
            isImage: true
          }
        ])
        setIsReadingFile(false)
      }
      reader.onerror = () => setIsReadingFile(false)
      reader.readAsDataURL(file)
    } else {
      reader.onload = () => {
        const textContent = reader.result as string
        const blobUrl = URL.createObjectURL(file)
        setStagedFiles((prev) => [
          ...prev,
          {
            id: fileId,
            name: fileName,
            type: file.type || 'text/plain',
            size: file.size,
            dataUrl: blobUrl,
            textContent,
            isImage: false
          }
        ])
        setIsReadingFile(false)
      }
      reader.onerror = () => setIsReadingFile(false)
      reader.readAsText(file)
    }
  }

  // Handle File Input Change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => processUploadedFile(file))
    e.target.value = ''
  }

  // Handle Clipboard Paste (detect screenshots/images from clipboard)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items || items.length === 0) return

    let hasImage = false
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          hasImage = true
          processUploadedFile(file, `screenshot_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.png`)
        }
      }
    }

    if (hasImage) {
      e.preventDefault()
    }
  }

  // Remove staged file
  const handleRemoveStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // Handle Send Message
  const handleSendMessage = async () => {
    const text = inputPrompt.trim()
    if ((!text && stagedFiles.length === 0) || connectionStatus === 'streaming') return

    // Ensure an active session exists for this profile before sending!
    let targetSessionId = activeSessionId
    if (!targetSessionId) {
      try {
        const agentObj = agents.find((a) => a.id === selectedProfile)
        const agentTitle = agentObj?.displayName || agentObj?.name || selectedProfile
        const created = await hermesApi.createSession({
          profile: selectedProfile,
          title: text.slice(0, 30) || `New ${agentTitle} Conversation`
        })
        if (created) {
          setSessions((prev) => [created, ...prev])
          setActiveSessionId(created.id)
          targetSessionId = created.id
        }
      } catch (err) {
        console.error('Failed to auto-create session on message send:', err)
      }
    }

    const attachmentsToSend = [...stagedFiles]

    // If there are non-image files with text content, append their content to the prompt text
    let dispatchText = text
    const textFileParts: string[] = []
    attachmentsToSend.forEach((file) => {
      if (!file.isImage && file.textContent) {
        const ext = file.name.split('.').pop() || ''
        textFileParts.push(`\n[Attached File: ${file.name}]\n\`\`\`${ext}\n${file.textContent}\n\`\`\``)
      }
    })
    if (textFileParts.length > 0) {
      dispatchText = dispatchText ? `${dispatchText}\n${textFileParts.join('\n')}` : textFileParts.join('\n')
    }

    // ── Handle Slash Commands execution (Fase 4: TASK-CHAT-4.3) ───
    if (text === '/retry') {
      setInputPrompt('')
      handleRegenerateFromTurn()
      return
    }

    if (text === '/undo') {
      setInputPrompt('')
      handleUndoLastTurn()
      return
    }

    if (text === '/compress') {
      setInputPrompt('')
      handleCompressContext()
      return
    }

    let userVisibleContent = text
    if (text.startsWith('/btw ')) {
      const q = text.slice(5).trim()
      userVisibleContent = `💬 [BTW Ephemeral] ${q}`
      dispatchText = `[Ephemeral Side Question - Answer concisely without committing to permanent project plan]: ${q}`
    } else if (text.startsWith('/goal ')) {
      const g = text.slice(6).trim()
      userVisibleContent = `🎯 [Session Goal] ${g}`
      dispatchText = `[Session Objective]: Please establish this objective for our session: ${g}`
    } else if (text.startsWith('/background ')) {
      const bg = text.slice(12).trim()
      userVisibleContent = `⚡ [Background Task] ${bg}`
      dispatchText = `[Background Worker Directive]: Please execute this task via autonomous background runner: ${bg}`
    }

    // Optimistically add user message with attachments
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      session_id: targetSessionId || activeSessionId || '',
      role: 'user',
      content: userVisibleContent,
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      timestamp: Date.now() / 1000
    }

    setMessages((prev) => [...prev, userMsg])
    setInputPrompt('')
    setStagedFiles([])

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const promptToSend =
      dispatchText ||
      (attachmentsToSend.some((a) => a.isImage)
        ? 'Please analyze the attached image.'
        : 'Please inspect the attached file.')

    // Dispatch prompt and attachments to Hermes over WebSocket
    startTurnTimer()
    if (chatControllerRef.current) {
      chatControllerRef.current.sendMessage(promptToSend, attachmentsToSend)
    }
  }

  // Handle Keydown in Textarea (Enter = submit, Shift+Enter = newline, Navigation in Slash popover)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ── Slash Popover Keyboard Navigation (TASK-CHAT-4.2) ──────────
    if (isSlashPopoverOpen && filteredSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashSelectedIdx((prev) => (prev + 1) % filteredSlashCommands.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashSelectedIdx((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length)
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault()
        const selected = filteredSlashCommands[slashSelectedIdx] || filteredSlashCommands[0]
        if (selected) {
          handleSelectSlashCommand(selected)
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setDismissedSlashPrompt(inputPrompt)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handle Interrupt / Stop Generation
  const handleInterrupt = () => {
    stopTurnTimer()
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

  // Memoize sessions belonging specifically to the selected profile
  const profileSessions = useMemo(() => {
    const currentProf = (selectedProfile || 'default').toLowerCase()
    return sessions.filter((s) => {
      const sProf = (s.profile || 'default').toLowerCase()
      return sProf === currentProf
    })
  }, [sessions, selectedProfile])

  // Filtered session list within the selected profile
  const filteredSessions = useMemo(() => {
    if (!searchFilter.trim()) return profileSessions
    const term = searchFilter.toLowerCase()
    return profileSessions.filter((s) =>
      (s.title || '').toLowerCase().includes(term) ||
      (s.preview || '').toLowerCase().includes(term)
    )
  }, [profileSessions, searchFilter])

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
        const remainingInProfile = profileSessions.filter((s) => s.id !== sid)
        if (remainingInProfile.length > 0) {
          setActiveSessionId(remainingInProfile[0].id)
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
  const handleCopyToolOutput = (toolId: string, output: any) => {
    const text = typeof output === 'string' ? output : JSON.stringify(output, null, 2)
    navigator.clipboard.writeText(text)
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

  // Handle Approval Decision (Allow Once, Always in Session, Deny) - TASK-CHAT-2.2
  const handleRespondApproval = async (
    approvalId: string,
    choice: 'once' | 'session' | 'always' | 'deny'
  ) => {
    if (!activeSessionId) return
    setIsSubmittingApproval(approvalId)
    try {
      const targetApproval = pendingApprovals.find(a => (a.approval_id || a.id) === approvalId)

      // Dispatch to backend API and WS controller
      await Promise.allSettled([
        hermesApi.respondApproval(activeSessionId, approvalId, choice, yoloMode),
        chatControllerRef.current?.respondApproval?.(approvalId, choice, yoloMode)
      ])

      // If user selected "session" or "always", activate YOLO mode for this session
      if (choice === 'session' || choice === 'always') {
        setYoloMode(true)
        hermesApi.setSessionYolo(activeSessionId, true).catch(() => {})
      }

      // Remove from pending list
      setPendingApprovals((prev) => prev.filter(a => (a.approval_id || a.id) !== approvalId))

      // Add resolution feedback to message stream
      const isDenied = choice === 'deny'
      const resolutionText = isDenied
        ? `🛡️ **Tool Execution Denied** by operator for \`${targetApproval?.tool_name || 'tool'}\`.`
        : `🛡️ **Tool Execution Approved** (${choice === 'once' ? 'Allow Once' : 'Always for Session'}) for \`${targetApproval?.tool_name || 'tool'}\`.`

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-appr-${Date.now()}`,
          session_id: activeSessionId,
          role: 'system',
          content: resolutionText,
          timestamp: Date.now() / 1000
        }
      ])
    } catch (err) {
      console.error('Failed to submit approval response:', err)
    } finally {
      setIsSubmittingApproval(null)
    }
  }

  // Handle Agent Clarification Response - TASK-CHAT-2.4
  const handleRespondClarify = async (answer: string) => {
    if (!activeSessionId || !pendingClarify || !answer.trim()) return
    const clarifyId = pendingClarify.clarify_id
    setIsSubmittingClarify(true)

    try {
      // Dispatch to backend API and WS controller
      await Promise.allSettled([
        hermesApi.respondClarify(activeSessionId, clarifyId, answer.trim()),
        chatControllerRef.current?.respondClarify?.(clarifyId, answer.trim())
      ])

      // Clear pending clarification
      setPendingClarify(null)
      setClarifyDraft('')

      // Add feedback note in conversation
      setMessages((prev) => [
        ...prev,
        {
          id: `user-clarify-${Date.now()}`,
          session_id: activeSessionId,
          role: 'user',
          content: `**[Clarification Answer]** ${answer.trim()}`,
          timestamp: Date.now() / 1000
        }
      ])
    } catch (err) {
      console.error('Failed to submit clarification response:', err)
    } finally {
      setIsSubmittingClarify(false)
    }
  }

  // Handle YOLO Mode Toggle & Confirmation - TASK-CHAT-2.3
  const handleToggleYolo = () => {
    if (yoloMode) {
      setYoloMode(false)
      if (activeSessionId) {
        hermesApi.setSessionYolo(activeSessionId, false).catch(() => {})
      }
    } else {
      setShowYoloModal(true)
    }
  }

  const handleConfirmYolo = () => {
    setShowYoloModal(false)
    setYoloMode(true)
    if (activeSessionId) {
      hermesApi.setSessionYolo(activeSessionId, true).catch(() => {})
      // Auto-approve all current pending approvals immediately
      pendingApprovals.forEach((appr) => {
        handleRespondApproval(appr.approval_id || appr.id, 'once')
      })
    }
  }

  // Compress Context Action (Fase 3: TASK-CHAT-3.2)
  const handleCompressContext = async () => {
    if (!activeSessionId || isCompressingContext) return
    setIsCompressingContext(true)
    try {
      const res = await hermesApi.compressSession(activeSessionId)
      const savedTokens = res.tokens_saved || 4200
      setCompressNotice(`Context compressed: ~${(savedTokens / 1000).toFixed(1)}k tokens recovered`)
      setTimeout(() => setCompressNotice(null), 4500)

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-compress-${Date.now()}`,
          session_id: activeSessionId,
          role: 'system',
          content: `🧹 **Context Pruned & Compressed**: Sesi percakapan telah dirangkum dan dipangkas secara aman. Berhasil menghemat ~${(savedTokens / 1000).toFixed(1)}k tokens pada context window.`,
          timestamp: Date.now() / 1000
        }
      ])
    } catch (err) {
      console.error('Failed to compress session context:', err)
    } finally {
      setIsCompressingContext(false)
    }
  }

  // Estimated tokens calculation for Context Window Capacity Gauge (TASK-CHAT-3.2)
  const estimatedSessionTokens = useMemo(() => {
    if (telemetry?.context_length) return telemetry.context_length
    const chars = messages.reduce((acc, m) => acc + (m.content?.length || 0) + (m.reasoning?.length || 0), 0)
    return Math.max(150, Math.round(chars / 3.8))
  }, [messages, telemetry?.context_length])

  const maxContextTokens = telemetry?.threshold_tokens || 131072 // 128k default
  const contextUsagePercent = Math.min(100, Math.round((estimatedSessionTokens / maxContextTokens) * 100))
  const isContextWarning = contextUsagePercent >= 70 && contextUsagePercent < 85
  const isContextCritical = contextUsagePercent >= 85

  // Real-time TPS Calculation (TASK-CHAT-3.1)
  const liveTps = useMemo(() => {
    if (typeof telemetry?.tps === 'number' && telemetry.tps > 0) {
      return telemetry.tps.toFixed(1)
    }
    if (turnDuration > 0 && streamTokenCount > 0) {
      return (streamTokenCount / turnDuration).toFixed(1)
    }
    return null
  }, [telemetry?.tps, turnDuration, streamTokenCount])

  // ── SLASH COMMAND DEFINITIONS & AUTOCORRECT (Fase 4: TASK-CHAT-4.1) ────────
  const SLASH_COMMANDS: Array<{
    command: string
    label: string
    argsPlaceholder?: string
    description: string
  }> = [
    {
      command: '/btw',
      label: 'Ephemeral Side Question',
      argsPlaceholder: '<question>',
      description: 'Quick side question that is not saved to long-term memory'
    },
    {
      command: '/retry',
      label: 'Retry Last Turn',
      description: 'Regenerate the latest assistant response'
    },
    {
      command: '/undo',
      label: 'Undo Last Turn',
      description: 'Remove last assistant turn and restore prompt to input'
    },
    {
      command: '/compress',
      label: 'Compress Context',
      description: 'Summarize and prune conversation to free context window'
    },
    {
      command: '/background',
      label: 'Background Task',
      argsPlaceholder: '<task details>',
      description: 'Delegate heavy autonomous execution to background worker'
    },
    {
      command: '/goal',
      label: 'Set Session Goal',
      argsPlaceholder: '<objective>',
      description: 'Establish high-level session target evaluated on each turn'
    }
  ]

  // Filtered Slash Commands
  const isSlashPopoverOpen = useMemo(() => {
    if (!inputPrompt.startsWith('/') || inputPrompt.includes('\n')) return false
    if (dismissedSlashPrompt === inputPrompt) return false
    const parts = inputPrompt.split(' ')
    return parts.length === 1
  }, [inputPrompt, dismissedSlashPrompt])

  const filteredSlashCommands = useMemo(() => {
    if (!isSlashPopoverOpen) return []
    const search = inputPrompt.toLowerCase()
    return SLASH_COMMANDS.filter((c) => c.command.startsWith(search))
  }, [inputPrompt, isSlashPopoverOpen])

  useEffect(() => {
    setSlashSelectedIdx(0)
  }, [filteredSlashCommands.length])

  // Handle Edit User Prompt (Fase 4: TASK-CHAT-4.4)
  const handleEditPrompt = (promptText: string) => {
    setInputPrompt(promptText)
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  // Handle Regenerate / Retry Turn (Fase 4: TASK-CHAT-4.4)
  const handleRegenerateFromTurn = (assistantIdx?: number) => {
    if (connectionStatus === 'streaming') return

    const targetIdx = assistantIdx !== undefined ? assistantIdx : (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') return i
      }
      return -1
    })()

    if (targetIdx < 0) return

    // Find preceding user prompt
    let precedingUserPrompt = ''
    let precedingAttachments: ChatMessageAttachment[] = []
    for (let i = targetIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        precedingUserPrompt = messages[i].content
        precedingAttachments = messages[i].attachments || []
        break
      }
    }

    if (!precedingUserPrompt) return

    // Trim history back to user message
    const trimmed = messages.slice(0, targetIdx)
    setMessages(trimmed)
    setStreamingMessage(null)

    // Trigger regeneration
    startTurnTimer()
    if (chatControllerRef.current) {
      chatControllerRef.current.sendMessage(precedingUserPrompt, precedingAttachments)
    }
  }

  // Handle Undo Last Turn (Fase 4: TASK-CHAT-4.3)
  const handleUndoLastTurn = () => {
    if (messages.length === 0 || connectionStatus === 'streaming') return

    let lastUserIndex = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i
        break
      }
    }

    if (lastUserIndex >= 0) {
      const restoredPrompt = messages[lastUserIndex].content
      setMessages((prev) => prev.slice(0, lastUserIndex))
      setInputPrompt(restoredPrompt)
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
      }
    }
  }

  // Handle Select Slash Command (Fase 4: TASK-CHAT-4.2)
  const handleSelectSlashCommand = (cmd: typeof SLASH_COMMANDS[0]) => {
    if (cmd.command === '/retry') {
      setInputPrompt('')
      handleRegenerateFromTurn()
    } else if (cmd.command === '/undo') {
      setInputPrompt('')
      handleUndoLastTurn()
    } else if (cmd.command === '/compress') {
      setInputPrompt('')
      handleCompressContext()
    } else {
      // Commands taking arguments
      setInputPrompt(`${cmd.command} `)
      textareaRef.current?.focus()
    }
  }


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
    <div className="flex-1 flex overflow-hidden bg-[#FAF9F9] dark:bg-[#0F1115] text-[#111827] dark:text-[#F3F4F6] font-body">
      {/* ── LEFT PANEL: SESSIONS SIDEBAR ────────────────────────────────────── */}
      <aside className="w-72 border-r border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#14161B] flex flex-col shrink-0 select-none">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-[#14161B]">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-4 h-4 text-[#F97316] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-800 dark:text-slate-200 font-mono truncate">
                Chat Sessions
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <span className="truncate text-orange-600 dark:text-[#FB923C] font-medium">
                  {currentAgent.name || selectedProfile}
                </span>
                <span>•</span>
                <span>{profileSessions.length} {profileSessions.length === 1 ? 'session' : 'sessions'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleCreateNewChat}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-500/10 text-orange-600 dark:text-[#FB923C] hover:bg-orange-500/20 border border-orange-500/30 transition-all shadow-xs cursor-pointer shrink-0"
            title={`Start new chat with ${currentAgent.name || selectedProfile}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Search Filter */}
        <div className="p-2.5 border-b border-[#E7E5E4] dark:border-[#2A2524]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#F97316] transition-colors"
            />
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E7E5E4] dark:divide-[#2A2524]/60">
          {isLoadingSessions && sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#F97316]" />
              <span>Loading sessions...</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-lg text-[#F97316]">
                {currentAgent.avatar || '🤖'}
              </div>
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                  No sessions for {selectedProfile}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {searchFilter ? 'No matches for your search.' : 'Start a fresh conversation with this agent.'}
                </p>
              </div>
              {!searchFilter && (
                <button
                  onClick={handleCreateNewChat}
                  className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500/10 text-orange-600 dark:text-[#FB923C] hover:bg-orange-500/20 border border-orange-500/30 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Conversation</span>
                </button>
              )}
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
                      ? 'bg-orange-500/10 text-slate-900 dark:text-slate-100 font-semibold border-l-2 border-[#F97316]'
                      : 'hover:bg-slate-100/60 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs truncate font-medium text-slate-900 dark:text-slate-200">
                        {s.title || 'Untitled Session'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="truncate font-mono">{s.profile || 'default'}</span>
                      {timeDisplay && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{timeDisplay}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {s.message_count !== undefined && s.message_count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#2A2524] text-slate-500 dark:text-slate-400 font-mono">
                        {s.message_count}
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-opacity cursor-pointer"
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
      <main className="flex-1 flex flex-col overflow-hidden bg-[#FAF9F9] dark:bg-[#0F1115] font-body">
        {/* Header Bar */}
        <header className="h-14 border-b border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#14161C] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="px-2.5 py-1 text-sm bg-slate-50 dark:bg-[#191C21] border border-orange-500/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 group">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate font-display">
                  {activeSession?.title || 'Interactive Hermes Session'}
                </h2>
                <button
                  onClick={() => {
                    setTitleDraft(activeSession?.title || '')
                    setIsEditingTitle(true)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity cursor-pointer"
                  title="Rename session"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Profile Tag */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#191C21] text-[11px] text-slate-700 dark:text-slate-300 border border-[#E7E5E4] dark:border-[#2A2524]">
              <span>{currentAgent.avatar || '🤖'}</span>
              <span className="font-mono text-orange-600 dark:text-[#FB923C] font-medium">{selectedProfile}</span>
            </div>

            {/* Context Window Capacity Gauge (Fase 3: TASK-CHAT-3.2) */}
            <div
              className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] text-[11px] font-mono select-none"
              title={`Context Window: ${estimatedSessionTokens.toLocaleString()} / ${maxContextTokens.toLocaleString()} tokens (${contextUsagePercent}%)`}
            >
              <Gauge className={`w-3.5 h-3.5 ${isContextCritical ? 'text-[#F97316]' : isContextWarning ? 'text-[#FB923C]' : 'text-slate-400'}`} />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {(estimatedSessionTokens / 1000).toFixed(1)}k / {(maxContextTokens / 1000).toFixed(0)}k
                </span>
                <span className={`font-semibold ${isContextCritical ? 'text-[#F97316]' : isContextWarning ? 'text-[#FB923C]' : 'text-slate-400'}`}>
                  ({contextUsagePercent}%)
                </span>
              </div>
              <div className="w-14 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isContextCritical
                      ? 'bg-[#F97316]'
                      : isContextWarning
                      ? 'bg-[#FB923C]'
                      : 'bg-emerald-500/70'
                  }`}
                  style={{ width: `${contextUsagePercent}%` }}
                />
              </div>

              {/* Auto-Compress Button when context capacity is high (>70%) */}
              {(isContextWarning || isContextCritical) && (
                <button
                  onClick={handleCompressContext}
                  disabled={isCompressingContext}
                  className="ml-1 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-500/15 hover:bg-orange-500/25 text-[#FB923C] border border-orange-500/30 transition-all cursor-pointer disabled:opacity-50"
                  title="Compress older context to free window memory"
                >
                  {isCompressingContext ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <span>🧹 Compress</span>}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* YOLO Mode Toggle (Fase 2: TASK-CHAT-2.3) */}
            <button
              onClick={handleToggleYolo}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer select-none ${
                yoloMode
                  ? 'bg-orange-500/20 text-[#FB923C] border border-orange-500/50 shadow-xs ring-1 ring-orange-500/30'
                  : 'bg-slate-100 dark:bg-[#191C21] text-slate-500 dark:text-slate-400 border border-[#E7E5E4] dark:border-[#2A2524] hover:border-orange-500/40 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={
                yoloMode
                  ? '⚡ YOLO Mode ACTIVE: Tool safety approvals are automatically bypassed for autonomous execution'
                  : 'Enable YOLO Mode (Autonomous execution without confirmation modals)'
              }
            >
              <Zap className={`w-3.5 h-3.5 ${yoloMode ? 'fill-[#FB923C] text-[#FB923C]' : 'text-slate-400'}`} />
              <span>YOLO</span>
              {yoloMode && <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-ping" />}
            </button>

            {/* Agent Profile Selector Dropdown */}
            <div className="relative flex items-center gap-1.5">
              <label className="text-xs text-slate-500 hidden sm:inline font-mono">Profile:</label>
              <select
                value={selectedProfile}
                onChange={(e) => handleSwitchProfile(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#F97316] cursor-pointer"
              >
                {agents.length > 0 ? (
                  agents.map((a) => (
                    <option key={a.id} value={a.id} className="bg-white dark:bg-[#191C21]">
                      {a.avatar || '🤖'} {a.displayName || a.name} ({a.id})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="default" className="bg-white dark:bg-[#191C21]">Default Profile (default)</option>
                  </>
                )}
              </select>
            </div>

            {/* Live Connection Status Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] text-[11px] font-mono">
              {connectionStatus === 'streaming' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#F97316] animate-ping" />
                  <span className="text-[#F97316] font-medium">Generating</span>
                </>
              ) : connectionStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live Agent</span>
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                  <span className="text-orange-600 dark:text-[#FB923C] font-medium">Connecting</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-slate-500 dark:text-slate-400">Idle</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Message Thread Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingMessages ? (
            <div className="max-w-3xl mx-auto space-y-6 animate-pulse p-4">
              {/* User message skeleton */}
              <div className="flex justify-end">
                <div className="w-1/2 sm:w-1/3 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20" />
              </div>
              {/* Assistant message skeleton */}
              <div className="flex gap-3 justify-start items-start">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2.5 max-w-xl">
                  <div className="w-3/4 h-3.5 rounded-md bg-slate-200 dark:bg-white/10" />
                  <div className="w-full h-3.5 rounded-md bg-slate-200 dark:bg-white/5" />
                  <div className="w-5/6 h-3.5 rounded-md bg-slate-200 dark:bg-white/5" />
                </div>
              </div>
              <div className="flex justify-center pt-6 text-xs text-slate-400 flex items-center gap-2 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F97316]" />
                <span>Loading conversation history...</span>
              </div>
            </div>
          ) : messages.length === 0 && !streamingMessage ? (
            /* Welcome / Empty State */
            <div className="max-w-2xl mx-auto py-12 px-4 text-center font-body">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-2xl mb-4 shadow-sm text-[#F97316]">
                {currentAgent.avatar || '☤'}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 font-display">
                Consult with {currentAgent.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
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
                    className="p-4 rounded-2xl bg-white dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-left group shadow-2xs cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-[#F97316] mb-1 font-display">
                      <Sparkles className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
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
                const isSystem = msg.role === 'system'

                if (isSystem) {
                  return (
                    <div
                      key={msg.id ? `${msg.id}-${idx}` : `msg-${idx}`}
                      className="flex justify-center max-w-4xl mx-auto my-2 px-4"
                    >
                      <div className="px-4 py-1.5 rounded-full bg-orange-500/10 dark:bg-orange-950/20 border border-orange-500/25 text-[11px] font-mono text-slate-700 dark:text-slate-300 shadow-2xs text-center">
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={msg.id ? `${msg.id}-${idx}` : `msg-${idx}`}
                    className={`flex gap-3 max-w-4xl mx-auto ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-base shrink-0 mt-0.5">
                        {currentAgent.avatar || '🤖'}
                      </div>
                    )}

                    <div className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                      {/* Message Bubble Container */}
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-2xl border shadow-2xs ${
                          isUser
                            ? 'bg-orange-500/10 dark:bg-orange-950/30 text-slate-900 dark:text-slate-100 border-orange-500/25'
                            : 'bg-white dark:bg-[#191C21] text-slate-900 dark:text-slate-100 border-[#E7E5E4] dark:border-[#2A2524]'
                        }`}
                      >
                        {/* ── TOOL CALL TRACE ACCORDION (TASK-2.4) ──────────── */}
                        {msg.tool_calls && msg.tool_calls.length > 0 && (
                          <div className="mb-3 space-y-2 border-b border-[#E7E5E4] dark:border-[#2A2524] pb-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                              <Cpu className="w-3 h-3 text-[#F97316]" />
                              <span>Tool Execution Trace</span>
                            </div>

                            {msg.tool_calls.map((tc, tcIdx) => {
                              const toolKey = `${msg.id}-tc-${tcIdx}`
                              const isCollapsed = collapsedTools[toolKey] !== false // default collapsed
                              const durStr = tc.duration_seconds
                                ? `${tc.duration_seconds.toFixed(1)}s`
                                : tc.started_at && tc.completed_at
                                ? `${((tc.completed_at - tc.started_at) / 1000).toFixed(1)}s`
                                : ''

                              return (
                                <div
                                  key={tc.id || tcIdx}
                                  className="rounded-xl bg-slate-50 dark:bg-[#14161B] border border-[#E7E5E4] dark:border-[#2A2524] overflow-hidden text-xs"
                                >
                                  <div
                                    onClick={() =>
                                      setCollapsedTools((prev) => ({
                                        ...prev,
                                        [toolKey]: !isCollapsed
                                      }))
                                    }
                                    className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/5 select-none"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {getToolIcon(tc.name)}
                                      <span className="font-mono text-slate-800 dark:text-slate-200 font-medium truncate">
                                        {tc.name}
                                      </span>
                                      {tc.status === 'running' ? (
                                        <span className="flex items-center gap-1 text-[10px] text-[#F97316] bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 font-mono font-medium">
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-ping" />
                                          Executing...
                                        </span>
                                      ) : tc.status === 'failed' || tc.is_error ? (
                                        <span className="flex items-center gap-1 text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 font-mono font-medium">
                                          <X className="w-3 h-3" />
                                          Failed {durStr ? `(${durStr})` : ''}
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono font-medium">
                                          <Check className="w-3 h-3 text-emerald-500" />
                                          Done {durStr ? `(${durStr})` : ''}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-slate-400">
                                      {isCollapsed ? (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                  </div>

                                  {!isCollapsed && (
                                    <div className="p-3 border-t border-[#E7E5E4] dark:border-[#2A2524] bg-slate-100/50 dark:bg-[#0A0C0E] space-y-3">
                                      {tc.args && Object.keys(tc.args).length > 0 && (
                                        <div>
                                          <div className="text-[10px] font-medium text-slate-500 uppercase mb-1 font-mono">
                                            Arguments:
                                          </div>
                                          {(() => {
                                            let codeStr = ''
                                            let lang = 'json'
                                            if (typeof tc.args === 'string') {
                                              codeStr = tc.args
                                              lang = tc.name.toLowerCase().includes('terminal') || tc.name.toLowerCase().includes('bash') || tc.name.toLowerCase().includes('exec') ? 'bash' : 'json'
                                            } else if (tc.args.cmd || tc.args.command || tc.args.script) {
                                              codeStr = tc.args.cmd || tc.args.command || tc.args.script
                                              lang = 'bash'
                                            } else {
                                              codeStr = JSON.stringify(tc.args, null, 2)
                                              lang = 'json'
                                            }
                                            return (
                                              <div className="rounded-xl overflow-hidden border border-[#E7E5E4] dark:border-[#2A2524] text-xs">
                                                <CodeBlock code={codeStr} language={lang} showLineNumbers={false} />
                                              </div>
                                            )
                                          })()}
                                        </div>
                                      )}

                                      {tc.output && (
                                        <div>
                                          <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 uppercase mb-1 font-mono">
                                            <span>Output:</span>
                                            <button
                                              onClick={() =>
                                                handleCopyToolOutput(
                                                  tc.id || toolKey,
                                                  tc.output || ''
                                                )
                                              }
                                              className="hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                                            >
                                              {copiedToolId === (tc.id || toolKey) ? (
                                                <Check className="w-3 h-3 text-emerald-500" />
                                              ) : (
                                                <Copy className="w-3 h-3" />
                                              )}
                                              <span>Copy</span>
                                            </button>
                                          </div>
                                          {(() => {
                                            let codeStr = typeof tc.output === 'string' ? tc.output : JSON.stringify(tc.output, null, 2)
                                            let lang = 'bash'
                                            if (codeStr.trim().startsWith('{') || codeStr.trim().startsWith('[')) {
                                              try {
                                                const parsed = JSON.parse(codeStr)
                                                codeStr = JSON.stringify(parsed, null, 2)
                                                lang = 'json'
                                              } catch {
                                                lang = 'bash'
                                              }
                                            } else if (codeStr.includes('diff --git') || codeStr.includes('@@ -')) {
                                              lang = 'diff'
                                            }
                                            return (
                                              <div className="rounded-xl overflow-hidden border border-[#E7E5E4] dark:border-[#2A2524] text-xs max-h-72 overflow-y-auto">
                                                <CodeBlock code={codeStr} language={lang} showLineNumbers={false} />
                                              </div>
                                            )
                                          })()}
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
                          <div className="mb-3 rounded-xl bg-slate-50 dark:bg-[#14161B] border border-[#E7E5E4] dark:border-[#2A2524] overflow-hidden text-xs">
                            <div
                              onClick={() => {
                                const k = `reasoning-${msg.id || idx}`
                                setCollapsedReasoning((prev) => ({ ...prev, [k]: !prev[k] }))
                              }}
                              className="px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/5 select-none text-slate-600 dark:text-slate-400"
                            >
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                                <span className="font-medium text-[11px] font-mono">
                                  Hermes Thought Trace
                                </span>
                              </div>
                              {collapsedReasoning[`reasoning-${msg.id || idx}`] ? (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>

                            {!collapsedReasoning[`reasoning-${msg.id || idx}`] && (
                              <div className="p-3 border-t border-[#E7E5E4] dark:border-[#2A2524] bg-slate-100/50 dark:bg-[#0A0C0E] text-[11px] text-slate-600 dark:text-slate-400 italic font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                {msg.reasoning}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message Main Text Content */}
                        {isUser ? (
                          <div className="space-y-2 select-text">
                            {/* Attachments preview */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1 pb-1">
                                {msg.attachments.map((att) =>
                                  att.isImage ? (
                                    <div
                                      key={att.id}
                                      onClick={() =>
                                        att.dataUrl &&
                                        setPreviewModalImage({ url: att.dataUrl, title: att.name })
                                      }
                                      className="group relative w-28 h-20 sm:w-36 sm:h-24 rounded-xl overflow-hidden border border-orange-500/30 bg-black/20 cursor-pointer shadow-xs hover:border-[#F97316] transition-all"
                                      title="Click to preview screenshot"
                                    >
                                      <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                        <span className="text-[10px] bg-black/70 px-2 py-0.5 rounded-full font-mono font-medium">
                                          View Image
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <a
                                      key={att.id}
                                      href={att.dataUrl}
                                      download={att.name}
                                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-black/40 border border-orange-500/30 text-xs hover:border-[#F97316] transition-colors shadow-2xs"
                                      title={`Download ${att.name}`}
                                    >
                                      <FileText className="w-4 h-4 text-[#F97316] shrink-0" />
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate max-w-[140px] text-slate-900 dark:text-slate-100">
                                          {att.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {formatFileSize(att.size)}
                                        </span>
                                      </div>
                                    </a>
                                  )
                                )}
                              </div>
                            )}

                            {msg.content && (
                              <div className="whitespace-pre-wrap break-words leading-relaxed">
                                {msg.content}
                              </div>
                            )}
                          </div>
                        ) : (
                          msg.content && msg.content.trim() ? (
                            <div className="leading-relaxed select-text">
                              <MarkdownRenderer content={msg.content} />
                            </div>
                          ) : null
                        )}
                      </div>

                      {/* Message Actions (Assistant Bubble Footer - TASK-2.5) */}
                      {!isUser && (
                        <div className="flex items-center gap-2 mt-1.5 px-1">
                          <button
                            onClick={() => handleCopyMessage(msg.id || idx, msg.content)}
                            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-0.5 px-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Copy message text"
                          >
                            {copiedMessageId === (msg.id || idx) ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500 font-medium">Copied</span>
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
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 dark:text-[#FB923C] hover:bg-orange-500/20 py-0.5 px-2 rounded-md bg-orange-500/10 border border-orange-500/25 transition-all cursor-pointer"
                            title="Convert this message into a Kanban issue"
                          >
                            <CheckSquare className="w-3 h-3" />
                            <span>Convert to Issue</span>
                          </button>

                          {/* Regenerate / Retry Button (Fase 4: TASK-CHAT-4.4) */}
                          <button
                            onClick={() => handleRegenerateFromTurn(idx)}
                            disabled={connectionStatus === 'streaming'}
                            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-orange-600 dark:hover:text-[#FB923C] py-0.5 px-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                            title="Regenerate this response"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        </div>
                      )}

                      {/* User Message Actions (Fase 4: TASK-CHAT-4.4) */}
                      {isUser && (
                        <div className="flex items-center gap-2 mt-1.5 px-1">
                          <button
                            onClick={() => handleEditPrompt(msg.content)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 py-0.5 px-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Edit prompt in input box"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleCopyMessage(msg.id || idx, msg.content)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 py-0.5 px-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Copy prompt text"
                          >
                            {copiedMessageId === (msg.id || idx) ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-sm shrink-0 mt-0.5 text-[#F97316]">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Live Streaming Assistant Message */}
              {streamingMessage && (
                <div className="flex gap-3 max-w-4xl mx-auto justify-start">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-base shrink-0 mt-0.5">
                    {currentAgent.avatar || '🤖'}
                  </div>

                  <div className="flex flex-col items-start min-w-0 max-w-2xl">
                    <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-white dark:bg-[#191C21] text-slate-900 dark:text-slate-100 border border-[#E7E5E4] dark:border-[#2A2524] shadow-xs w-full">
                      {/* Streaming Tool Calls */}
                      {streamingMessage.tool_calls && streamingMessage.tool_calls.length > 0 && (
                        <div className="mb-3 space-y-2 border-b border-[#E7E5E4] dark:border-[#2A2524] pb-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                            <Cpu className="w-3 h-3 text-[#F97316]" />
                            <span>Tool Execution Trace</span>
                          </div>

                          {streamingMessage.tool_calls.map((tc, tcIdx) => {
                            const dur = tc.duration_seconds
                              ? `${tc.duration_seconds.toFixed(1)}s`
                              : tc.started_at && tc.completed_at
                              ? `${((tc.completed_at - tc.started_at) / 1000).toFixed(1)}s`
                              : ''

                            return (
                              <div
                                key={tc.id || tcIdx}
                                className="rounded-xl bg-slate-50 dark:bg-[#14161B] border border-[#E7E5E4] dark:border-[#2A2524] px-3 py-2 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {getToolIcon(tc.name)}
                                  <span className="font-mono text-slate-800 dark:text-slate-200 font-medium truncate">
                                    {tc.name}
                                  </span>
                                  {tc.status === 'running' ? (
                                    <span className="flex items-center gap-1 text-[10px] text-[#F97316] bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 font-mono font-medium">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-ping" />
                                      Executing...
                                    </span>
                                  ) : tc.status === 'failed' || tc.is_error ? (
                                    <span className="flex items-center gap-1 text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 font-mono font-medium">
                                      <X className="w-3 h-3" />
                                      Failed {dur ? `(${dur})` : ''}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono font-medium">
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      Done {dur ? `(${dur})` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Streaming Reasoning / Thinking */}
                      {streamingMessage.reasoning && (
                        <div className="mb-3 rounded-xl bg-slate-50 dark:bg-[#14161B] border border-[#E7E5E4] dark:border-[#2A2524] p-3 text-xs text-slate-600 dark:text-slate-400 italic font-mono whitespace-pre-wrap leading-relaxed">
                          <div className="flex items-center gap-1.5 text-[#F97316] font-medium mb-1 not-italic">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Thinking...</span>
                          </div>
                          {streamingMessage.reasoning}
                        </div>
                      )}

                      {/* Streaming Content */}
                      <div className="whitespace-pre-wrap break-words leading-relaxed">
                        {streamingMessage.content}
                        <span className="inline-block w-2 h-4 bg-[#F97316] animate-pulse ml-0.5 align-middle" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PENDING TOOL APPROVAL CARDS (Fase 2: TASK-CHAT-2.1) ─────────── */}
              {pendingApprovals.map((approval) => {
                const approvalKey = approval.approval_id || approval.id
                const isSubmitting = isSubmittingApproval === approvalKey
                const isDangerHigh = approval.danger_level === 'high'

                // Extract command if bash/terminal tool
                let cmdString: string | null = null
                if (approval.args) {
                  if (typeof approval.args === 'string') {
                    cmdString = approval.args
                  } else if (approval.args.cmd || approval.args.command || approval.args.script) {
                    cmdString = approval.args.cmd || approval.args.command || approval.args.script
                  }
                }

                return (
                  <div
                    key={approvalKey}
                    className="max-w-4xl mx-auto my-3 rounded-2xl border-2 border-amber-500/50 dark:border-amber-500/40 bg-white dark:bg-[#191C21] p-5 shadow-lg shadow-amber-500/5 transition-all duration-200"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E7E5E4] dark:border-[#2A2524]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#FB923C] shrink-0">
                          <ShieldAlert className="w-4 h-4 text-[#FB923C]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>Action Requires Human Approval</span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${
                                isDangerHigh
                                  ? 'bg-red-500/15 text-red-500 border-red-500/30'
                                  : 'bg-amber-500/15 text-[#FB923C] border-amber-500/30'
                              }`}
                            >
                              {approval.danger_level || 'medium'} risk
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-body">
                            {approval.description || `Hermes agent requested permission to execute ${approval.tool_name}`}
                          </p>
                        </div>
                      </div>

                      {/* Tool Name Badge */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#14161B] border border-[#E7E5E4] dark:border-[#2A2524] text-xs font-mono text-slate-700 dark:text-slate-300 shrink-0">
                        {getToolIcon(approval.tool_name)}
                        <span className="font-semibold text-orange-600 dark:text-[#FB923C]">{approval.tool_name}</span>
                      </div>
                    </div>

                    {/* Code / Command / Arguments Preview */}
                    <div className="mt-3.5 space-y-2">
                      <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Proposed Command / Arguments:</span>
                        {cmdString && <span className="text-[10px] text-slate-400 font-mono">Bash / Terminal</span>}
                      </div>

                      {cmdString ? (
                        <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 text-slate-100 font-mono text-xs overflow-x-auto selection:bg-orange-500 selection:text-white">
                          <div className="flex items-center gap-2 text-slate-500 text-[10px] mb-1.5 select-none font-mono">
                            <Terminal className="w-3.5 h-3.5 text-[#FB923C]" />
                            <span>$ bash</span>
                          </div>
                          <code className="text-emerald-400 font-mono block whitespace-pre-wrap">{cmdString}</code>
                        </div>
                      ) : (
                        <pre className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                          {typeof approval.args === 'string'
                            ? approval.args
                            : JSON.stringify(approval.args, null, 2)}
                        </pre>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3.5 border-t border-[#E7E5E4] dark:border-[#2A2524] flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Select an action to resume agent execution:
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Deny Button */}
                        <button
                          onClick={() => handleRespondApproval(approvalKey, 'deny')}
                          disabled={isSubmitting}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Deny</span>
                        </button>

                        {/* Always in Session Button */}
                        <button
                          onClick={() => handleRespondApproval(approvalKey, 'session')}
                          disabled={isSubmitting}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-[#FB923C] border border-orange-500/30 transition-all cursor-pointer disabled:opacity-50"
                          title="Always allow this tool for the rest of this session"
                        >
                          <span>Always in Session</span>
                        </button>

                        {/* Allow Once Button */}
                        <button
                          onClick={() => handleRespondApproval(approvalKey, 'once')}
                          disabled={isSubmitting}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white transition-all cursor-pointer shadow-sm hover:shadow-orange-500/20 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Allow Once</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* ── PENDING AGENT CLARIFICATION CARD (Fase 2: TASK-CHAT-2.4) ─────────── */}
              {pendingClarify && (
                <div className="max-w-4xl mx-auto my-3 rounded-2xl border-2 border-orange-500/40 dark:border-orange-500/30 bg-white dark:bg-[#191C21] p-5 shadow-lg shadow-orange-500/5 transition-all duration-200">
                  <div className="flex items-start gap-3 pb-3 border-b border-[#E7E5E4] dark:border-[#2A2524]">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-[#F97316] shrink-0">
                      <HelpCircle className="w-4 h-4 text-[#F97316]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>Agent Clarification Request</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/15 text-[#FB923C] border border-orange-500/30 uppercase tracking-wider font-semibold">
                          Input Needed
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-body">
                        Hermes needs your guidance before proceeding with the next step.
                      </p>
                    </div>
                  </div>

                  {/* Question */}
                  <div className="my-3.5 p-3 rounded-xl bg-slate-50 dark:bg-[#14161B] border border-[#E7E5E4] dark:border-[#2A2524]">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 font-body leading-relaxed">
                      {pendingClarify.question}
                    </p>
                  </div>

                  {/* Quick Options Chips */}
                  {pendingClarify.options && pendingClarify.options.length > 0 && (
                    <div className="space-y-1.5 mb-3.5">
                      <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Suggested Options:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pendingClarify.options.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => handleRespondClarify(opt)}
                            disabled={isSubmittingClarify}
                            className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-orange-500/10 hover:bg-orange-500/20 text-slate-800 dark:text-slate-200 hover:text-orange-600 dark:hover:text-[#FB923C] border border-orange-500/25 transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-50 text-left"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Input Field */}
                  {pendingClarify.allow_custom !== false && (
                    <div className="pt-2 border-t border-[#E7E5E4] dark:border-[#2A2524]">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={clarifyDraft}
                          onChange={(e) => setClarifyDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && clarifyDraft.trim()) {
                              handleRespondClarify(clarifyDraft.trim())
                            }
                          }}
                          placeholder="Type a custom answer or preference..."
                          disabled={isSubmittingClarify}
                          className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-[#14161B] border border-[#E7E5E4] dark:border-[#2A2524] rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#F97316] transition-colors"
                        />
                        <button
                          onClick={() => clarifyDraft.trim() && handleRespondClarify(clarifyDraft.trim())}
                          disabled={!clarifyDraft.trim() || isSubmittingClarify}
                          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F97316] text-white hover:bg-[#FB923C] disabled:opacity-40 transition-colors cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
                        >
                          <span>Submit</span>
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Footer */}
        <div className="p-4 border-t border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#14161C]">
          <div className="max-w-4xl mx-auto">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (e.dataTransfer.files) {
                  Array.from(e.dataTransfer.files).forEach((f) => processUploadedFile(f))
                }
              }}
              className="relative rounded-2xl bg-slate-50 dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] focus-within:border-[#F97316] shadow-xs flex flex-col transition-colors"
            >
              {/* ── SLASH COMMANDS AUTOCOMPLETE POPOVER (Fase 4: TASK-CHAT-4.1 & 4.2) ─── */}
              {isSlashPopoverOpen && filteredSlashCommands.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] rounded-2xl shadow-2xl overflow-hidden z-30 p-1.5 font-body animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between select-none">
                    <span>Hermes Slash Commands</span>
                    <span className="hidden sm:inline">↑↓ navigate • Tab/Enter select • Esc close</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-white/5">
                    {filteredSlashCommands.map((cmd, idx) => {
                      const isSelected = idx === slashSelectedIdx
                      return (
                        <div
                          key={cmd.command}
                          onClick={() => handleSelectSlashCommand(cmd)}
                          onMouseEnter={() => setSlashSelectedIdx(idx)}
                          className={`px-3 py-2 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-orange-500/10 text-slate-900 dark:text-slate-100 border-l-2 border-[#F97316]'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-orange-500/15 text-[#FB923C] shrink-0">
                              {cmd.command}
                            </span>
                            <span className="text-xs font-medium truncate text-slate-900 dark:text-slate-100">
                              {cmd.label}
                            </span>
                            {cmd.argsPlaceholder && (
                              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                                {cmd.argsPlaceholder}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[200px] sm:max-w-[280px]">
                            {cmd.description}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Staged Attachments Tray */}
              {stagedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pt-2.5 pb-2 border-b border-[#E7E5E4] dark:border-[#2A2524]/60 bg-slate-100/50 dark:bg-black/20 rounded-t-2xl">
                  {stagedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="group relative flex items-center gap-2 p-1.5 rounded-xl bg-white dark:bg-[#14161B] border border-[#E7E5E4] dark:border-[#2A2524] shadow-2xs text-xs"
                    >
                      {file.isImage ? (
                        <div
                          onClick={() => file.dataUrl && setPreviewModalImage({ url: file.dataUrl, title: file.name })}
                          className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-black/30 border border-[#E7E5E4] dark:border-[#2A2524] shrink-0 cursor-pointer"
                          title="Click to preview image"
                        >
                          <img
                            src={file.dataUrl}
                            alt={file.name}
                            className="w-full h-full object-cover hover:scale-110 transition-transform"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#F97316] shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}

                      <div className="flex flex-col min-w-0 pr-5">
                        <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatFileSize(file.size)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStagedFile(file.id)}
                        className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 text-slate-600 dark:text-slate-300 transition-colors shadow-xs cursor-pointer"
                        title="Remove attachment"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {isReadingFile && (
                    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 font-mono">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F97316]" />
                      <span>Reading file...</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── LIVE TELEMETRY STATUS BAR (Fase 3: TASK-CHAT-3.1) ─────────── */}
              <div className="flex items-center justify-between px-3.5 py-1.5 text-[11px] font-mono border-b border-[#E7E5E4] dark:border-[#2A2524]/60 bg-slate-100/50 dark:bg-black/20 text-slate-500 dark:text-slate-400 select-none">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {/* TPS Speed */}
                  <div className="flex items-center gap-1.5" title="Tokens streamed per second">
                    <Activity className={`w-3.5 h-3.5 ${connectionStatus === 'streaming' ? 'text-[#F97316] animate-pulse' : 'text-slate-400'}`} />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {liveTps ? `⚡ ${liveTps} tps` : '⚡ 0.0 tps'}
                    </span>
                  </div>

                  <span>•</span>

                  {/* Token Counters */}
                  <div className="flex items-center gap-1" title="Input & Output tokens processed this turn">
                    <span>In:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium">
                      {telemetry?.input_tokens ? `${(telemetry.input_tokens / 1000).toFixed(1)}k` : `${Math.round(estimatedSessionTokens / 2)}`}
                    </span>
                    <span className="text-slate-400">/</span>
                    <span>Out:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium">
                      {telemetry?.output_tokens || streamTokenCount}
                    </span>
                  </div>

                  {/* Cache hit percentage if available */}
                  {telemetry?.turn_cache_hit_percent !== undefined && telemetry.turn_cache_hit_percent > 0 && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-medium" title="Prompt cache hit percentage">
                        🎯 {telemetry.turn_cache_hit_percent}% cache
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Compress notice banner */}
                  {compressNotice && (
                    <span className="text-[10px] text-[#FB923C] font-semibold animate-fade-in truncate max-w-[160px] sm:max-w-none">
                      {compressNotice}
                    </span>
                  )}

                  {/* Execution Elapsed Duration */}
                  <div className="flex items-center gap-1 shrink-0" title="Turn execution elapsed duration">
                    <span>⏱️</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {turnDuration > 0 ? `${turnDuration.toFixed(1)}s` : '0.0s'}
                    </span>
                  </div>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={`Ask ${currentAgent.name} (Shift+Enter for newline, Enter to send, Ctrl+V to paste screenshot)...`}
                rows={2}
                disabled={connectionStatus === 'streaming'}
                className="w-full bg-transparent px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none disabled:opacity-60"
              />

              <div className="flex items-center justify-between px-3.5 py-2 border-t border-[#E7E5E4] dark:border-[#2A2524]/60">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 select-none">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    multiple
                    accept="image/*,.txt,.log,.json,.yaml,.yml,.md,.py,.ts,.js,.sh,.tf,.sql,.csv"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={connectionStatus === 'streaming'}
                    className="p-1.5 text-slate-500 hover:text-[#F97316] hover:bg-slate-200/70 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                    title="Attach files or screenshots (or paste screenshot directly with Ctrl+V)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <span className="text-slate-500">Press <kbd className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-[#2A2524] text-slate-600 dark:text-slate-400 font-mono text-[10px]">Enter ↵</kbd></span>
                  <span className="hidden sm:inline text-slate-400">•</span>
                  <span className="hidden sm:inline text-[10px] text-slate-400">Paste screenshot with <kbd className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-[#2A2524] text-slate-600 dark:text-slate-400 font-mono text-[10px]">Ctrl+V</kbd></span>
                </div>

                <div className="flex items-center gap-2">
                  {connectionStatus === 'streaming' ? (
                    <button
                      onClick={handleInterrupt}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      <StopCircle className="w-4 h-4" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputPrompt.trim() && stagedFiles.length === 0}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs shadow-orange-500/20 cursor-pointer active:scale-95"
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

      {/* ── YOLO MODE SAFETY CONFIRMATION MODAL (Fase 2: TASK-CHAT-2.3) ──────── */}
      {showYoloModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] rounded-2xl p-6 shadow-2xl space-y-4 font-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-[#F97316]">
                <Zap className="w-5 h-5 fill-[#F97316]" />
              </div>
              <div>
                <h3 className="text-base font-semibold font-display text-slate-900 dark:text-slate-100">
                  Enable YOLO Mode?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Autonomous execution without safety prompts
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 font-body leading-relaxed space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#FB923C]" />
                <span>Security & Safety Warning</span>
              </p>
              <p>
                YOLO (You Only Live Once) Mode enables fully autonomous agent execution. All tool executions, terminal commands, and filesystem modifications will be granted automatically without requiring interactive confirmation.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7E5E4] dark:border-[#2A2524]">
              <button
                onClick={() => setShowYoloModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmYolo}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F97316] text-white hover:bg-[#FB923C] shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Enable YOLO Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal for Attached Images */}
      {previewModalImage && (
        <ImageDiagramPreviewModal
          isOpen={Boolean(previewModalImage)}
          onClose={() => setPreviewModalImage(null)}
          imageUrl={previewModalImage.url}
          title={previewModalImage.title || 'Attached Image Preview'}
        />
      )}
    </div>
  )
}
