import React, { useState, useMemo } from 'react'
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
  ListChecks,
  AlertTriangle
} from 'lucide-react'
import { Task, TaskStatus, AIAgent, BoardStats, KanbanConfig } from '../types'
import { TaskDetailModal } from './TaskDetailModal'
import { FolderGit2 } from 'lucide-react'

interface KanbanBoardProps {
  tasks: Task[]
  agents?: AIAgent[]
  activeBoard?: string
  activeBoardName?: string
  boardStats?: BoardStats
  kanbanConfig?: KanbanConfig
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void | Promise<void>
  onOpenNewIssue: (initialStatus?: TaskStatus) => void
  onRunAgent: (taskId: string) => Promise<boolean | void>
  onSendComment?: (taskId: string, note: string) => Promise<boolean> | boolean
  onRefreshTasks?: () => Promise<void> | void
  onDeleteTask?: (taskId: string) => Promise<boolean>
  selectedTaskIds?: Set<string>
  onToggleSelect?: (taskId: string) => void
}

const defaultColumns: { id: TaskStatus; title: string; color: string; bgBadge: string }[] = [
  { id: 'triage', title: 'Triage', color: 'text-purple-400', bgBadge: 'bg-purple-500/10 text-purple-400' },
  { id: 'todo', title: 'Todo', color: 'text-slate-400', bgBadge: 'bg-slate-500/10 text-slate-400' },
  { id: 'scheduled', title: 'Scheduled', color: 'text-cyan-500', bgBadge: 'bg-cyan-500/10 text-cyan-500' },
  { id: 'ready', title: 'Ready', color: 'text-green-500', bgBadge: 'bg-green-500/10 text-green-500' },
  { id: 'running', title: 'Running', color: 'text-[#F97316]', bgBadge: 'bg-orange-500/10 text-[#F97316]' },
  { id: 'blocked', title: 'Blocked', color: 'text-rose-500', bgBadge: 'bg-rose-500/10 text-rose-500' },
  { id: 'review', title: 'Review', color: 'text-amber-500', bgBadge: 'bg-amber-500/10 text-amber-500' },
  { id: 'done', title: 'Done', color: 'text-emerald-500', bgBadge: 'bg-emerald-500/10 text-emerald-500' }
]

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  agents = [],
  activeBoard = 'default',
  activeBoardName,
  boardStats,
  kanbanConfig,
  onUpdateTaskStatus,
  onOpenNewIssue,
  onRunAgent,
  onSendComment,
  onRefreshTasks,
  onDeleteTask,
  selectedTaskIds = new Set(),
  onToggleSelect
}) => {
  const [filterType, setFilterType] = useState<'all' | 'members' | 'agents'>('all')

  const columns = useMemo(() => {
    if (kanbanConfig?.include_archived_by_default) {
      return [
        ...defaultColumns,
        { id: 'archived' as TaskStatus, title: 'Archived', color: 'text-slate-500', bgBadge: 'bg-slate-500/10 text-slate-500' }
      ]
    }
    return defaultColumns
  }, [kanbanConfig?.include_archived_by_default])
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
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-[#FAF9F9] dark:bg-[#0F1115] font-body">
      {/* Sub-header Filters */}
      <div className="px-4 py-2 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-[#2A2524] text-orange-600 dark:text-orange-400 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('members')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                filterType === 'members'
                  ? 'bg-white dark:bg-[#2A2524] text-orange-600 dark:text-orange-400 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setFilterType('agents')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                filterType === 'agents'
                  ? 'bg-white dark:bg-[#2A2524] text-orange-600 dark:text-orange-400 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Agents
            </button>
          </div>
        </div>

        {/* Board Mini Stats (Fase 2: TASK-2.3) */}
        {boardStats && (
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono">
            {/* Status breakdown */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] shadow-2xs">
              <span className="text-slate-400 font-sans">Total:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">{boardStats.total || tasks.length}</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-green-500 dark:text-green-400 font-medium">Ready: {boardStats.byStatus?.ready || 0}</span>
              <span className="text-orange-500 dark:text-[#FB923C] font-medium">Running: {boardStats.byStatus?.running || 0}</span>
              {(boardStats.byStatus?.blocked || 0) > 0 && (
                <span className="text-rose-500 dark:text-rose-400 font-medium">Blocked: {boardStats.byStatus?.blocked}</span>
              )}
            </div>

            {/* Oldest Ready Age — only when the backend actually reported one. */}
            {boardStats.oldestReadyAgeSeconds !== undefined && (
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                  boardStats.oldestReadyAgeSeconds > 900
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400'
                    : 'bg-white dark:bg-[#191C21] border-[#E7E5E4] dark:border-[#2A2524] text-slate-500 dark:text-slate-400'
                }`}
                title="Oldest ready task age (helps detect stuck dispatcher)"
              >
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="font-sans">Oldest Ready:</span>
                <span className="font-semibold">
                  {boardStats.oldestReadyAgeFormatted}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Board indicator tag */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-white dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] text-slate-600 dark:text-slate-400 shadow-2xs">
          <FolderGit2 className="w-3.5 h-3.5 text-[#F97316]" />
          <span>Board:</span>
          <span className="font-semibold font-mono text-slate-900 dark:text-white">
            {activeBoardName || activeBoard}
          </span>
        </div>
      </div>

      {/* Board Columns Container */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-4">
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
              className={`w-72 shrink-0 flex flex-col max-h-full rounded-2xl bg-slate-100/50 dark:bg-[#15181F] border transition-all ${
                dragOverCol === col.id
                  ? 'border-[#F97316] dark:border-[#F97316] ring-1 ring-orange-500/40 shadow-md'
                  : 'border-[#E7E5E4] dark:border-[#2A2524]'
              }`}
            >
              {/* Column Header */}
              <div className="p-3 flex items-center justify-between border-b border-[#E7E5E4] dark:border-[#2A2524]">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold font-display ${col.color}`}>{col.title}</span>
                  <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${col.bgBadge}`}>
                    {colTasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    onClick={() => onOpenNewIssue(col.id)}
                    className="p-1 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer transition-colors"
                    title="Add Issue"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer transition-colors">
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
                  colTasks.map(task => {
                  const isSelected = selectedTaskIds.has(task.id)
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`p-3.5 rounded-2xl bg-white dark:bg-[#191C21] border shadow-xs hover:border-orange-500/50 dark:hover:border-orange-500/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-200 group cursor-grab active:cursor-grabbing ${
                        isSelected
                          ? 'border-[#F97316] bg-orange-500/5 dark:bg-orange-950/20 ring-1 ring-orange-500/40'
                          : 'border-[#E7E5E4] dark:border-[#2A2524]'
                      } ${draggingId === task.id ? 'opacity-40' : ''}`}
                    >
                      {/* Top meta: Checkbox + ID + Priority + Blocked */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={e => e.stopPropagation()}
                            onChange={() => onToggleSelect && onToggleSelect(task.id)}
                            aria-label={`Select task ${task.title}`}
                            className={`rounded border-[#E7E5E4] dark:border-[#2A2524] bg-slate-100 dark:bg-[#14161B] text-[#F97316] focus:ring-0 focus:ring-offset-0 cursor-pointer transition-opacity ${
                              selectedTaskIds.size > 0 || isSelected
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100'
                            }`}
                          />
                          <span className="font-mono font-medium text-slate-500 dark:text-slate-400">
                            {task.displayId || task.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {task.isBlocked && task.status !== 'done' && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.2 rounded-md border border-rose-500/20"
                              title="Task is blocked by incomplete parent dependencies"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>Blocked</span>
                            </span>
                          )}
                          {task.diagnostics && task.diagnostics.length > 0 && (() => {
                            const maxSev = task.diagnostics!.some(d => d.severity === 'critical')
                              ? 'critical'
                              : task.diagnostics!.some(d => d.severity === 'error')
                              ? 'error'
                              : 'warning'
                            const sevColor = maxSev === 'critical'
                              ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                              : maxSev === 'error'
                              ? 'text-orange-500 bg-orange-500/10 border-orange-500/20'
                              : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
                            return (
                              <span
                                className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded-md border ${sevColor}`}
                                title={task.diagnostics!.map(d => `[${d.severity}] ${d.message}`).join('\n')}
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>{task.diagnostics!.length}</span>
                              </span>
                            )
                          })()}
                          {task.priority === 'urgent' && (
                            <span className="flex items-center gap-1 text-rose-500 font-semibold font-mono">
                              <AlertCircle className="w-3 h-3" /> Urgent
                            </span>
                          )}
                          {task.priority === 'high' && (
                            <span className="text-amber-500 font-medium font-mono">High</span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 mb-2 font-display">
                        {task.title}
                      </h4>

                      {/* Subtasks Progress Indicator (Fase 1: TASK-1.3) */}
                      {task.subtasksCount && task.subtasksCount.total > 0 && (
                        <div className="mb-2 p-2 rounded-lg bg-slate-50 dark:bg-[#14161B] border border-slate-200/60 dark:border-[#2A2524]">
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1 text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 text-orange-600 dark:text-[#FB923C] font-medium">
                              <ListChecks className="w-2.5 h-2.5" />
                              <span>{task.subtasksCount.done}/{task.subtasksCount.total} subtasks</span>
                            </span>
                            <span>{Math.round((task.subtasksCount.done / task.subtasksCount.total) * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-[#F97316] h-full rounded-full transition-all"
                              style={{ width: `${(task.subtasksCount.done / task.subtasksCount.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Project Tag */}
                      {task.projectTag && (
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                            <Tag className="w-2.5 h-2.5" />
                            {task.projectTag}
                          </span>
                        </div>
                      )}

                      {/* Footer: Assignee & updated */}
                      <div className="pt-2 border-t border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          {task.assigneeType === 'agent' ? (
                            <span className="w-4 h-4 rounded bg-orange-500/10 text-[#F97316] flex items-center justify-center text-[10px]">
                              {task.assigneeAvatar || '🤖'}
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded bg-orange-500/10 text-[#F97316] flex items-center justify-center text-[10px]">
                              👤
                            </span>
                          )}
                          <span className="truncate max-w-[90px] text-[10px] font-medium">
                            {task.assigneeName}
                          </span>
                        </div>

                        {/* Direct Run Agent Action */}
                        {task.status === 'running' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F97316] bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse" />
                            Working
                          </span>
                        ) : task.status !== 'done' ? (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              handleRunSingle(task.id)
                            }}
                            disabled={runningTaskId === task.id}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-gradient-to-r from-[#F97316] to-[#FB923C] hover:from-[#EA580C] hover:to-[#F97316] px-2.5 py-0.5 rounded-lg shadow-xs shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono">
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
                              // 'ready' -> 'running' is handled upstream by routing into the
                              // dispatcher (a direct status write to 'running' is refused).
                              // 'blocked' unblocks to 'ready' — unblock_task re-gates on
                              // parents rather than forcing the task straight into a worker.
                              const nextMap: Record<TaskStatus, TaskStatus> = {
                                triage: 'todo',
                                todo: 'scheduled',
                                scheduled: 'ready',
                                ready: 'running',
                                running: 'review',
                                blocked: 'ready',
                                review: 'done',
                                done: 'done',
                                archived: 'archived'
                              }
                              onUpdateTaskStatus(task.id, nextMap[col.id as TaskStatus])
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/60 text-[#F97316] dark:text-[#FB923C] hover:bg-orange-100 dark:hover:bg-orange-900/60 flex items-center gap-1 font-mono cursor-pointer transition-colors"
                          >
                            <span>Next</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
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
          onDeleteTask={onDeleteTask}
          kanbanConfig={kanbanConfig}
        />
      )}
    </div>
  )
}
