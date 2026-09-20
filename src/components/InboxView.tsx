import React, { useState, useEffect } from 'react'
import {
  Inbox,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Sparkles,
  Loader2,
  FileCode,
  Download,
  Eye,
  Copy,
  Check,
  Terminal,
  Image as ImageIcon,
  FileText,
  X
} from 'lucide-react'
import { Task, TaskAttachment } from '../types'
import { hermesApi } from '../api/hermesApi'
import { MarkdownRenderer } from './MarkdownRenderer'
import { CodeBlock } from './CodeBlock'
import { ImageDiagramPreviewModal } from './ImageDiagramPreviewModal'

interface InboxViewProps {
  tasks: Task[]
  onApproveTask: (taskId: string) => void
  onRequestChanges: (taskId: string, note?: string) => void
  onSendComment: (taskId: string, note: string) => Promise<boolean> | boolean
  onRefreshTasks?: () => Promise<void> | void
}

export const InboxView: React.FC<InboxViewProps> = ({
  tasks,
  onApproveTask,
  onRequestChanges,
  onSendComment,
  onRefreshTasks
}) => {
  // Reviewable/recent tasks
  const reviewTasks = tasks.filter(t => t.status === 'in_review' || t.status === 'done')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    reviewTasks.length > 0 ? reviewTasks[0].id : null
  )

  const [activeTab, setActiveTab] = useState<'summary' | 'deliverables'>('summary')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState<boolean | null>(null)

  // Attachments state
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  // Fase 5: Interactive Image / Architecture Diagram Preview Modal
  const [previewImageModal, setPreviewImageModal] = useState<{
    isOpen: boolean
    imageUrl: string
    title: string
    size?: number
    downloadUrl?: string
  } | null>(null)

  const selectedTask = tasks.find(t => t.id === selectedTaskId)
  const canonicalId = selectedTask ? hermesApi.getCanonicalTaskId(selectedTask) : ''

  // Keyboard shortcut: Escape to close preview modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImageModal?.isOpen) {
          setPreviewImageModal(null)
          return
        }
        if (previewAttachment) {
          setPreviewAttachment(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewImageModal, previewAttachment])

  // Load attachments when selected task changes
  useEffect(() => {
    if (!selectedTask || !canonicalId) {
      setAttachments([])
      return
    }

    let isMounted = true
    const fetchAttachments = async () => {
      setAttachmentsLoading(true)
      try {
        const liveList = await hermesApi.getTaskAttachments(canonicalId)
        if (isMounted) {
          if (liveList && liveList.length > 0) {
            setAttachments(liveList)
          } else if (selectedTask.attachments && selectedTask.attachments.length > 0) {
            setAttachments(selectedTask.attachments)
          } else {
            setAttachments([])
          }
        }
      } catch {
        if (isMounted) {
          setAttachments(selectedTask.attachments || [])
        }
      } finally {
        if (isMounted) setAttachmentsLoading(false)
      }
    }

    fetchAttachments()
    setPreviewAttachment(null)
    setPreviewContent('')

    return () => {
      isMounted = false
    }
  }, [selectedTaskId, canonicalId])

  // Open Preview Drawer
  const handleOpenPreview = async (att: TaskAttachment) => {
    const isImage = Boolean(att.filename.match(/\.(png|jpg|jpeg|svg)$/i))
    if (isImage) {
      setPreviewImageModal({
        isOpen: true,
        imageUrl: hermesApi.getAttachmentDownloadUrl(att.id),
        title: att.filename,
        size: att.size,
        downloadUrl: hermesApi.getAttachmentDownloadUrl(att.id)
      })
      return
    }

    setPreviewAttachment(att)
    setPreviewLoading(true)
    setPreviewContent('')
    try {
      const content = await hermesApi.getAttachmentContent(att.id)
      setPreviewContent(content || 'No text content available or binary file.')
    } catch {
      setPreviewContent('Failed to load file preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSend = async () => {
    if (!selectedTask || !note.trim() || sending) return
    setSending(true)
    setSentOk(null)
    try {
      const ok = await onSendComment(selectedTask.id, note.trim())
      setSentOk(ok)
      if (ok) setNote('')
      if (onRefreshTasks) onRefreshTasks()
    } finally {
      setSending(false)
    }
  }

  const handleRequestChanges = () => {
    if (!selectedTask) return
    onRequestChanges(selectedTask.id, note.trim() || undefined)
    setNote('')
    if (onRefreshTasks) onRefreshTasks()
  }

  const handleApprove = () => {
    if (!selectedTask) return
    onApproveTask(selectedTask.id)
    if (onRefreshTasks) onRefreshTasks()
  }

  // File Badge Helper
  const getFileBadge = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    if (['tf', 'tfvars', 'hcl'].includes(ext)) {
      return { label: 'Terraform', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: FileCode }
    }
    if (['yaml', 'yml', 'json'].includes(ext)) {
      return { label: 'Config / CFN', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', icon: FileCode }
    }
    if (['svg', 'png', 'jpg', 'jpeg'].includes(ext)) {
      return { label: 'Architecture Diagram', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: ImageIcon }
    }
    if (['py', 'sh', 'sql', 'bash'].includes(ext)) {
      return { label: 'Automation Script', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: Terminal }
    }
    return { label: 'Document', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: FileText }
  }

  return (
    <div className="flex-1 flex h-[calc(100vh-3rem)] overflow-hidden bg-white dark:bg-[#0D0F12]">
      {/* Left Pane: Notification List */}
      <div className="w-80 border-r border-slate-200 dark:border-[#23272F] flex flex-col bg-slate-50 dark:bg-[#111317]">
        <div className="p-3 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-semibold text-slate-800 dark:text-white">Human-in-the-Loop Inbox</h2>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-500 font-bold">
              {reviewTasks.filter(t => t.status === 'in_review').length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 dark:divide-[#1E222A]">
          {reviewTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">All caught up! No tasks need review.</div>
          ) : (
            reviewTasks.map(task => {
              const isSelected = task.id === selectedTaskId
              const isPendingReview = task.status === 'in_review'

              return (
                <div
                  key={task.id}
                  onClick={() => {
                    setSelectedTaskId(task.id)
                    setActiveTab('summary')
                  }}
                  className={`p-3 cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-l-2 border-blue-500'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isPendingReview ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'
                        }`}
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{task.updatedAt}</span>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      {task.assigneeAvatar} {task.assigneeName}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        isPendingReview
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {isPendingReview ? 'Needs Review' : 'Done'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right Pane: Detail & Verification Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#14171D]">
        {selectedTask ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Header bar */}
            <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between bg-slate-50/50 dark:bg-[#111317]">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                    {selectedTask.id}
                  </span>
                  <span>•</span>
                  <span>{selectedTask.projectName}</span>
                  <span>•</span>
                  <span className="font-medium text-slate-500">
                    Assigned: {selectedTask.assigneeAvatar} {selectedTask.assigneeName}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedTask.title}
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {selectedTask.status === 'in_review' ? (
                  <>
                    <button
                      onClick={handleRequestChanges}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Changes</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Done</span>
                    </button>
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-blue-500 font-medium px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Completed
                  </span>
                )}
              </div>
            </div>

            {/* Subheader: Review Tabs */}
            <div className="px-6 pt-3 border-b border-slate-200 dark:border-[#23272F] flex items-center gap-4 text-xs font-medium bg-white dark:bg-[#14171D]">
              <button
                onClick={() => setActiveTab('summary')}
                className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'summary'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Summary</span>
              </button>

              <button
                onClick={() => setActiveTab('deliverables')}
                className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'deliverables'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Deliverables & Files</span>
                {attachments.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-500 text-[10px] font-semibold">
                    {attachments.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* TAB 1: SUMMARY */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* Quick deliverables callout banner if files exist */}
                  {attachments.length > 0 && (
                    <div
                      onClick={() => setActiveTab('deliverables')}
                      className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <FileCode className="w-4 h-4" />
                        <span className="font-semibold">{attachments.length} Technical Deliverable(s) Ready</span>
                        <span className="text-[11px] text-slate-500">• Terraform, configs, or diagrams available for inspection</span>
                      </div>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
                        Review Files →
                      </span>
                    </div>
                  )}

                  {/* Agent Execution Report rendered with Rich Markdown (Fase 5: TASK-5.1) */}
                  <div className="rounded-xl border border-slate-200 dark:border-[#23272F] bg-slate-50 dark:bg-[#16191E] p-5 shadow-2xs">
                    <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-[#23272F] text-xs">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Agent Work Output & Findings
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed select-text">
                      <MarkdownRenderer
                        content={selectedTask.reviewReport || selectedTask.description}
                        onImageClick={(src, alt) => {
                          setPreviewImageModal({
                            isOpen: true,
                            imageUrl: src,
                            title: alt || 'Report Diagram'
                          })
                        }}
                      />
                    </div>
                  </div>

                  {/* Discussion / Comment Box */}
                  <div className="rounded-lg border border-slate-200 dark:border-[#23272F] p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      Revision Feedback / Operator Instructions
                    </h4>
                    <textarea
                      value={note}
                      onChange={e => {
                        setNote(e.target.value)
                        setSentOk(null)
                      }}
                      placeholder="Tambahkan catatan revisi atau instruksi perubahan kode untuk agen..."
                      className="w-full h-20 p-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px]">
                        {sentOk === true && <span className="text-emerald-500">Comment posted to task thread ✓</span>}
                        {sentOk === false && <span className="text-rose-500">Failed to post comment</span>}
                      </div>
                      <button
                        onClick={handleSend}
                        disabled={!note.trim() || sending}
                        className="px-3.5 py-1.5 rounded-md text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {sending && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>Send Feedback Note</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DELIVERABLES */}
              {activeTab === 'deliverables' && (
                <div className="space-y-4">
                  {attachmentsLoading ? (
                    <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                      <p className="text-xs">Loading deliverables from Hermes...</p>
                    </div>
                  ) : attachments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {attachments.map(att => {
                        const badge = getFileBadge(att.filename)
                        const BadgeIcon = badge.icon
                        return (
                          <div
                            key={att.id}
                            className="p-4 rounded-lg bg-slate-50 dark:bg-[#16191E] border border-slate-200/80 dark:border-[#23272F] hover:border-blue-500/40 transition-all flex flex-col justify-between gap-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 rounded bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 text-blue-500 shrink-0">
                                  <BadgeIcon className="w-4 h-4" />
                                </div>
                                <div className="overflow-hidden">
                                  <h5 className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={att.filename}>
                                    {att.filename}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${badge.color}`}>
                                      {badge.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {(att.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                              <button
                                onClick={() => handleOpenPreview(att)}
                                className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium text-xs cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect Code / Preview</span>
                              </button>

                              <a
                                href={hermesApi.getAttachmentDownloadUrl(att.id)}
                                download={att.filename}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-8 rounded-lg bg-slate-50 dark:bg-[#16191E] border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
                      <FileCode className="w-8 h-8 text-slate-400 mx-auto" />
                      <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        No deliverable files attached to this task
                      </h5>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        This task does not have standalone artifact files. You can review the executive report in the Summary tab.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Inbox className="w-12 h-12 mb-3 stroke-[1.5] text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">Select a notification to view details</p>
          </div>
        )}
      </div>

      {/* ARTIFACT PREVIEW MODAL */}
      {previewAttachment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl border border-slate-200 dark:border-[#282D37] bg-white dark:bg-[#16191E] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between bg-slate-50/70 dark:bg-[#13151A]">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-500" />
                <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                  {previewAttachment.filename}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({(previewAttachment.size / 1024).toFixed(1)} KB)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewContent)
                    setCopiedCode(true)
                    setTimeout(() => setCopiedCode(false), 2000)
                  }}
                  className="px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>

                <a
                  href={hermesApi.getAttachmentDownloadUrl(previewAttachment.id)}
                  download={previewAttachment.filename}
                  className="px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </a>

                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#0A0C10]">
              {previewLoading ? (
                <div className="h-64 flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-xs">Loading code deliverable...</span>
                </div>
              ) : (
                <CodeBlock
                  code={previewContent}
                  language={previewAttachment.filename.split('.').pop() || 'text'}
                  filename={previewAttachment.filename}
                  showLineNumbers={true}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Image & Architecture Diagram Preview Modal (Fase 5: TASK-5.2) */}
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
    </div>
  )
}
