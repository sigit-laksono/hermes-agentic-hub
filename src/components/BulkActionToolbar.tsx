import React, { useState } from 'react'
import {
  X,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { TaskStatus, Priority, AIAgent } from '../types'

interface BulkActionToolbarProps {
  selectedCount: number
  agents: AIAgent[]
  onClearSelection: () => void
  onBulkStatusChange: (status: TaskStatus) => Promise<void>
  onBulkAssigneeChange: (assignee: string) => Promise<void>
  onBulkPriorityChange: (priority: Priority) => Promise<void>
  onBulkArchive: () => Promise<void>
  partialErrors?: { taskId: string; error: string }[]
  onDismissErrors?: () => void
}

// 'running' is deliberately absent: the backend refuses a direct status write to it
// ("use the dispatcher/claim path"), so offering it here would fail on every task.
// Promote to 'ready' instead and let the dispatcher claim the work.
const statusList: { id: TaskStatus; label: string }[] = [
  { id: 'triage', label: 'Triage' },
  { id: 'todo', label: 'Todo' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'ready', label: 'Ready' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' }
]

const priorityList: { id: Priority; label: string }[] = [
  { id: 'urgent', label: 'Urgent' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
  { id: 'none', label: 'None' }
]

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  agents,
  onClearSelection,
  onBulkStatusChange,
  onBulkAssigneeChange,
  onBulkPriorityChange,
  onBulkArchive,
  partialErrors,
  onDismissErrors
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmArchive, setShowConfirmArchive] = useState(false)

  if (selectedCount === 0) return null

  const handleStatusSelect = async (status: TaskStatus) => {
    setIsProcessing(true)
    try {
      await onBulkStatusChange(status)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAssigneeSelect = async (assignee: string) => {
    setIsProcessing(true)
    try {
      await onBulkAssigneeChange(assignee)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrioritySelect = async (priority: Priority) => {
    setIsProcessing(true)
    try {
      await onBulkPriorityChange(priority)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleArchive = async () => {
    setShowConfirmArchive(false)
    setIsProcessing(true)
    try {
      await onBulkArchive()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#191C21] border border-[#2A2524] rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-bottom-4 text-xs select-none font-body">
        {/* Selection Count Badge */}
        <div className="flex items-center gap-2 pr-3 border-r border-[#2A2524]">
          <div className="flex items-center justify-center w-5 h-5 rounded-md bg-orange-500/20 text-[#FB923C] font-bold text-[11px] font-mono">
            {selectedCount}
          </div>
          <span className="font-semibold text-white whitespace-nowrap">
            {selectedCount} {selectedCount === 1 ? 'task' : 'tasks'} selected
          </span>
          <button
            onClick={onClearSelection}
            className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
            title="Clear selection (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              disabled={isProcessing}
              onChange={e => {
                if (e.target.value) handleStatusSelect(e.target.value as TaskStatus)
                e.target.value = ''
              }}
              defaultValue=""
              aria-label="Change status for selected tasks"
              className="bg-[#14161B] hover:bg-[#20242D] text-slate-200 border border-[#2A2524] rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer focus:outline-none focus:border-[#F97316] transition-colors disabled:opacity-50"
            >
              <option value="" disabled>Status...</option>
              {statusList.map(s => (
                <option key={s.id} value={s.id} className="bg-[#191C21] text-slate-200">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Dropdown */}
          <div className="relative">
            <select
              disabled={isProcessing}
              onChange={e => {
                if (e.target.value) handleAssigneeSelect(e.target.value)
                e.target.value = ''
              }}
              defaultValue=""
              aria-label="Change assignee for selected tasks"
              className="bg-[#14161B] hover:bg-[#20242D] text-slate-200 border border-[#2A2524] rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer focus:outline-none focus:border-[#F97316] transition-colors disabled:opacity-50 max-w-[140px] truncate"
            >
              <option value="" disabled>Assignee...</option>
              {agents.map(ag => (
                <option key={ag.id} value={ag.id} className="bg-[#191C21] text-slate-200">
                  {ag.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="relative">
            <select
              disabled={isProcessing}
              onChange={e => {
                if (e.target.value) handlePrioritySelect(e.target.value as Priority)
                e.target.value = ''
              }}
              defaultValue=""
              aria-label="Change priority for selected tasks"
              className="bg-[#14161B] hover:bg-[#20242D] text-slate-200 border border-[#2A2524] rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer focus:outline-none focus:border-[#F97316] transition-colors disabled:opacity-50"
            >
              <option value="" disabled>Priority...</option>
              {priorityList.map(p => (
                <option key={p.id} value={p.id} className="bg-[#191C21] text-slate-200">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Archive / Delete Button */}
          <button
            onClick={() => setShowConfirmArchive(true)}
            disabled={isProcessing}
            className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Archive / Delete selected tasks"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Archive</span>
          </button>
        </div>

        {/* Processing Spinner */}
        {isProcessing && (
          <div className="flex items-center gap-1.5 pl-2 text-slate-400 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F97316]" />
            <span>Updating...</span>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Bulk Archive */}
      {showConfirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 font-body">
          <div className="bg-[#191C21] border border-[#2A2524] rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Archive {selectedCount} Tasks</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tasks are hidden, not deleted.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Move the {selectedCount} selected {selectedCount === 1 ? 'task' : 'tasks'} to{' '}
              <span className="font-semibold text-slate-200">archived</span>? They leave the board but are
              kept in Hermes, and any task still running will have its worker stopped.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowConfirmArchive(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#1C2027] hover:bg-[#252A33] border border-[#2B303C] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 cursor-pointer transition-colors shadow-xs"
              >
                Archive Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Failure Warning Banner */}
      {partialErrors && partialErrors.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-[#251A1D] border border-rose-500/30 rounded-xl shadow-2xl px-4 py-2.5 max-w-md w-full text-xs text-rose-300 flex items-start gap-2.5 animate-in slide-in-from-bottom-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-rose-200">
              Some tasks failed to update ({partialErrors.length}):
            </div>
            <ul className="mt-1 max-h-24 overflow-y-auto space-y-0.5 text-[11px] text-rose-300">
              {partialErrors.map((err, idx) => (
                <li key={idx}>
                  <span className="font-mono font-semibold">{err.taskId}:</span> {err.error}
                </li>
              ))}
            </ul>
          </div>
          {onDismissErrors && (
            <button
              onClick={onDismissErrors}
              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </>
  )
}
