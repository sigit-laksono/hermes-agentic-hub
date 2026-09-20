import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  Pin,
  MoreHorizontal,
  PanelRight,
  ChevronDown,
  ChevronRight,
  Paperclip,
  ArrowUp,
  Smile,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Plus,
  Search,
  Filter,
  Play,
  Sparkles,
  Lock,
  GitFork,
  BarChart2,
  ListChecks,
  AlertTriangle,
  Eye,
  Download,
  FileCode,
  Image as ImageIcon
} from 'lucide-react'
import {
  Task,
  TaskStatus,
  AIAgent,
  TaskAttachment,
  TaskComment,
  TaskEstimateResult,
  TaskLinksInfo
} from '../types'
import { hermesApi } from '../api/hermesApi'
import { MarkdownRenderer } from './MarkdownRenderer'
import { CodeBlock } from './CodeBlock'
import { ImageDiagramPreviewModal } from './ImageDiagramPreviewModal'

interface TaskDetailModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  agents: AIAgent[]
  allTasks?: Task[]
  activeBoard?: string
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void
  onRunAgent: (taskId: string) => Promise<boolean | void>
  onSendComment: (taskId: string, note: string) => Promise<boolean> | boolean
  onRefreshTasks?: () => Promise<void> | void
}

interface ParsedStep {
  time: string
  tool: string
  detail: string
  duration: string
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  agents,
  allTasks = [],
  activeBoard = 'default',
  onUpdateStatus,
  onRunAgent,
  onSendComment,
  onRefreshTasks
}) => {
  const currentBoard = task?.boardSlug || activeBoard || 'default'

  // View mode: 'issue' or 'execution_log'
  const [viewMode, setViewMode] = useState<'issue' | 'execution_log'>('issue')

  // Execution log sub-tab: 'steps' or 'raw_log'
  const [logViewTab, setLogViewTab] = useState<'steps' | 'raw_log'>('steps')

  // Sidebar toggle
  const [showProperties, setShowProperties] = useState(true)

  // Collapsible sidebar sections
  const [openProperties, setOpenProperties] = useState(true)
  const [openEstimate, setOpenEstimate] = useState(true)
  const [openDependencies, setOpenDependencies] = useState(true)
  const [openPullRequests, setOpenPullRequests] = useState(false)
  const [openExecutionLog, setOpenExecutionLog] = useState(true)
  const [openDetails, setOpenDetails] = useState(true)

  // Activities accordion
  const [showActivities, setShowActivities] = useState(false)

  // Backend live state
  const [backendTask, setBackendTask] = useState<any>(null)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [rawLog, setRawLog] = useState<string>('')
  const [logSizeBytes, setLogSizeBytes] = useState<number>(0)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // AI Actions state (Fase 1)
  const [isSpecifying, setIsSpecifying] = useState(false)
  const [isDecomposing, setIsDecomposing] = useState(false)
  const [isEstimating, setIsEstimating] = useState(false)
  const [estimateResult, setEstimateResult] = useState<TaskEstimateResult | null>(null)
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Subtasks & Dependencies state (Fase 1)
  const [childTasks, setChildTasks] = useState<any[]>([])
  const [linksInfo, setLinksInfo] = useState<TaskLinksInfo>({ parents: [], children: [], blocked_by_active: false })
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [isSubmittingSubtask, setIsSubmittingSubtask] = useState(false)
  const [showAddLink, setShowAddLink] = useState(false)
  const [linkRelationType, setLinkRelationType] = useState<'blocked_by' | 'blocks'>('blocked_by')
  const [selectedTargetTaskId, setSelectedTargetTaskId] = useState<string>('')
  const [isLinking, setIsLinking] = useState(false)

  // Actions state
  const [newCommentText, setNewCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [runningAgent, setRunningAgent] = useState(false)

  // Filter & UI toggles
  const [searchRunQuery, setSearchRunQuery] = useState('')
  const [copiedCommentId, setCopiedCommentId] = useState<string | number | null>(null)
  const [copiedLog, setCopiedLog] = useState(false)
  const [isPinned, setIsPinned] = useState(false)

  // Fase 5: In-App Image & Code Preview Modal States
  const [previewImageModal, setPreviewImageModal] = useState<{
    isOpen: boolean
    imageUrl: string
    title: string
    size?: number
    downloadUrl?: string
  } | null>(null)

  const [previewCodeModal, setPreviewCodeModal] = useState<{
    isOpen: boolean
    attachment: TaskAttachment
    content: string
    loading: boolean
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  const canonicalId = task ? hermesApi.getCanonicalTaskId(task) : ''

  // Keyboard shortcut: Escape to close modal or sub-modals
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImageModal?.isOpen) {
          setPreviewImageModal(null)
          return
        }
        if (previewCodeModal?.isOpen) {
          setPreviewCodeModal(null)
          return
        }
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, previewImageModal, previewCodeModal])

  // Helper to categorize attachment files
  const getFileBadge = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    if (['tf', 'tfvars', 'hcl'].includes(ext)) {
      return { label: 'Terraform', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', isImage: false }
    }
    if (['yaml', 'yml', 'json'].includes(ext)) {
      return { label: 'Config', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', isImage: false }
    }
    if (['svg', 'png', 'jpg', 'jpeg'].includes(ext)) {
      return { label: ext === 'svg' ? 'SVG Diagram' : 'Diagram Image', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', isImage: true }
    }
    if (['py', 'sh', 'sql', 'bash'].includes(ext)) {
      return { label: 'Script', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', isImage: false }
    }
    return { label: 'File', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', isImage: false }
  }

  // Open appropriate previewer based on file type
  const handleInspectAttachment = async (att: TaskAttachment) => {
    const badge = getFileBadge(att.filename)
    if (badge.isImage) {
      setPreviewImageModal({
        isOpen: true,
        imageUrl: hermesApi.getAttachmentDownloadUrl(att.id),
        title: att.filename,
        size: att.size,
        downloadUrl: hermesApi.getAttachmentDownloadUrl(att.id)
      })
    } else {
      setPreviewCodeModal({
        isOpen: true,
        attachment: att,
        content: '',
        loading: true
      })
      try {
        const content = await hermesApi.getAttachmentContent(att.id)
        setPreviewCodeModal(prev =>
          prev ? { ...prev, content: content || 'No text content available or binary file.', loading: false } : null
        )
      } catch {
        setPreviewCodeModal(prev =>
          prev ? { ...prev, content: 'Failed to load file content.', loading: false } : null
        )
      }
    }
  }

  // 1. Fetch live data from Hermes backend
  const loadLiveDetails = async () => {
    if (!canonicalId) return
    try {
      const [details, logData, linksData] = await Promise.all([
        hermesApi.getTaskDetails(canonicalId, currentBoard),
        hermesApi.getTaskLog(canonicalId, currentBoard),
        hermesApi.getTaskLinks(canonicalId, currentBoard)
      ])

      if (details) {
        if (details.task) setBackendTask(details.task)
        if (details.comments) {
          setComments(
            details.comments.map((c: any) => ({
              id: c.id,
              author: c.author || 'Hermes Agent',
              authorAvatar:
                c.author?.toLowerCase().includes('lead')
                  ? '👑'
                  : c.author?.toLowerCase().includes('engineer') || c.author === 'default'
                  ? '🤖'
                  : '👤',
              authorRole: c.author?.toLowerCase().includes('lead') ? 'Team Lead' : 'Engineer',
              body: c.body,
              created_at: c.created_at ? formatTimestamp(c.created_at) : 'Just now'
            }))
          )
        }
        if (details.events) setEvents(details.events)
        if (details.runs) setRuns(details.runs)
        if (details.attachments) setAttachments(details.attachments)
        if (details.child_results && details.child_results.length > 0) {
          setChildTasks(details.child_results)
        }
      }

      if (linksData) {
        setLinksInfo(linksData)
        if (linksData.subtasks && linksData.subtasks.length > 0) {
          setChildTasks(linksData.subtasks)
        } else if (linksData.children && linksData.children.length > 0) {
          setChildTasks(linksData.children)
        }
      }

      if (logData) {
        setRawLog(logData.content || '')
        setLogSizeBytes(logData.size_bytes || 0)
      }
    } catch (err) {
      console.warn('Failed to load live Hermes task details:', err)
    }
  }

  // Initial load + Polling when in_progress
  useEffect(() => {
    if (!isOpen || !task) return

    setLoadingDetails(true)
    loadLiveDetails().finally(() => setLoadingDetails(false))

    let interval: any = null
    if (task.status === 'in_progress' || backendTask?.status === 'running') {
      interval = setInterval(loadLiveDetails, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isOpen, canonicalId, task?.status, backendTask?.status])

  // Format Unix timestamp helper (safely handles numbers, strings, nulls)
  function formatTimestamp(ts: any): string {
    if (!ts) return '-'
    if (typeof ts === 'string') {
      if (isNaN(Number(ts))) return ts
      ts = Number(ts)
    }
    const date = new Date(ts * 1000)
    if (isNaN(date.getTime())) return String(ts)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // Parse raw log output into structured chronological steps dynamically
  const parsedSteps: ParsedStep[] = useMemo(() => {
    if (!rawLog) return []

    const steps: ParsedStep[] = []
    const lines = rawLog.split('\n')
    let baseSeconds = 5

    for (const rawLine of lines) {
      const line = rawLine.trim()
      // Match Hermes tool activity indicators in logs
      if (line.startsWith('┊') || line.startsWith('⚡') || line.startsWith('📚') || line.startsWith('💻')) {
        const clean = line.replace(/^[┊\s]+/, '').trim()
        const durMatch = clean.match(/(\d+\.\d+s)$/)
        const dur = durMatch ? durMatch[1] : '<0.1s'
        const content = clean.replace(/(\d+\.\d+s)$/, '').trim()

        let tool = 'Task'
        if (content.includes('kanban_')) tool = 'Kanban'
        else if (content.includes('skill')) tool = 'Skill'
        else if (content.includes('terminal') || content.includes('$')) tool = 'Terminal'
        else if (content.includes('write') || content.includes('file')) tool = 'Write'
        else if (content.includes('read')) tool = 'Read'

        const m = Math.floor(baseSeconds / 60)
        const s = baseSeconds % 60
        const timeStr = `+${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`

        steps.push({
          time: timeStr,
          tool,
          detail: content,
          duration: dur
        })
        baseSeconds += 4
      }
    }
    return steps
  }, [rawLog])

  // Extract agent final synthesis output from raw log or Hermes summary
  const agentFinalOutput = useMemo(() => {
    if (backendTask?.latest_summary) return backendTask.latest_summary
    if (backendTask?.result) return backendTask.result
    if (task?.reviewReport) return task.reviewReport

    // Check if log contains Hermes box: ╭─ ☤ Hermes ─── ... ╰─
    if (rawLog) {
      const match = rawLog.match(/╭─ ☤ Hermes [^\n]*\n([\s\S]*?)╰─/)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    return null
  }, [backendTask, task, rawLog])

  if (!isOpen || !task) return null

  // Post new comment to backend
  const handlePostComment = async () => {
    if (!newCommentText.trim() || sendingComment) return
    setSendingComment(true)
    const text = newCommentText.trim()
    try {
      await onSendComment(task.id, text)
      await hermesApi.addTaskComment(canonicalId, text, 'Muhammad Sigit')
      setNewCommentText('')
      await loadLiveDetails()
      if (onRefreshTasks) onRefreshTasks()
    } catch (err: any) {
      alert(`Failed to post comment: ${err.message}`)
    } finally {
      setSendingComment(false)
    }
  }

  // Upload attachment to backend
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAttachment(true)
    try {
      const res = await hermesApi.uploadTaskAttachment(canonicalId, file, 'Muhammad Sigit', currentBoard)
      if (res.ok) {
        await loadLiveDetails()
        if (onRefreshTasks) onRefreshTasks()
      } else {
        alert(res.message || 'Failed to upload attachment')
      }
    } finally {
      setUploadingAttachment(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Update Status in backend
  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      onUpdateStatus(task.id, newStatus)
      await hermesApi.updateTaskStatus(canonicalId, newStatus, currentBoard)
      await loadLiveDetails()
      if (onRefreshTasks) onRefreshTasks()
    } catch (err: any) {
      console.warn('Status update error:', err)
    }
  }

  // Update Assignee in backend
  const handleAssigneeChange = async (newAssigneeProfile: string) => {
    try {
      await hermesApi.updateTask(canonicalId, { assignee: newAssigneeProfile }, currentBoard)
      await loadLiveDetails()
      if (onRefreshTasks) onRefreshTasks()
    } catch (err: any) {
      console.warn('Assignee update error:', err)
    }
  }

  // Trigger Run Agent
  const handleRunAgentClick = async () => {
    setRunningAgent(true)
    try {
      await onRunAgent(task.id)
      await loadLiveDetails()
      if (onRefreshTasks) onRefreshTasks()
    } finally {
      setRunningAgent(false)
    }
  }

  // Copy comment text
  const handleCopyComment = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text)
    setCopiedCommentId(id)
    setTimeout(() => setCopiedCommentId(null), 2000)
  }

  // -------------------------------------------------------------
  // Fase 1 Handlers: AI Specify, Decompose, Estimate, Links
  // -------------------------------------------------------------

  // 1. AI Specify Task
  const handleSpecifyTask = async () => {
    if (isSpecifying || !canonicalId) return
    setIsSpecifying(true)
    setActionNotice({ type: 'info', text: 'Hermes is analyzing and specifying task requirements with acceptance criteria...' })
    try {
      const res = await hermesApi.specifyTask(canonicalId, currentBoard)
      if (res.ok) {
        setActionNotice({
          type: 'success',
          text: res.new_title ? `Task specified: "${res.new_title}"` : 'Task successfully enriched with acceptance criteria!'
        })
        await loadLiveDetails()
        if (onRefreshTasks) onRefreshTasks()
      } else {
        setActionNotice({ type: 'error', text: res.reason || 'Failed to specify task.' })
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Error during task specification.' })
    } finally {
      setIsSpecifying(false)
    }
  }

  // 2. AI Decompose Task
  const handleDecomposeTask = async () => {
    if (isDecomposing || !canonicalId) return
    setIsDecomposing(true)
    setActionNotice({ type: 'info', text: 'Hermes is decomposing task into child sub-tasks...' })
    try {
      const res = await hermesApi.decomposeTask(canonicalId, currentBoard)
      if (res.ok) {
        const count = res.child_ids?.length || 0
        setActionNotice({
          type: 'success',
          text: `Task successfully decomposed into ${count} sub-tasks!`
        })
        await loadLiveDetails()
        if (onRefreshTasks) onRefreshTasks()
      } else {
        setActionNotice({ type: 'error', text: res.reason || 'Failed to decompose task.' })
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Error during task decomposition.' })
    } finally {
      setIsDecomposing(false)
    }
  }

  // 3. Complexity & Token Estimate
  const handleEstimateTask = async () => {
    if (isEstimating || !canonicalId) return
    setIsEstimating(true)
    try {
      const res = await hermesApi.estimateTask(canonicalId, currentBoard)
      setEstimateResult(res)
      if (!res.ok) {
        setActionNotice({ type: 'error', text: res.reason || 'Failed to generate complexity estimate.' })
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Error estimating task complexity.' })
    } finally {
      setIsEstimating(false)
    }
  }

  // 4. Toggle Subtask Status (Done <-> Todo)
  const handleToggleSubtaskStatus = async (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done'
    try {
      setChildTasks(prev =>
        prev.map(c => (c.id === subtaskId ? { ...c, status: newStatus } : c))
      )
      await hermesApi.updateTaskStatus(subtaskId, newStatus as TaskStatus, currentBoard)
      await loadLiveDetails()
      if (onRefreshTasks) onRefreshTasks()
    } catch (err) {
      console.warn('Failed to toggle subtask status:', err)
      await loadLiveDetails()
    }
  }

  // 5. Add Subtask Manually
  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubtaskTitle.trim() || isSubmittingSubtask || !canonicalId) return
    setIsSubmittingSubtask(true)
    try {
      const res = await hermesApi.createTask({
        title: newSubtaskTitle.trim(),
        assignee: backendTask?.assignee || 'default',
        priority: 0,
        board: currentBoard
      })
      const createdId = res?.task?.id
      if (createdId) {
        await hermesApi.createTaskLink(canonicalId, createdId, currentBoard)
        setNewSubtaskTitle('')
        setAddingSubtask(false)
        await loadLiveDetails()
        if (onRefreshTasks) onRefreshTasks()
      }
    } catch (err: any) {
      alert(`Failed to add subtask: ${err.message}`)
    } finally {
      setIsSubmittingSubtask(false)
    }
  }

  // 6. Create Dependency Link
  const handleCreateLink = async () => {
    if (!selectedTargetTaskId || isLinking || !canonicalId) return
    setIsLinking(true)
    try {
      const targetCanonical = hermesApi.getCanonicalTaskId(selectedTargetTaskId)
      let res
      if (linkRelationType === 'blocked_by') {
        res = await hermesApi.createTaskLink(targetCanonical, canonicalId, currentBoard)
      } else {
        res = await hermesApi.createTaskLink(canonicalId, targetCanonical, currentBoard)
      }
      if (res && res.ok) {
        setSelectedTargetTaskId('')
        setShowAddLink(false)
        await loadLiveDetails()
        if (onRefreshTasks) onRefreshTasks()
      } else {
        alert(res?.message || 'Failed to create link.')
      }
    } catch (err: any) {
      alert(`Failed to create link: ${err.message}`)
    } finally {
      setIsLinking(false)
    }
  }

  // 7. Delete Dependency Link
  const handleDeleteLink = async (parentId: string, childId: string) => {
    try {
      await hermesApi.deleteTaskLink(parentId, childId, currentBoard)
      await loadLiveDetails()
      if (onRefreshTasks) onRefreshTasks()
    } catch (err: any) {
      alert(`Failed to remove link: ${err.message}`)
    }
  }

  // Target tasks for linking (all tasks excluding current task)
  const availableTargetTasks = useMemo(() => {
    return (allTasks || []).filter(
      t => t.id !== task.id && hermesApi.getCanonicalTaskId(t) !== canonicalId
    )
  }, [allTasks, task.id, canonicalId])

  // Status mapping
  const statusOptions: { value: TaskStatus; label: string; dotColor: string }[] = [
    { value: 'backlog', label: 'Backlog', dotColor: 'bg-slate-500' },
    { value: 'todo', label: 'Todo', dotColor: 'bg-slate-400' },
    { value: 'in_progress', label: 'In Progress', dotColor: 'bg-amber-500' },
    { value: 'in_review', label: 'In Review', dotColor: 'bg-emerald-500' },
    { value: 'blocked', label: 'Blocked', dotColor: 'bg-rose-500' },
    { value: 'done', label: 'Done', dotColor: 'bg-blue-500' }
  ]

  const currentStatus = backendTask?.status
    ? backendTask.status === 'running'
      ? 'in_progress'
      : backendTask.status === 'review'
      ? 'in_review'
      : backendTask.status === 'triage'
      ? 'backlog'
      : (backendTask.status as TaskStatus)
    : task.status

  const currentStatusObj = statusOptions.find(s => s.value === currentStatus) || statusOptions[1]

  // Active run object from backend
  const activeRun = runs.length > 0 ? runs[0] : null

  // Filter steps by search query
  const filteredSteps = parsedSteps.filter(
    step =>
      step.detail.toLowerCase().includes(searchRunQuery.toLowerCase()) ||
      step.tool.toLowerCase().includes(searchRunQuery.toLowerCase())
  )

  // Current Assignee resolution
  const currentAssignee = backendTask?.assignee || task.assigneeProfile || task.assigneeName || 'default'
  const currentAgent = agents.find(a => a.id === currentAssignee || a.name === currentAssignee)

  // Compute duration from backend run timestamps
  let runDurationText = '-'
  if (activeRun?.started_at && activeRun?.ended_at) {
    runDurationText = `${Math.max(1, activeRun.ended_at - activeRun.started_at)}s`
  } else if (backendTask?.started_at && backendTask?.completed_at) {
    runDurationText = `${Math.max(1, backendTask.completed_at - backendTask.started_at)}s`
  } else if (activeRun) {
    runDurationText = 'Running'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 md:p-4 overflow-hidden animate-in fade-in duration-150 font-sans">
      <div className="relative w-full max-w-6xl h-[92vh] flex flex-col rounded-xl border border-[#23272F] bg-[#0D0F12] text-slate-100 shadow-2xl overflow-hidden">

        {/* 1. TOP TAB BAR */}
        <div className="h-10 border-b border-[#23272F] bg-[#111317] flex items-center justify-between px-3 select-none">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {/* Active Tab Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-t-lg bg-[#0D0F12] border-t-2 border-t-blue-500 border-x border-[#23272F] text-xs font-medium text-slate-200 shadow-xs">
              <span className={`w-2 h-2 rounded-full ${currentStatusObj.dotColor}`} />
              <span className="truncate max-w-[280px]">
                {task.id}: {backendTask?.title || task.title}
              </span>
            </div>

            <button
              onClick={() => {}}
              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-[#1C2027] transition-colors"
              title="New Tab"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            {loadingDetails && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 mr-2" />}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close window"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. SUBHEADER ACTION BAR */}
        <div className="h-11 border-b border-[#23272F] bg-[#0D0F12] flex items-center justify-between px-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium truncate">
            <span className="font-semibold text-white">{task.id}</span>
            <span className="truncate text-slate-400">{backendTask?.title || task.title}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            {currentStatus !== 'done' && (
              <button
                onClick={handleRunAgentClick}
                disabled={runningAgent}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-xs cursor-pointer active:scale-95 transition-all mr-1 disabled:opacity-50"
                title="Run with Hermes Agent"
              >
                {runningAgent ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
                <span>Run Agent</span>
              </button>
            )}

            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 rounded hover:text-white hover:bg-[#1C2027] transition-colors cursor-pointer ${
                isPinned ? 'text-blue-400' : ''
              }`}
              title="Pin issue"
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            <button
              className="p-1.5 rounded hover:text-white hover:bg-[#1C2027] transition-colors cursor-pointer"
              title="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowProperties(!showProperties)}
              className={`p-1.5 rounded hover:text-white hover:bg-[#1C2027] transition-colors cursor-pointer ${
                showProperties ? 'text-blue-400 bg-[#1A1E26]' : ''
              }`}
              title="Toggle Properties Sidebar"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. MAIN WORKSPACE AREA */}
        <div className="flex-1 flex overflow-hidden">

          {/* VIEW MODE A: ISSUE DETAIL VIEW */}
          {viewMode === 'issue' ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Description & Dynamic Activity Feed */}
              <div className="flex-1 overflow-y-auto flex flex-col justify-between">
                <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto w-full">

                  {/* Big Issue Title & AI Action Toolbar */}
                  <div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                        {backendTask?.title || task.title}
                      </h1>
                    </div>

                    {/* AI Action Toolbar (Fase 1: Specify, Decompose, Run) */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-blue-950/30 via-[#131720] to-indigo-950/30 border border-blue-500/20 mb-5 shadow-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5 mr-1">
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          <span>AI Actions</span>
                        </span>

                        {/* AI Specify Button */}
                        <button
                          onClick={handleSpecifyTask}
                          disabled={isSpecifying || isDecomposing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          title="Flesh out task description, target architecture, and acceptance criteria"
                        >
                          {isSpecifying ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Specifying...</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm leading-none">🪄</span>
                              <span>AI Specify</span>
                            </>
                          )}
                        </button>

                        {/* AI Decompose Button */}
                        <button
                          onClick={handleDecomposeTask}
                          disabled={isSpecifying || isDecomposing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181C24] hover:bg-[#202530] text-slate-200 hover:text-white border border-[#2B303C] font-medium text-xs shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          title="Decompose into child tasks via auxiliary LLM"
                        >
                          {isDecomposing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Decomposing...</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm leading-none">🧩</span>
                              <span>Decompose</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Run Agent Action */}
                      {currentStatus !== 'done' && (
                        <button
                          onClick={handleRunAgentClick}
                          disabled={runningAgent}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          title="Run task immediately with Hermes Agent"
                        >
                          {runningAgent ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>⚡ Run Agent</span>
                        </button>
                      )}
                    </div>

                    {/* Action Banner Notification */}
                    {actionNotice && (
                      <div
                        className={`p-3 rounded-xl mb-5 flex items-center justify-between text-xs transition-all ${
                          actionNotice.type === 'success'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                            : actionNotice.type === 'error'
                            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                            : 'bg-blue-500/10 border border-blue-500/30 text-blue-300 animate-pulse'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {actionNotice.type === 'info' && <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />}
                          {actionNotice.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                          {actionNotice.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                          <span>{actionNotice.text}</span>
                        </div>
                        <button
                          onClick={() => setActionNotice(null)}
                          className="p-1 hover:opacity-75 cursor-pointer ml-2"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Description Text from Backend rendered with Rich Markdown (Fase 5: TASK-5.1) */}
                    <div className="bg-[#101216]/60 dark:bg-[#101216]/60 p-4 rounded-xl border border-slate-200/40 dark:border-[#1E222A] select-text">
                      <MarkdownRenderer
                        content={backendTask?.body || task.description}
                        onImageClick={(src, alt) => {
                          setPreviewImageModal({
                            isOpen: true,
                            imageUrl: src,
                            title: alt || 'Embedded Image'
                          })
                        }}
                      />
                    </div>

                    {/* Technical Deliverables & Attachments Gallery (Fase 5: TASK-5.1 & TASK-5.2) */}
                    {attachments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[#23272F] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                              Deliverables & Technical Artifacts ({attachments.length})
                            </h3>
                          </div>
                          <span className="text-[10px] text-slate-500 font-sans">
                            Click to inspect code or preview architecture diagrams
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {attachments.map(att => {
                            const badge = getFileBadge(att.filename)
                            return (
                              <div
                                key={att.id}
                                onClick={() => handleInspectAttachment(att)}
                                className="p-3 rounded-xl bg-[#14171D] border border-[#20242E] hover:border-blue-500/50 hover:bg-[#181C24] transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <div className="p-1.5 rounded-lg bg-[#1D212A] text-blue-400 border border-[#2B313E] shrink-0">
                                    {badge.isImage ? (
                                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <FileCode className="w-4 h-4 text-blue-400" />
                                    )}
                                  </div>
                                  <div className="overflow-hidden">
                                    <span className="text-xs font-semibold text-slate-200 truncate block group-hover:text-blue-400 transition-colors" title={att.filename}>
                                      {att.filename}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${badge.color}`}>
                                        {badge.label}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {(att.size / 1024).toFixed(1)} KB
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-md text-slate-400 group-hover:text-white group-hover:bg-slate-800 transition-colors"
                                    title={badge.isImage ? 'Preview Diagram' : 'Inspect Code'}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={hermesApi.getAttachmentDownloadUrl(att.id)}
                                    download={att.filename}
                                    onClick={e => e.stopPropagation()}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                    title="Download file"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bottom toolbar */}
                    <div className="flex items-center gap-2 mt-4 pt-2 text-slate-500">
                      <button className="p-1 hover:text-slate-300 cursor-pointer">
                        <Smile className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 hover:text-slate-300 cursor-pointer"
                        title="Add attachment"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subtasks / Child Tasks Tree Component (Fase 1: TASK-1.3) */}
                  <div className="pt-6 border-t border-[#23272F] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-semibold text-white">Subtasks / Child Tasks</h3>
                        {childTasks.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-mono font-medium">
                            {childTasks.filter(c => c.status === 'done').length}/{childTasks.length} done
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setAddingSubtask(!addingSubtask)}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer font-medium hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Subtask</span>
                      </button>
                    </div>

                    {/* Visual Progress Bar */}
                    {childTasks.length > 0 && (
                      <div className="w-full bg-[#181B21] h-1.5 rounded-full overflow-hidden border border-[#23272F]">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
                          style={{
                            width: `${(childTasks.filter(c => c.status === 'done').length / childTasks.length) * 100}%`
                          }}
                        />
                      </div>
                    )}

                    {/* Inline Add Subtask Input Form */}
                    {addingSubtask && (
                      <form
                        onSubmit={handleCreateSubtask}
                        className="flex items-center gap-2 p-2 rounded-xl bg-[#14171D] border border-blue-500/50 animate-in fade-in duration-100"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={newSubtaskTitle}
                          onChange={e => setNewSubtaskTitle(e.target.value)}
                          placeholder="Type subtask title and press Enter..."
                          className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none px-2"
                        />
                        <button
                          type="submit"
                          disabled={!newSubtaskTitle.trim() || isSubmittingSubtask}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer disabled:opacity-40"
                        >
                          {isSubmittingSubtask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingSubtask(false)
                            setNewSubtaskTitle('')
                          }}
                          className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    )}

                    {/* Subtasks Tree Rows */}
                    <div className="space-y-1.5">
                      {childTasks.length > 0 ? (
                        childTasks.map(child => {
                          const isDone = child.status === 'done'
                          const childAgent = agents.find(a => a.id === child.assignee)
                          return (
                            <div
                              key={child.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-[#14171D] border border-[#20242E] hover:border-slate-700 transition-colors group"
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSubtaskStatus(child.id, child.status)}
                                  className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                    isDone
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-slate-600 hover:border-blue-400 text-transparent'
                                  }`}
                                  title={isDone ? 'Mark as todo' : 'Mark as done'}
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <span className="font-mono text-[10px] text-slate-500 shrink-0">
                                  {child.id.replace('t_', 'DIK-')}
                                </span>
                                <span
                                  className={`text-xs truncate font-medium ${
                                    isDone ? 'line-through text-slate-500' : 'text-slate-200'
                                  }`}
                                >
                                  {child.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {child.assignee && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                    <span>{childAgent?.avatar || '🤖'}</span>
                                    <span className="truncate max-w-[80px]">{child.assignee}</span>
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium capitalize ${
                                    child.status === 'done'
                                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                      : child.status === 'running' || child.status === 'in_progress'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : child.status === 'review' || child.status === 'in_review'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                  }`}
                                >
                                  {child.status}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-[#23272F] text-center text-xs text-slate-500">
                          No subtasks linked to this task. Click 🧩 <strong>Decompose</strong> above to analyze with AI or add manually.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Stream Section */}
                  <div className="space-y-6 pt-4 border-t border-[#23272F]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">Activity</h3>
                        {events.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono">
                            {events.length} events
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                          Unsubscribe
                        </button>

                        {/* Participant Avatars */}
                        <div className="flex items-center -space-x-1.5">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold border-2 border-[#0D0F12]">
                            {backendTask?.created_by?.[0]?.toUpperCase() || 'U'}
                          </div>
                          {currentAgent && (
                            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-[10px] border-2 border-[#0D0F12]">
                              {currentAgent.avatar || '🤖'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Real Hermes Events Accordion */}
                    {events.length > 0 && (
                      <div className="border border-[#23272F] rounded-lg bg-[#111317]/50 overflow-hidden">
                        <button
                          onClick={() => setShowActivities(!showActivities)}
                          className="w-full px-3.5 py-2 flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#171A21] transition-colors text-left cursor-pointer"
                        >
                          {showActivities ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          <span>{events.length} activities recorded by Hermes</span>
                        </button>

                        {showActivities && (
                          <div className="p-3 space-y-2 border-t border-[#23272F] text-xs max-h-60 overflow-y-auto">
                            {events.map((ev, index) => {
                              const kind = ev.kind || 'event'
                              let actionText = kind
                              if (kind === 'created') actionText = `Task created with status "${ev.payload?.status || 'ready'}"`
                              else if (kind === 'claimed') actionText = `Claimed by worker (${ev.payload?.lock || 'lock'})`
                              else if (kind === 'spawned') actionText = `Worker process spawned (PID ${ev.payload?.pid || '-'})`
                              else if (kind === 'commented') actionText = `Comment added by ${ev.payload?.author || 'agent'}`
                              else if (kind === 'completed') actionText = `Completed: ${ev.payload?.summary || 'Finished'}`
                              else if (kind === 'status') actionText = `Status changed: ${ev.payload?.from || ''} -> ${ev.payload?.to || ''}`

                              return (
                                <div key={index} className="flex items-start justify-between gap-3 text-slate-400 py-1 border-b border-[#1E222B] last:border-none">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">🤖</span>
                                    <span className="text-slate-300 font-mono text-[11px] font-semibold uppercase">
                                      {kind}
                                    </span>
                                    <span className="text-slate-300">{actionText}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                                    {formatTimestamp(ev.created_at)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Real Backend Comments List */}
                    <div className="space-y-5">
                      {comments.length > 0 ? (
                        comments.map((comment, idx) => (
                          <div
                            key={comment.id || idx}
                            className="p-4 rounded-xl border border-[#23272F] bg-[#14171D] space-y-3 shadow-xs"
                          >
                            {/* Comment Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="relative w-7 h-7 rounded-full bg-[#1C2027] border border-[#2B303B] flex items-center justify-center text-sm">
                                  {comment.authorAvatar || '🤖'}
                                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#14171D]" />
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white">{comment.author}</span>
                                  <span className="text-[10px] text-slate-500">{comment.created_at || 'Live'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 text-slate-500">
                                <button
                                  onClick={() => handleCopyComment(comment.body, comment.id || idx)}
                                  className="p-1 hover:text-slate-300 cursor-pointer"
                                  title="Copy comment"
                                >
                                  {copiedCommentId === (comment.id || idx) ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button className="p-1 hover:text-slate-300 cursor-pointer">
                                  <Smile className="w-3.5 h-3.5" />
                                </button>
                                <button className="p-1 hover:text-slate-300 cursor-pointer">
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Comment Body with Rich Markdown (Fase 5: TASK-5.1) */}
                            <div className="text-xs text-slate-200 leading-relaxed select-text">
                              <MarkdownRenderer
                                content={comment.body}
                                onImageClick={(src, alt) => {
                                  setPreviewImageModal({
                                    isOpen: true,
                                    imageUrl: src,
                                    title: alt || 'Comment Image'
                                  })
                                }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center border border-dashed border-[#23272F] rounded-xl text-slate-500 text-xs">
                          No comments posted yet. Leave an instruction or feedback note below to communicate with Hermes Agent.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Fixed Comment Composer */}
                <div className="p-4 border-t border-[#23272F] bg-[#0D0F12]">
                  <div className="max-w-4xl mx-auto w-full flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-1 border border-indigo-400/40">
                      MS
                    </div>

                    <div className="flex-1 rounded-xl border border-[#23272F] bg-[#14171D] overflow-hidden focus-within:border-blue-500/60 transition-colors">
                      <textarea
                        ref={commentInputRef}
                        rows={3}
                        value={newCommentText}
                        onChange={e => setNewCommentText(e.target.value)}
                        placeholder="Leave a comment or instruction for Hermes..."
                        className="w-full px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 bg-transparent focus:outline-none resize-none"
                      />

                      <div className="px-3 pb-2.5 flex items-center justify-between text-slate-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAttachmentUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAttachment}
                            className="p-1 rounded hover:text-slate-200 hover:bg-[#1C2027] cursor-pointer"
                            title="Attach file"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded hover:text-slate-200 hover:bg-[#1C2027] cursor-pointer"
                            title="Insert emoji"
                          >
                            <Smile className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handlePostComment}
                          disabled={!newCommentText.trim() || sendingComment}
                          className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center text-white transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Send comment"
                        >
                          {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Properties Sidebar */}
              {showProperties && (
                <div className="w-72 border-l border-[#23272F] bg-[#111317] overflow-y-auto p-4 space-y-6 text-xs select-none">

                  {/* Section: Properties */}
                  <div className="space-y-3">
                    <button
                      onClick={() => setOpenProperties(!openProperties)}
                      className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer"
                    >
                      <span>Properties</span>
                      {openProperties ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>

                    {openProperties && (
                      <div className="space-y-3 pt-1">
                        {/* Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Status</span>
                          <select
                            value={currentStatus}
                            onChange={e => handleStatusChange(e.target.value as TaskStatus)}
                            className="bg-[#181B21] border border-[#282D37] text-slate-200 text-xs rounded-md px-2 py-1 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            {statusOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Assignee */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Assignee</span>
                          <select
                            value={currentAssignee}
                            onChange={e => handleAssigneeChange(e.target.value)}
                            className="bg-[#181B21] border border-[#282D37] text-slate-200 text-xs rounded-md px-2 py-1 font-medium focus:outline-none focus:border-blue-500 cursor-pointer max-w-[140px] truncate"
                          >
                            {agents.length > 0 ? (
                              agents.map(a => (
                                <option key={a.id} value={a.id}>
                                  {a.avatar || '🤖'} {a.name}
                                </option>
                              ))
                            ) : (
                              <option value="default">⚙️ Default Agent</option>
                            )}
                          </select>
                        </div>

                        {/* Project */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Project</span>
                          <span className="text-slate-300 font-medium truncate max-w-[140px]">
                            {backendTask?.project_id || task.projectName || 'Default Workspace'}
                          </span>
                        </div>

                        {/* Attachments Property */}
                        {attachments.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Attachments</span>
                            <span className="text-blue-400 font-mono text-[11px] font-medium">
                              {attachments.length} file(s)
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section: Complexity & Token Estimate (Fase 1: TASK-1.4) */}
                  <div className="space-y-3 pt-3 border-t border-[#23272F]">
                    <button
                      onClick={() => setOpenEstimate(!openEstimate)}
                      className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Complexity & Estimate</span>
                      </span>
                      {openEstimate ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>

                    {openEstimate && (
                      <div className="space-y-2.5 pt-1">
                        {estimateResult?.ok ? (
                          <div className="p-3 rounded-xl bg-[#14171D] border border-[#23272F] space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Complexity</span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                  estimateResult.complexity === 'S' || estimateResult.complexity === 'low'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : estimateResult.complexity === 'M' || estimateResult.complexity === 'medium'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {estimateResult.complexity === 'S'
                                  ? 'Low (S)'
                                  : estimateResult.complexity === 'M'
                                  ? 'Medium (M)'
                                  : 'High (L)'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Est. Tokens</span>
                              <span className="text-slate-200 font-mono font-semibold">
                                ~{(estimateResult.est_tokens || 0).toLocaleString()}
                              </span>
                            </div>

                            {estimateResult.model && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Suggested Model</span>
                                <span className="text-slate-300 font-mono text-[10px] truncate max-w-[120px]">
                                  {estimateResult.model}
                                </span>
                              </div>
                            )}

                            {estimateResult.rationale && (
                              <div className="pt-2 border-t border-[#23272F] text-[11px] text-slate-300 italic leading-relaxed">
                                "{estimateResult.rationale}"
                              </div>
                            )}

                            <button
                              onClick={handleEstimateTask}
                              disabled={isEstimating}
                              className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-[#181C24] hover:bg-[#222733] border border-[#282E3A] text-slate-300 hover:text-white font-medium text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                            >
                              {isEstimating ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart2 className="w-3 h-3" />}
                              <span>Re-estimate</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleEstimateTask}
                            disabled={isEstimating}
                            className="w-full p-2.5 rounded-xl bg-[#14171D] border border-[#23272F] hover:border-blue-500/40 text-left cursor-pointer flex items-center justify-between text-xs text-slate-300 group transition-all"
                          >
                            <span className="flex items-center gap-2 font-medium text-blue-400">
                              {isEstimating ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Estimating tokens...</span>
                                </>
                              ) : (
                                <>
                                  <span>📊</span>
                                  <span>Estimate Complexity</span>
                                </>
                              )}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section: Dependencies & Links (Fase 1: TASK-1.5) */}
                  <div className="space-y-3 pt-3 border-t border-[#23272F]">
                    <button
                      onClick={() => setOpenDependencies(!openDependencies)}
                      className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Dependencies</span>
                        {(linksInfo.parents.length > 0 || linksInfo.children.length > 0) && (
                          <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-mono">
                            {linksInfo.parents.length + linksInfo.children.length}
                          </span>
                        )}
                      </span>
                      {openDependencies ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>

                    {openDependencies && (
                      <div className="space-y-3 pt-1 text-xs">
                        {/* Blocked by Active Incomplete Parent Notice */}
                        {linksInfo.blocked_by_active && (
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-[11px]">
                            <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>Blocked by incomplete parent dependencies</span>
                          </div>
                        )}

                        {/* Blocked by list */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Blocked By ({linksInfo.parents.length})
                          </span>
                          {linksInfo.parents.length > 0 ? (
                            linksInfo.parents.map(parent => {
                              const isFinished = parent.status === 'done' || parent.status === 'archived'
                              return (
                                <div
                                  key={parent.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-[#14171D] border border-[#23272F] text-[11px]"
                                >
                                  <div className="flex items-center gap-1.5 truncate mr-2">
                                    {isFinished ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    ) : (
                                      <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    )}
                                    <span className="font-mono text-slate-400 shrink-0">
                                      {parent.id.replace('t_', 'DIK-')}
                                    </span>
                                    <span className="text-slate-200 truncate">{parent.title}</span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteLink(parent.id, canonicalId)}
                                    className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                                    title="Unlink dependency"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )
                            })
                          ) : (
                            <p className="text-[11px] text-slate-500 italic">No blocking dependencies.</p>
                          )}
                        </div>

                        {/* Blocks list */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Blocks ({linksInfo.children.length})
                          </span>
                          {linksInfo.children.length > 0 ? (
                            linksInfo.children.map(child => (
                              <div
                                key={child.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-[#14171D] border border-[#23272F] text-[11px]"
                              >
                                <div className="flex items-center gap-1.5 truncate mr-2">
                                  <ArrowUp className="w-3.5 h-3.5 text-amber-400 shrink-0 rotate-45" />
                                  <span className="font-mono text-slate-400 shrink-0">
                                    {child.id.replace('t_', 'DIK-')}
                                  </span>
                                  <span className="text-slate-200 truncate">{child.title}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteLink(canonicalId, child.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                                  title="Unlink dependency"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-slate-500 italic">Does not block any task.</p>
                          )}
                        </div>

                        {/* Add Link Dropdown Form */}
                        {showAddLink ? (
                          <div className="p-2.5 rounded-xl bg-[#14171D] border border-blue-500/40 space-y-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Relationship</label>
                              <select
                                value={linkRelationType}
                                onChange={e => setLinkRelationType(e.target.value as any)}
                                className="w-full bg-[#181C24] border border-[#282D38] rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                              >
                                <option value="blocked_by">This task is Blocked by...</option>
                                <option value="blocks">This task Blocks...</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400">Target Task</label>
                              <select
                                value={selectedTargetTaskId}
                                onChange={e => setSelectedTargetTaskId(e.target.value)}
                                className="w-full bg-[#181C24] border border-[#282D38] rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                              >
                                <option value="">Select task...</option>
                                {availableTargetTasks.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.id}: {t.title.slice(0, 32)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <button
                                onClick={() => setShowAddLink(false)}
                                className="px-2 py-1 rounded text-slate-400 hover:text-white text-[11px] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleCreateLink}
                                disabled={!selectedTargetTaskId || isLinking}
                                className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] cursor-pointer disabled:opacity-40"
                              >
                                {isLinking ? 'Linking...' : 'Link'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowAddLink(true)}
                            className="w-full py-1.5 rounded-lg border border-dashed border-[#282D37] hover:border-slate-500 text-slate-400 hover:text-slate-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Dependency</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section: Pull Requests */}
                  <div className="space-y-2 pt-3 border-t border-[#23272F]">
                    <button
                      onClick={() => setOpenPullRequests(!openPullRequests)}
                      className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer"
                    >
                      <span>Pull requests</span>
                      {openPullRequests ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>

                    {openPullRequests && (
                      <p className="text-[11px] text-slate-500 italic pt-1">
                        No linked pull requests.
                      </p>
                    )}
                  </div>

                  {/* Section: Execution Log */}
                  <div className="space-y-2.5 pt-3 border-t border-[#23272F]">
                    <button
                      onClick={() => setOpenExecutionLog(!openExecutionLog)}
                      className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer"
                    >
                      <span>Execution log</span>
                      {openExecutionLog ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>

                    {openExecutionLog && (
                      <div className="space-y-2 pt-1">
                        <div className="text-xs font-mono text-slate-300">
                          {logSizeBytes > 0 ? `${(logSizeBytes / 1024).toFixed(1)} KB log` : 'No log yet'} · {runDurationText}
                        </div>

                        {/* Button to open Execution Log View */}
                        <button
                          onClick={() => setViewMode('execution_log')}
                          className="w-full flex items-center justify-between p-2 rounded-lg bg-[#181B21] border border-[#282D37] hover:border-blue-500/50 text-xs text-blue-400 hover:text-blue-300 transition-colors text-left cursor-pointer group"
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            <span>
                              {runs.length > 0 ? `Show past runs (${runs.length})` : 'Show execution trace'}
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{runDurationText}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Section: Details */}
                  <div className="space-y-2.5 pt-3 border-t border-[#23272F]">
                    <button
                      onClick={() => setOpenDetails(!openDetails)}
                      className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer"
                    >
                      <span>Details</span>
                      {openDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>

                    {openDetails && (
                      <div className="space-y-2 text-xs pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Created by</span>
                          <span className="text-slate-200 font-medium">
                            {backendTask?.created_by || 'dashboard'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Created</span>
                          <span className="text-slate-300 font-mono text-[11px]">
                            {backendTask?.created_at ? formatTimestamp(backendTask.created_at) : task.updatedAt}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Updated</span>
                          <span className="text-slate-300 font-mono text-[11px]">
                            {backendTask?.completed_at
                              ? formatTimestamp(backendTask.completed_at)
                              : backendTask?.started_at
                              ? formatTimestamp(backendTask.started_at)
                              : task.updatedAt}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (

            /* VIEW MODE B: DYNAMIC EXECUTION LOG DRAWER (MATCHING SCREENSHOT 4) */
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0D0F12]">
              {/* Header */}
              <div className="p-4 border-b border-[#23272F] flex items-center justify-between bg-[#111317]">
                <div className="flex items-center gap-3">
                  {/* Status Badge */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      currentStatus === 'done' || activeRun?.outcome === 'completed'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : currentStatus === 'in_progress'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                        : 'bg-slate-500/10 border border-slate-500/30 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="capitalize">{activeRun?.outcome || activeRun?.status || currentStatus}</span>
                  </div>

                  {/* Profile badge */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <span className="text-sm">{currentAgent?.avatar || '🤖'}</span>
                    <span>{activeRun?.profile || currentAgent?.name || currentAssignee}</span>
                  </div>

                  <span className="text-slate-500">•</span>

                  <span className="text-xs text-slate-400">
                    {backendTask?.created_by || 'Operator'} · Took {runDurationText}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="font-mono text-slate-300">
                    {(logSizeBytes / 1024).toFixed(1)} KB log
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={() => setLogViewTab(logViewTab === 'steps' ? 'raw_log' : 'steps')}
                      className="px-2 py-1 rounded border border-[#23272F] hover:text-white hover:bg-[#16191E] cursor-pointer text-[11px]"
                      title="Toggle between parsed steps and full terminal log"
                    >
                      {logViewTab === 'steps' ? 'View Raw Terminal' : 'View Parsed Steps'}
                    </button>
                    <button
                      onClick={() => setViewMode('issue')}
                      className="p-1 hover:text-white cursor-pointer"
                      title="Back to issue"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Produced Bar & Visual Timeline */}
              <div className="p-4 border-b border-[#23272F] space-y-3 bg-[#0D0F12]">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Produced</span>
                  <span className="px-2 py-0.5 rounded bg-[#16191E] border border-[#23272F] text-slate-300 font-mono text-[11px]">
                    📄 {attachments.length} files
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#16191E] border border-[#23272F] text-slate-300 font-mono text-[11px]">
                    &gt;_ {parsedSteps.length} commands
                  </span>
                </div>

                {/* Dynamic Visual Timeline Bars */}
                <div className="space-y-1.5 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="w-16">Runtime</span>
                    <div className="flex-1 h-3 rounded bg-[#16191E] overflow-hidden flex gap-1 p-0.5 border border-[#23272F]">
                      <div className="w-[65%] h-full bg-blue-500/80 rounded-xs" />
                      <div className="w-[35%] h-full bg-emerald-500/80 rounded-xs" />
                    </div>
                    <span className="w-12 text-right">{runDurationText}</span>
                  </div>
                </div>
              </div>

              {logViewTab === 'steps' ? (
                <>
                  {/* Search & Filter Header */}
                  <div className="px-4 py-2 border-b border-[#23272F] flex items-center justify-between text-xs bg-[#111317]">
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <Search className="w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={searchRunQuery}
                        onChange={e => setSearchRunQuery(e.target.value)}
                        placeholder="Search this run..."
                        className="w-full bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="text-[11px] font-mono">{filteredSteps.length} steps</span>
                      <button className="flex items-center gap-1 hover:text-slate-200 cursor-pointer">
                        <Filter className="w-3 h-3" />
                        <span>Filter</span>
                      </button>
                    </div>
                  </div>

                  {/* Steps Chronological List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs">
                    {filteredSteps.length > 0 ? (
                      filteredSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-[#14171D] border border-[#20242E] hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="text-slate-500 text-[11px] w-12 shrink-0">{step.time}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-blue-400 text-[10px] font-bold shrink-0">
                              &gt;_ {step.tool}
                            </span>
                            <span className="text-slate-300 truncate">{step.detail}</span>
                          </div>
                          <span className="text-slate-500 text-[11px] shrink-0">{step.duration}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        {rawLog ? 'No matching steps found for search query.' : 'No execution steps recorded yet.'}
                      </div>
                    )}

                    {/* Agent Synthesis Report Box with Rich Markdown (Fase 5: TASK-5.1) */}
                    {agentFinalOutput && (
                      <div className="p-4 rounded-xl border-l-4 border-l-emerald-500 border border-[#23272F] bg-[#14171D] space-y-3 mt-4 select-text">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🤖</span>
                            <span className="font-semibold text-slate-200 font-sans">
                              Laporan Akhir Eksekusi Hermes Agent
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-[#1F2430] text-slate-300 font-mono text-[10px]">
                              {task.id}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">Finished</span>
                        </div>

                        <div className="text-xs text-slate-300 font-sans leading-relaxed">
                          <MarkdownRenderer
                            content={agentFinalOutput}
                            onImageClick={(src, alt) => {
                              setPreviewImageModal({
                                isOpen: true,
                                imageUrl: src,
                                title: alt || 'Synthesis Report Image'
                              })
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* RAW TERMINAL OUTPUT TAB */
                <div className="flex-1 overflow-y-auto p-4 bg-[#0A0C10]">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400">
                    <span className="font-mono text-[11px]">Worker Terminal Output (~/.hermes/kanban/logs/{canonicalId}.log)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(rawLog)
                        setCopiedLog(true)
                        setTimeout(() => setCopiedLog(false), 2000)
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedLog ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Output</span>
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                    {rawLog || 'No log output recorded yet.'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Image & Diagram Preview Modal (Fase 5: TASK-5.2) */}
      {previewImageModal && (
        <ImageDiagramPreviewModal
          isOpen={previewImageModal.isOpen}
          onClose={() => setPreviewImageModal(null)}
          imageUrl={previewImageModal.imageUrl}
          title={previewImageModal.title}
          fileSize={previewImageModal.size}
          downloadUrl={previewImageModal.downloadUrl}
        />
      )}

      {/* In-App Code & Artifact Inspector Modal (Fase 5: TASK-5.1) */}
      {previewCodeModal && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-100"
          onClick={e => {
            if (e.target === e.currentTarget) setPreviewCodeModal(null)
          }}
        >
          <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-[#2B313E] bg-[#12151B] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
            <div className="px-4 py-3 border-b border-[#23272F] flex items-center justify-between bg-[#161920]">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xs font-semibold text-white">
                  {previewCodeModal.attachment.filename}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({(previewCodeModal.attachment.size / 1024).toFixed(1)} KB)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={hermesApi.getAttachmentDownloadUrl(previewCodeModal.attachment.id)}
                  download={previewCodeModal.attachment.filename}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewCodeModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#0A0C10]">
              {previewCodeModal.loading ? (
                <div className="h-64 flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-xs">Loading deliverable file...</span>
                </div>
              ) : (
                <CodeBlock
                  code={previewCodeModal.content}
                  language={previewCodeModal.attachment.filename.split('.').pop() || 'text'}
                  filename={previewCodeModal.attachment.filename}
                  showLineNumbers={true}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
