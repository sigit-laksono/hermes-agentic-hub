import React, { useState } from 'react'
import { Zap, Plus, Clock, Play, Pause, Loader2 } from 'lucide-react'
import { AutopilotJob } from '../types'

interface AutopilotViewProps {
  autopilots: AutopilotJob[]
  onRunNow: (jobId: string) => Promise<void> | void
  onToggleStatus: (jobId: string, current: AutopilotJob['status']) => Promise<void> | void
  onNewAutopilot: () => void
}

export const AutopilotView: React.FC<AutopilotViewProps> = ({
  autopilots,
  onRunNow,
  onToggleStatus,
  onNewAutopilot
}) => {
  // Per-row busy state keyed by job id so only the acted row shows a spinner.
  const [runningId, setRunningId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

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

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-white dark:bg-[#0D0F12]">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Autopilot
            <span className="text-xs font-normal text-slate-400">({autopilots.length})</span>
          </h2>
          <span className="text-xs text-slate-500">
            Automated schedulers powered by Hermes Cron engine
          </span>
        </div>

        <button onClick={onNewAutopilot} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs">
          <Plus className="w-3.5 h-3.5" />
          <span>New autopilot</span>
        </button>
      </div>

      {/* Autopilot List */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#23272F] bg-slate-50 dark:bg-[#14171D] text-slate-500">
              <th className="py-2.5 px-4 font-medium">Name</th>
              <th className="py-2.5 px-4 font-medium">Assignee</th>
              <th className="py-2.5 px-4 font-medium">Trigger</th>
              <th className="py-2.5 px-4 font-medium">Last Run</th>
              <th className="py-2.5 px-4 font-medium">Next Run</th>
              <th className="py-2.5 px-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-[#1F232B]">
            {autopilots.map(job => (
              <tr
                key={job.id}
                className="hover:bg-slate-50 dark:hover:bg-[#16191E] transition-colors"
              >
                <td className="py-3 px-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-amber-500">⚡</span>
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
                  <div className="flex items-center gap-1.5">
                    {/* Pause / Resume toggle reflecting live enabled state */}
                    <button
                      onClick={() => handleToggle(job)}
                      disabled={togglingId === job.id}
                      title={job.status === 'active' ? 'Pause schedule' : 'Resume schedule'}
                      className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] disabled:opacity-50 ${
                        job.status === 'active'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
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
                      className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px] disabled:opacity-50"
                    >
                      {runningId === job.id ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Play className="w-2.5 h-2.5 fill-current" />
                      )}
                      <span>{runningId === job.id ? 'Running…' : 'Run now'}</span>
                    </button>
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
