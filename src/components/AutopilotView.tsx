import React, { useState } from 'react'
import { Zap, Plus, Clock, Play, Pause, Loader2, Edit2, Trash2, History } from 'lucide-react'
import { AutopilotJob } from '../types'

interface AutopilotViewProps {
  autopilots: AutopilotJob[]
  onRunNow: (jobId: string) => Promise<void> | void
  onToggleStatus: (jobId: string, current: AutopilotJob['status']) => Promise<void> | void
  onNewAutopilot: () => void
  onEditAutopilot?: (job: AutopilotJob) => void
  onDeleteAutopilot?: (jobId: string) => Promise<void> | void
  onViewHistory?: (jobId: string) => void
}

export const AutopilotView: React.FC<AutopilotViewProps> = ({
  autopilots,
  onRunNow,
  onToggleStatus,
  onNewAutopilot,
  onEditAutopilot,
  onDeleteAutopilot,
  onViewHistory
}) => {
  // Per-row busy state keyed by job id so only the acted row shows a spinner.
  const [runningId, setRunningId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleRun = async (jobId: string) => {
    if (runningId) return
    setRunningId(jobId)
    try {
      await onRunNow(jobId)
    } finally {
      setRunningId(null)
    }
  }

  const handleToggle = async (job: AutopilotJob) => {
    if (togglingId) return
    setTogglingId(job.id)
    try {
      await onToggleStatus(job.id, job.status)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (jobId: string) => {
    if (!onDeleteAutopilot || deletingId) return
    setDeletingId(jobId)
    try {
      await onDeleteAutopilot(jobId)
      setConfirmDeleteId(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-[#FAF9F9] dark:bg-[#0F1115] font-body">
      {/* Header */}
      <div className="p-4 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between bg-white dark:bg-[#14161C]">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 font-display">
            <Zap className="w-4 h-4 text-[#F97316]" />
            Autopilot
            <span className="text-xs font-normal text-slate-400 font-mono">({autopilots.length})</span>
          </h2>
          <span className="text-xs text-slate-500">
            Automated schedulers powered by Hermes Cron engine
          </span>
        </div>

        <button
          onClick={onNewAutopilot}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white transition-all shadow-xs shadow-orange-500/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New autopilot</span>
        </button>
      </div>

      {/* Autopilot List */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#191C21] text-slate-500 font-mono text-[11px] uppercase">
              <th className="py-2.5 px-4 font-medium">Name</th>
              <th className="py-2.5 px-4 font-medium">Assignee</th>
              <th className="py-2.5 px-4 font-medium">Trigger</th>
              <th className="py-2.5 px-4 font-medium">Last Run</th>
              <th className="py-2.5 px-4 font-medium">Next Run</th>
              <th className="py-2.5 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5E4] dark:divide-[#2A2524]">
            {autopilots.map(job => (
              <tr
                key={job.id}
                className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <td className="py-3 px-4 font-medium text-slate-900 dark:text-white flex items-center gap-2 font-display">
                  <span className="text-[#F97316]">⚡</span>
                  <span>{job.name}</span>
                </td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span>{job.assigneeAvatar || '🤖'}</span>
                    <span>{job.assignee}</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{job.trigger}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                  ● {job.lastRun}
                </td>
                <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                  {job.nextRun}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* History button */}
                    {onViewHistory && (
                      <button
                        onClick={() => onViewHistory(job.id)}
                        title="View execution history"
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#191C21] hover:bg-slate-200 dark:hover:bg-[#2A2524] text-slate-600 dark:text-slate-400 border border-[#E7E5E4] dark:border-[#2A2524] cursor-pointer transition-colors"
                      >
                        <History className="w-3 h-3" />
                      </button>
                    )}

                    {/* Edit button */}
                    {onEditAutopilot && (
                      <button
                        onClick={() => onEditAutopilot(job)}
                        title="Edit autopilot"
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#191C21] hover:bg-slate-200 dark:hover:bg-[#2A2524] text-slate-600 dark:text-slate-400 border border-[#E7E5E4] dark:border-[#2A2524] cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}

                    {/* Pause / Resume toggle reflecting live enabled state */}
                    <button
                      onClick={() => handleToggle(job)}
                      disabled={togglingId === job.id}
                      title={job.status === 'active' ? 'Pause schedule' : 'Resume schedule'}
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium disabled:opacity-50 cursor-pointer transition-colors ${
                        job.status === 'active'
                          ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-[#FB923C] hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-500/20'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-500/20'
                      }`}
                    >
                      {togglingId === job.id ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : job.status === 'active' ? (
                        <Pause className="w-2.5 h-2.5 fill-current" />
                      ) : (
                        <Play className="w-2.5 h-2.5 fill-current" />
                      )}
                      <span>{job.status === 'active' ? 'Pause' : 'Resume'}</span>
                    </button>

                    {/* Run now (manual trigger) */}
                    <button
                      onClick={() => handleRun(job.id)}
                      disabled={runningId === job.id}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#191C21] hover:bg-slate-200 dark:hover:bg-[#2A2524] text-slate-700 dark:text-slate-300 border border-[#E7E5E4] dark:border-[#2A2524] flex items-center gap-1 text-[11px] font-medium disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      {runningId === job.id ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Play className="w-2.5 h-2.5 fill-current" />
                      )}
                      <span>{runningId === job.id ? 'Running…' : 'Run now'}</span>
                    </button>

                    {/* Delete button with confirmation */}
                    {onDeleteAutopilot && (
                      confirmDeleteId === job.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(job.id)}
                            disabled={deletingId === job.id}
                            className="px-2 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-medium disabled:opacity-50 cursor-pointer transition-colors"
                          >
                            {deletingId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={deletingId === job.id}
                            className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-[#2A2524] hover:bg-slate-300 dark:hover:bg-[#34383F] text-slate-700 dark:text-slate-300 text-[11px] font-medium cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(job.id)}
                          title="Delete autopilot"
                          className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-500/20 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
