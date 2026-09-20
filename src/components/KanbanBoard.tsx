import React, { useState } from 'react'
import {
  MoreHorizontal,
  Plus,
  AlertCircle,
  Clock,
  Tag,
  ArrowRight,
  Play,
  Loader2,
  Lock,
  ListChecks
} from 'lucide-react'
import { Task, TaskStatus, AIAgent } from '../types'
import { TaskDetailModal } from './TaskDetailModal'
import { FolderGit2 } from 'lucide-react'

interface KanbanBoardProps {
  tasks: Task[]
  agents?: AIAgent[]
  activeBoard?: string
  activeBoardName?: string
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void
  onOpenNewIssue: (initialStatus?: TaskStatus) => void
  onRunAgent: (taskId: string) => Promise<boolean | void>
  onSendComment?: (taskId: string, note: string) => Promise<boolean> | boolean
  onRefreshTasks?: () => Promise<void> | void
}

const columns: { id: TaskStatus; title: string; color: string; bgBadge: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'text-slate-400', bgBadge: 'bg-slate-500/10 text-slate-400' },
  { id: 'todo', title: 'Todo', color: 'text-slate-400', bgBadge: 'bg-slate-500/10 text-slate-400' },
  { id: 'in_progress', title: 'In Progress', color: 'text-amber-500', bgBadge: 'bg-amber-500/10 text-amber-500' },
  { id: 'in_review', title: 'In Review', color: 'text-emerald-500', bgBadge: 'bg-emerald-500/10 text-emerald-500' },
  { id: 'blocked', title: 'Blocked', color: 'text-rose-500', bgBadge: 'bg-rose-500/10 text-rose-500' },
  { id: 'done', title: 'Done', color: 'text-blue-500', bgBadge: 'bg-blue-500/10 text-blue-500' }
]

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  agents = [],
  activeBoard = 'default',
  activeBoardName,
  onUpdateTaskStatus,
  onOpenNewIssue,
  onRunAgent,
  onSendComment,
  onRefreshTasks
}) => {
  const [filterType, setFilterType] = useState<'all' | 'members' | 'agents'>('all')
  // Native HTML5 drag-and-drop state (no external dependency).
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) || null : null

  const filteredTasks = tasks.filter(t => {
    if (filterType === 'members') return t.assigneeType === 'member'
    if (filterType === 'agents') return t.assigneeType === 'agent'
    return true
  })

  const handleRunSingle = async (taskId: string) => {
    setRunningTaskId(taskId)
    try {
      await onRunAgent(taskId)
    } finally {
      setRunningTaskId(null)
    }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverCol(null)
  }

  const handleDrop = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain') || draggingId
    setDragOverCol(null)
    setDraggingId(null)
    if (!taskId) return
    const task = filteredTasks.find(t => t.id === taskId)
    // Only update when the column actually changed.
    if (task && task.status !== colId) {
      onUpdateTaskStatus(taskId, colId)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-slate-50/50 dark:bg-[#0D0F12]">
      {/* Sub-header Filters */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700/60">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('members')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                filterType === 'members'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setFilterType('agents')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                filterType === 'agents'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Agents
            </button>
          </div>
        </div>

        {/* Board indicator tag */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-white dark:bg-[#14171D] border border-slate-200 dark:border-[#282D37] text-slate-600 dark:text-slate-400">
          <FolderGit2 className="w-3.5 h-3.5 text-blue-500" />
          <span>Board:</span>
          <span className="font-semibold font-mono text-slate-900 dark:text-white">
            {activeBoardName || activeBoard}
          </span>
        </div>
      </div>

      {/* Board Columns Container */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-3.5">
        {columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id)
          return (
            <div
              key={col.id}
              onDragOver={e => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragOverCol !== col.id) setDragOverCol(col.id)
              }}
              onDragLeave={e => {
                // Only clear when leaving the column entirely (not entering a child).
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverCol(prev => (prev === col.id ? null : prev))
                }
              }}
              onDrop={e => handleDrop(e, col.id)}
              className={`w-72 shrink-0 flex flex-col max-h-full rounded-lg bg-slate-100/70 dark:bg-[#14171D] border transition-colors ${
                dragOverCol === col.id
                  ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500/40'
                  : 'border-slate-200/80 dark:border-[#20242D]'
              }`}
            >
              {/* Column Header */}
              <div className="p-2.5 flex items-center justify-between border-b border-slate-200 dark:border-[#20242D]">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${col.color}`}>{col.title}</span>
                  <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${col.bgBadge}`}>
                    {colTasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    onClick={() => onOpenNewIssue(col.id)}
                    className="p-1 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                    title="Add Issue"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 hover:text-slate-700 dark:hover:text-slate-200 rounded">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tasks List in Column */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colTasks.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-600">
                    No issues
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`p-3 rounded-md bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-[#282D37] shadow-xs hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all group cursor-grab active:cursor-grabbing ${
                        draggingId === task.id ? 'opacity-40' : ''
                      }`}
                    >
                      {/* Top meta: ID + Priority + Blocked */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                        <span className="font-mono font-medium text-slate-500 dark:text-slate-400">
                          {task.id}
                        </span>
                        <div className="flex items-center gap-1">
                          {task.isBlocked && task.status !== 'done' && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20"
                              title="Task is blocked by incomplete parent dependencies"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>Blocked</span>
                            </span>
                          )}
                          {task.priority === 'urgent' && (
                            <span className="flex items-center gap-1 text-rose-500 font-semibold">
                              <AlertCircle className="w-3 h-3" /> Urgent
                            </span>
                          )}
                          {task.priority === 'high' && (
                            <span className="text-amber-500 font-medium">High</span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 mb-2">
                        {task.title}
                      </h4>

                      {/* Subtasks Progress Indicator (Fase 1: TASK-1.3) */}
                      {task.subtasksCount && task.subtasksCount.total > 0 && (
                        <div className="mb-2 p-1.5 rounded bg-slate-100 dark:bg-[#15171E] border border-slate-200/60 dark:border-[#222733]">
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1 text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                              <ListChecks className="w-2.5 h-2.5" />
                              <span>{task.subtasksCount.done}/{task.subtasksCount.total} subtasks</span>
                            </span>
                            <span>{Math.round((task.subtasksCount.done / task.subtasksCount.total) * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all"
                              style={{ width: `${(task.subtasksCount.done / task.subtasksCount.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Project Tag */}
                      {task.projectTag && (
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                            <Tag className="w-2.5 h-2.5" />
                            {task.projectTag}
                          </span>
                        </div>
                      )}

                      {/* Footer: Assignee & updated */}
                      <div className="pt-2 border-t border-slate-100 dark:border-[#242832] flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          {task.assigneeType === 'agent' ? (
                            <span className="w-4 h-4 rounded bg-purple-500/20 text-purple-500 flex items-center justify-center text-[10px]">
                              {task.assigneeAvatar || '🤖'}
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px]">
                              👤
                            </span>
                          )}
                          <span className="truncate max-w-[90px] text-[10px] font-medium">
                            {task.assigneeName}
                          </span>
                        </div>

                        {/* Direct Run Agent Action */}
                        {task.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Working
                          </span>
                        ) : task.status !== 'done' ? (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              handleRunSingle(task.id)
                            }}
                            disabled={runningTaskId === task.id}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-2 py-0.5 rounded shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            title="Run task with Hermes Agent immediately"
                          >
                            {runningTaskId === task.id ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Play className="w-2.5 h-2.5 fill-current" />
                            )}
                            <span>Run Agent</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {task.updatedAt}
                          </span>
                        )}
                      </div>

                      {/* Quick status progress actions on hover */}
                      <div className="mt-2 pt-1.5 border-t border-dashed border-slate-100 dark:border-slate-800/60 hidden group-hover:flex items-center justify-end gap-1">
                        {col.id !== 'done' && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              const nextMap: Record<TaskStatus, TaskStatus> = {
                                backlog: 'todo',
                                todo: 'in_progress',
                                in_progress: 'in_review',
                                in_review: 'done',
                                blocked: 'in_progress',
                                done: 'done'
                              }
                              onUpdateTaskStatus(task.id, nextMap[col.id])
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 flex items-center gap-1"
                          >
                            <span>Next</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTaskId(null)}
          task={selectedTask}
          agents={agents}
          allTasks={tasks}
          activeBoard={activeBoard}
          onUpdateStatus={onUpdateTaskStatus}
          onRunAgent={onRunAgent}
          onSendComment={onSendComment || (() => false)}
          onRefreshTasks={onRefreshTasks}
        />
      )}
    </div>
  )
}
