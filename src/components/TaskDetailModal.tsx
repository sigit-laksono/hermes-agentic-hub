import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Play,
  Terminal,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle2,
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Bot
} from 'lucide-react'
import { Task, TaskStatus, AIAgent } from '../types'
import { hermesApi } from '../api/hermesApi'

interface TaskDetailModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  agents: AIAgent[]
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void
  onRunAgent: (taskId: string) => Promise<boolean | void>
  onSendComment: (taskId: string, note: string) => Promise<boolean> | boolean
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  agents,
  onUpdateStatus,
  onRunAgent,
  onSendComment
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'overview' | 'notes'>('overview')
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string>('')
  const [logsLoading, setLogsLoading] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const [sendingNote, setSendingNote] = useState(false)
  const [runSuccessNotice, setRunSuccessNotice] = useState<string | null>(null)

  const logTerminalRef = useRef<HTMLPreElement>(null)

  // Auto-switch to logs tab if task is running
  useEffect(() => {
    if (task && task.status === 'in_progress') {
      setActiveTab('logs')
    }
  }, [task?.id, task?.status])

  // Fetch logs when modal is open and on logs tab
  useEffect(() => {
    if (!isOpen || !task) return

    let isMounted = true
    const fetchLogs = async () => {
      const idToFetch = task.rawId || (task.id.startsWith('t_') ? task.id : task.id.replace('DIK-', 't_'))
      try {
        const logData = await hermesApi.getTaskLog(idToFetch)
        if (isMounted) {
          setLogs(logData.content || '')
        }
      } catch {
        if (isMounted) setLogs('')
      }
    }

    fetchLogs()

    // If task is in_progress, poll logs every 2.5s
    let interval: any = null
    if (task.status === 'in_progress') {
      interval = setInterval(fetchLogs, 2500)
    }

    return () => {
      isMounted = false
      if (interval) clearInterval(interval)
    }
  }, [isOpen, task?.id, task?.rawId, task?.status])

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (autoScroll && logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  if (!isOpen || !task) return null

  const handleRun = async () => {
    setIsRunning(true)
    setRunSuccessNotice(null)
    try {
      await onRunAgent(task.id)
      setRunSuccessNotice('Agent successfully dispatched! Watching execution...')
      setActiveTab('logs')
      setTimeout(() => setRunSuccessNotice(null), 5000)
    } finally {
      setIsRunning(false)
    }
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(task.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim() || sendingNote) return
    setSendingNote(true)
    try {
      await onSendComment(task.id, note.trim())
      setNote('')
    } finally {
      setSendingNote(false)
    }
  }

  const priorityColor = {
    urgent: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    high: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    medium: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    none: 'text-slate-400 bg-slate-500/10 border-slate-500/20'
  }[task.priority]

  const statusColor = {
    backlog: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    todo: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    in_progress: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    in_review: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    blocked: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    done: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  }[task.status]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 dark:border-[#282D37] bg-white dark:bg-[#16191E] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-[#13151A]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-xs font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              title="Click to copy ID"
            >
              <span>{task.id}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
            </button>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusColor}`}>
              {task.status.replace('_', ' ')}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${priorityColor}`}>
              {task.priority} Priority
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Action Button: RUN AGENT NOW */}
            {task.status === 'in_progress' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Agent Working...</span>
              </div>
            ) : (
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Spawning Agent...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>⚡ Run Agent Now</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice banner */}
        {runSuccessNotice && (
          <div className="px-5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {runSuccessNotice}
            </span>
            <button onClick={() => setRunSuccessNotice(null)} className="text-emerald-500 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Title & Navigation Tabs */}
        <div className="px-5 pt-4 pb-2 border-b border-slate-200 dark:border-[#23272F]">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
            {task.title}
          </h2>

          <div className="flex items-center gap-4 text-xs font-medium border-b border-transparent">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 flex items-center gap-1.5 transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-2 flex items-center gap-1.5 transition-colors border-b-2 relative ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Live Agent Logs</span>
              {task.status === 'in_progress' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`pb-2 flex items-center gap-1.5 transition-colors border-b-2 ${
                activeTab === 'notes'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Feedback & Notes</span>
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left 2 Cols: Details & Description */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Description & Context
                  </h4>
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#111317] border border-slate-200/80 dark:border-[#20242D] text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {task.description || 'No detailed description provided.'}
                  </div>
                </div>

                {/* Review report if present */}
                {task.reviewReport && (
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Agent Deliverable / Report
                    </h4>
                    <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                      {task.reviewReport}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Col: Metadata Sidebar */}
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#111317] border border-slate-200/80 dark:border-[#20242D] space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">Assignee (Hermes Profile)</label>
                    {(() => {
                      const assignedAgent = agents.find(
                        a => a.id === task.assigneeProfile || a.name === task.assigneeName
                      )
                      return (
                        <div className="flex items-center gap-2 p-1.5 rounded bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800">
                          <span className="text-base">{assignedAgent?.avatar || task.assigneeAvatar || '🤖'}</span>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {assignedAgent?.name || task.assigneeName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {assignedAgent?.id || task.assigneeProfile || 'sa-aws'}
                            </div>
                            {assignedAgent?.runtime && (
                              <div className="text-[9px] text-blue-500 font-medium">
                                {assignedAgent.runtime}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">Project</label>
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {task.projectName}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">Last Updated</label>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{task.updatedAt}</span>
                    </div>
                  </div>

                  {/* Status quick switcher */}
                  <div className="pt-2 border-t border-slate-200 dark:border-[#20242D]">
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">Quick Status Change</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onUpdateStatus(task.id, 'todo')}
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-300"
                      >
                        Move to Todo
                      </button>
                      <button
                        onClick={() => onUpdateStatus(task.id, 'in_progress')}
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-300"
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => onUpdateStatus(task.id, 'in_review')}
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-300"
                      >
                        In Review
                      </button>
                      <button
                        onClick={() => onUpdateStatus(task.id, 'done')}
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-300"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-400" />
                  <span className="font-mono text-[11px]">
                    /home/ubuntu/.hermes/kanban/logs/{task.rawId || task.id.replace('DIK-', 't_')}.log
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={e => setAutoScroll(e.target.checked)}
                      className="rounded text-blue-500"
                    />
                    <span>Auto-scroll</span>
                  </label>
                  <button
                    onClick={async () => {
                      setLogsLoading(true)
                      const idToFetch = task.rawId || task.id.replace('DIK-', 't_')
                      const logData = await hermesApi.getTaskLog(idToFetch)
                      setLogs(logData.content || '')
                      setLogsLoading(false)
                    }}
                    className="p-1 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
                    title="Refresh Log"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Terminal Log Window */}
              <div className="relative rounded-lg bg-[#0A0C10] border border-slate-800 shadow-inner overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#12151C] border-b border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-[10px] text-slate-500">Hermes Worker Shell</span>
                  </div>
                  {task.status === 'in_progress' && (
                    <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-mono">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      LIVE STREAM
                    </div>
                  )}
                </div>

                <pre
                  ref={logTerminalRef}
                  className="p-4 text-xs font-mono text-slate-200 h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text"
                >
                  {logs ? (
                    logs
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                      <Bot className="w-8 h-8 mb-2 text-slate-600 animate-pulse" />
                      <p className="font-semibold text-slate-400">No output logs recorded yet.</p>
                      <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                        Click "⚡ Run Agent Now" at the top right to spawn Hermes Agent and start working on this task.
                      </p>
                    </div>
                  )}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleSendNote} className="space-y-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Send instruction or feedback note to agent:
                </label>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Type comments, revision requests, or additional context for the agent..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!note.trim() || sendingNote}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium self-end disabled:opacity-50"
                  >
                    {sendingNote ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
