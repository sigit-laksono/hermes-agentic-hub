import React, { useState, useMemo } from 'react'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Plus,
  Play,
  Loader2,
  Trash2,
  Lock,
  AlertTriangle,
  AlertCircle
} from 'lucide-react'
import { Task, TaskStatus, Priority, AIAgent, KanbanConfig, formatDisplayId } from '../types'
import { TaskDetailModal } from './TaskDetailModal'

export interface TableViewProps {
  tasks: Task[]
  agents?: AIAgent[]
  activeBoard?: string
  activeBoardName?: string
  kanbanConfig?: KanbanConfig
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void | Promise<void>
  onOpenNewIssue: (initialStatus?: TaskStatus) => void
  onRunAgent: (taskId: string) => Promise<boolean | void>
  onSendComment?: (taskId: string, note: string) => Promise<boolean> | boolean
  onRefreshTasks?: () => Promise<void> | void
  onDeleteTask?: (taskId: string) => Promise<boolean>
  selectedTaskIds?: Set<string>
  onToggleSelect?: (taskId: string) => void
  onSelectAll?: (taskIds: string[]) => void
}

type SortField = 'id' | 'title' | 'status' | 'priority' | 'assignee' | 'updated'
type SortOrder = 'asc' | 'desc'

const statusConfig: Record<
  TaskStatus,
  { label: string; color: string; bgBadge: string; dotColor: string }
> = {
  triage: {
    label: 'Triage',
    color: 'text-purple-400',
    bgBadge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    dotColor: 'bg-purple-400'
  },
  todo: {
    label: 'Todo',
    color: 'text-slate-400',
    bgBadge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    dotColor: 'bg-slate-400'
  },
  scheduled: {
    label: 'Scheduled',
    color: 'text-cyan-400',
    bgBadge: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    dotColor: 'bg-cyan-400'
  },
  ready: {
    label: 'Ready',
    color: 'text-green-400',
    bgBadge: 'bg-green-500/10 text-green-400 border border-green-500/20',
    dotColor: 'bg-green-400'
  },
  running: {
    label: 'Running',
    color: 'text-[#F97316]',
    bgBadge: 'bg-orange-500/10 text-[#F97316] border border-orange-500/20',
    dotColor: 'bg-[#F97316]'
  },
  blocked: {
    label: 'Blocked',
    color: 'text-rose-400',
    bgBadge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    dotColor: 'bg-rose-400'
  },
  review: {
    label: 'Review',
    color: 'text-amber-400',
    bgBadge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    dotColor: 'bg-amber-400'
  },
  done: {
    label: 'Done',
    color: 'text-emerald-400',
    bgBadge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    dotColor: 'bg-emerald-400'
  },
  archived: {
    label: 'Archived',
    color: 'text-slate-500',
    bgBadge: 'bg-slate-500/10 text-slate-500 border border-slate-500/20',
    dotColor: 'bg-slate-500'
  }
}

const priorityOrder: Record<Priority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0
}

