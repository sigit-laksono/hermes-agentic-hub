import React, { useState } from 'react'
import {
  Inbox,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Sparkles
} from 'lucide-react'
import { Task } from '../types'

interface InboxViewProps {
  tasks: Task[]
  onApproveTask: (taskId: string) => void
  onRequestChanges: (taskId: string) => void
}

export const InboxView: React.FC<InboxViewProps> = ({
  tasks,
  onApproveTask,
  onRequestChanges
}) => {
  // Reviewable/recent tasks
  const reviewTasks = tasks.filter(t => t.status === 'in_review' || t.status === 'done')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    reviewTasks.length > 0 ? reviewTasks[0].id : null
  )

  const selectedTask = tasks.find(t => t.id === selectedTaskId)

  return (
    <div className="flex-1 flex h-[calc(100vh-3rem)] overflow-hidden bg-white dark:bg-[#0D0F12]">
      {/* Left Pane: Notification List */}
      <div className="w-80 border-r border-slate-200 dark:border-[#23272F] flex flex-col bg-slate-50 dark:bg-[#111317]">
        <div className="p-3 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-semibold text-slate-800 dark:text-white">Inbox</h2>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-500 font-bold">
              {reviewTasks.filter(t => t.status === 'in_review').length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 dark:divide-[#1E222A]">
          {reviewTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">All caught up!</div>
          ) : (
            reviewTasks.map(task => {
              const isSelected = task.id === selectedTaskId
              const isPendingReview = task.status === 'in_review'

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`p-3 cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-l-2 border-blue-500'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
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
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
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

      {/* Right Pane: Detail & Verification View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#14171D]">
        {selectedTask ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Header bar */}
            <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                    {selectedTask.id}
                  </span>
                  <span>•</span>
                  <span>{selectedTask.projectName}</span>
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
                      onClick={() => onRequestChanges(selectedTask.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Changes</span>
                    </button>
                    <button
                      onClick={() => onApproveTask(selectedTask.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Done</span>
                    </button>
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-blue-500 font-medium px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/40">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Agent Execution Report */}
              <div className="rounded-lg border border-slate-200 dark:border-[#23272F] bg-slate-50 dark:bg-[#16191E] p-4">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-[#23272F] text-xs">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Agent Work Output ({selectedTask.assigneeName})
                  </span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                  {selectedTask.reviewReport || selectedTask.description}
                </div>
              </div>

              {/* Discussion / Comment Box */}
              <div className="rounded-lg border border-slate-200 dark:border-[#23272F] p-4">
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Leave Feedback / Instruction
                </h4>
                <textarea
                  placeholder="Tambahkan catatan revisi atau instruksi lanjutan untuk agen..."
                  className="w-full h-20 p-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <div className="mt-2 flex justify-end">
                  <button className="px-3 py-1 rounded text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600">
                    Send Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Inbox className="w-12 h-12 mb-3 stroke-[1.5] text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">Select a notification to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
