import React from 'react'
import { Zap, Plus, Clock, Play } from 'lucide-react'
import { AutopilotJob } from '../types'

interface AutopilotViewProps {
  autopilots: AutopilotJob[]
}

export const AutopilotView: React.FC<AutopilotViewProps> = ({ autopilots }) => {
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

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs">
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
                  <button className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px]">
                    <Play className="w-2.5 h-2.5 fill-current" /> Run now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