export const TableView: React.FC<TableViewProps> = ({
  tasks,
  agents = [],
  kanbanConfig,
  onUpdateTaskStatus,
  onOpenNewIssue,
  onRunAgent,
  onSendComment,
  onRefreshTasks,
  onDeleteTask,
  selectedTaskIds = new Set(),
  onToggleSelect,
  onSelectAll
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')

  // Sorting
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = task.title.toLowerCase().includes(q)
        const matchId = task.id.toLowerCase().includes(q)
        const matchDisplayId = task.displayId?.toLowerCase().includes(q)
        const matchDesc = task.description?.toLowerCase().includes(q)
        if (!matchTitle && !matchId && !matchDisplayId && !matchDesc) return false
      }

      // Status
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false
      }

      // Priority
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false
      }

      // Assignee
      if (assigneeFilter !== 'all') {
        const assigneeMatch =
          task.assigneeProfile === assigneeFilter ||
          task.assigneeName === assigneeFilter
        if (!assigneeMatch) return false
      }

      return true
    })
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter])

  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks]
    list.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'id': {
          const idA = a.displayId || a.id
          const idB = b.displayId || b.id
          comparison = idA.localeCompare(idB)
          break
        }
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'priority': {
          const pA = priorityOrder[a.priority] ?? 0
          const pB = priorityOrder[b.priority] ?? 0
          comparison = pB - pA
          break
        }
        case 'assignee': {
          const nameA = a.assigneeName || a.assigneeProfile || ''
          const nameB = b.assigneeName || b.assigneeProfile || ''
          comparison = nameA.localeCompare(nameB)
          break
        }
        case 'updated':
          comparison = (a.updatedAt || '').localeCompare(b.updatedAt || '')
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    return list
  }, [filteredTasks, sortField, sortOrder])

  // Bulk select all handler
  const allFilteredSelected =
    sortedTasks.length > 0 &&
    sortedTasks.every(t => selectedTaskIds.has(t.id))

  const handleToggleSelectAll = () => {
    if (!onSelectAll) return
    if (allFilteredSelected) {
      onSelectAll([])
    } else {
      onSelectAll(sortedTasks.map(t => t.id))
    }
  }

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null

  const handleRunAgentClick = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    try {
      setRunningTaskId(taskId)
      await onRunAgent(taskId)
    } finally {
      setTimeout(() => setRunningTaskId(null), 1200)
    }
  }

  const handleDeleteClick = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    if (!onDeleteTask) return
    const target = tasks.find(t => t.id === taskId)
    const displayName = target?.displayId || target?.id || taskId
    if (window.confirm(`Are you sure you want to delete task ${displayName}?`)) {
      await onDeleteTask(taskId)
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-50 group-hover:opacity-100" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#F97316]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#F97316]" />
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F9] dark:bg-[#0F1115] text-[#111827] dark:text-slate-200 overflow-hidden font-body">
      {/* 1. Header Toolbar: Search & Filters */}
      <div className="px-5 py-3 border-b border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#14161C] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative min-w-[200px] max-w-[280px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="w-full bg-slate-50 dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Filter tasks by status"
              className="bg-transparent text-slate-700 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-[#191C21]">All</option>
              {Object.entries(statusConfig).map(([st, cfg]) => (
                <option key={st} value={st} className="bg-white dark:bg-[#191C21]">
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 text-[11px]">Priority:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              aria-label="Filter tasks by priority"
              className="bg-transparent text-slate-700 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-[#191C21]">All</option>
              <option value="urgent" className="bg-white dark:bg-[#191C21]">Urgent</option>
              <option value="high" className="bg-white dark:bg-[#191C21]">High</option>
              <option value="medium" className="bg-white dark:bg-[#191C21]">Medium</option>
              <option value="low" className="bg-white dark:bg-[#191C21]">Low</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 text-[11px]">Assignee:</span>
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              aria-label="Filter tasks by assignee"
              className="bg-transparent text-slate-700 dark:text-slate-200 text-xs focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="all" className="bg-white dark:bg-[#191C21]">All</option>
              {agents.map(ag => (
                <option key={ag.id} value={ag.id} className="bg-white dark:bg-[#191C21]">
                  {ag.name}
                </option>
              ))}
            </select>
          </div>

          {/* Results Counter */}
          <span className="text-[11px] text-slate-400 pl-1 font-mono">
            {sortedTasks.length} of {tasks.length} tasks
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onOpenNewIssue('todo')}
          className="flex items-center gap-1.5 bg-[#F97316] hover:bg-[#FB923C] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs shadow-orange-500/20 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Issue</span>
        </button>
      </div>

      {/* 2. Table Area */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          {/* Table Header */}
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#191C21] border-b border-[#E7E5E4] dark:border-[#2A2524] text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none font-mono">
            <tr>
              <th className="w-10 px-4 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={handleToggleSelectAll}
                  aria-label="Select all tasks"
                  className="rounded border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#14161B] text-[#F97316] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </th>
              <th
                onClick={() => handleSort('id')}
                className="w-24 px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>ID</span>
                  {renderSortIcon('id')}
                </div>
              </th>
              <th
                onClick={() => handleSort('title')}
                className="px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Title</span>
                  {renderSortIcon('title')}
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="w-32 px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {renderSortIcon('status')}
                </div>
              </th>
              <th
                onClick={() => handleSort('priority')}
                className="w-28 px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Priority</span>
                  {renderSortIcon('priority')}
                </div>
              </th>
              <th
                onClick={() => handleSort('assignee')}
                className="w-40 px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Assignee</span>
                  {renderSortIcon('assignee')}
                </div>
              </th>
              <th
                onClick={() => handleSort('updated')}
                className="w-28 px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Updated</span>
                  {renderSortIcon('updated')}
                </div>
              </th>
              <th className="w-24 px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#E7E5E4] dark:divide-[#2A2524] text-xs">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-8 h-8 text-slate-400 mb-1" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">No tasks found</span>
                    <span className="text-xs text-slate-500">
                      Try adjusting your search or filters
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedTasks.map(task => {
                const isSelected = selectedTaskIds.has(task.id)
                const isRunning =
                  task.status === 'running' || runningTaskId === task.id
                const statusMeta = statusConfig[task.status] || statusConfig.todo

                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors group ${
                      isSelected ? 'bg-orange-500/10 dark:bg-orange-950/30' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      className="px-4 py-2.5 text-center"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect && onToggleSelect(task.id)}
                        aria-label={`Select task ${task.title}`}
                        className="rounded border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#14161B] text-[#F97316] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                    </td>

                    {/* ID */}
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400 group-hover:text-[#F97316] transition-colors whitespace-nowrap">
                      {formatDisplayId(task.id, task.displayId)}
                    </td>

                    {/* Title & Badges */}
                    <td className="px-3 py-2.5 max-w-[400px]">
                      <div className="flex items-center gap-2">
                        {task.isBlocked && task.status !== 'done' && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 shrink-0"
                            title="Blocked by parent task"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>Blocked</span>
                          </span>
                        )}

                        {task.diagnostics && task.diagnostics.length > 0 && (() => {
                          const maxSev = task.diagnostics.some(d => d.severity === 'critical')
                            ? 'critical'
                            : task.diagnostics.some(d => d.severity === 'error')
                            ? 'error'
                            : 'warning'
                          const sevColor =
                            maxSev === 'critical'
                              ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                              : maxSev === 'error'
                              ? 'text-orange-500 bg-orange-500/10 border-orange-500/20'
                              : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
                          return (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded border shrink-0 ${sevColor}`}
                              title={task.diagnostics.map(d => `[${d.severity}] ${d.message}`).join('\n')}
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>{task.diagnostics.length}</span>
                            </span>
                          )
                        })()}

                        <span className="font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                          {task.title}
                        </span>

                        {task.subtasksCount && (
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            ({task.subtasksCount.done}/{task.subtasksCount.total})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusMeta.bgBadge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotColor}`} />
                        <span>{statusMeta.label}</span>
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {task.priority === 'urgent' && (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                          <AlertCircle className="w-3 h-3" /> Urgent
                        </span>
                      )}
                      {task.priority === 'high' && (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                          <ArrowUp className="w-3 h-3" /> High
                        </span>
                      )}
                      {task.priority === 'medium' && (
                        <span className="inline-flex items-center gap-1 text-slate-300 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Medium
                        </span>
                      )}
                      {task.priority === 'low' && (
                        <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
                          <ArrowDown className="w-3 h-3" /> Low
                        </span>
                      )}
                      {(!task.priority || task.priority === 'none') && (
                        <span className="text-slate-600 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Assignee */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="text-sm shrink-0">
                          {task.assigneeAvatar || '🤖'}
                        </span>
                        <span className="truncate max-w-[110px] text-slate-300">
                          {task.assigneeName || task.assigneeProfile || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* Updated */}
                    <td className="px-3 py-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                      {task.updatedAt || 'Just now'}
                    </td>

                    {/* Actions */}
                    <td
                      className="px-4 py-2.5 text-right whitespace-nowrap"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {/* Run agent */}
                        <button
                          onClick={e => handleRunAgentClick(e, task.id)}
                          disabled={isRunning}
                          className="p-1.5 rounded-md hover:bg-orange-500/10 text-slate-400 hover:text-[#F97316] transition-colors disabled:opacity-50 cursor-pointer"
                          title="Run Agent"
                        >
                          {isRunning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F97316]" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete */}
                        {onDeleteTask && (
                          <button
                            onClick={e => handleDeleteClick(e, task.id)}
                            className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Task Detail Drawer / Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          task={selectedTask}
          agents={agents}
          onUpdateStatus={onUpdateTaskStatus}
          onRunAgent={onRunAgent}
          onSendComment={onSendComment || (async () => false)}
          onRefreshTasks={onRefreshTasks}
          onDeleteTask={onDeleteTask}
          kanbanConfig={kanbanConfig}
        />
      )}
    </div>
  )
}
