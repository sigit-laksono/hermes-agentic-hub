import React, { useEffect, useState } from 'react'
import { X, Clock, CheckCircle2, XCircle, Loader2, History } from 'lucide-react'
import { hermesApi } from '../api/hermesApi'

interface CronHistoryDrawerProps {
  jobId: string | null
  jobName?: string
  onClose: () => void
}

interface CronRun {
  id: string
  started_at: number
  ended_at?: number
  status: 'success' | 'failed' | 'running'
  duration_seconds?: number
  summary?: string
  error?: string
}

export const CronHistoryDrawer: React.FC<CronHistoryDrawerProps> = ({ jobId, jobName, onClose }) => {
  const [runs, setRuns] = useState<CronRun[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!jobId) return

    const fetchHistory = async () => {
      setLoading(true)
      try {
        const data = await hermesApi.getCronJobHistory(jobId)
        setRuns(data.runs || [])
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [jobId])

  useEffect(() => {
    if (!jobId) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [jobId, onClose])

  if (!jobId) return null

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatTimestamp = (ts: number) => {
    return new Date(ts * 1000).toLocaleString()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-[#191C21] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-[#E7E5E4] dark:border-[#2A2524]">
        {/* Header */}
        <div className="p-4 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between bg-slate-50/50 dark:bg-[#14161B]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#F97316]" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm font-display">
              Execution History
            </h3>
            {jobName && (
              <span className="text-xs text-slate-500 font-mono">— {jobName}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#F97316]" />
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">No execution history yet</p>
              <p className="text-xs text-slate-400 mt-1">This job hasn't run or history is not available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="p-4 rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#14161B] hover:border-[#F97316]/30 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {run.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : run.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                      )}
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                        {run.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(run.duration_seconds)}</span>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="text-xs text-slate-500 space-y-1 mb-2 font-mono">
                    <div>Started: {formatTimestamp(run.started_at)}</div>
                    {run.ended_at && <div>Ended: {formatTimestamp(run.ended_at)}</div>}
                  </div>

                  {/* Summary or Error */}
                  {run.summary && (
                    <div className="mt-2 p-2 rounded bg-slate-50 dark:bg-[#1A1D24] text-xs text-slate-700 dark:text-slate-300">
                      {run.summary}
                    </div>
                  )}
                  {run.error && (
                    <div className="mt-2 p-2 rounded bg-rose-50 dark:bg-rose-950/20 text-xs text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30">
                      <strong>Error:</strong> {run.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50/50 dark:bg-[#14161B]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2A2524] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
