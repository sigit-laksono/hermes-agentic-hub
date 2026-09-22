import { useState, useCallback } from 'react'
import { Task, TaskStatus, Priority, AIAgent } from '../types'
import { hermesApi } from '../api/hermesApi'

interface UseBulkActionsProps {
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  agents: AIAgent[]
  activeBoard: string
  isBackendConnected: boolean
  loadLiveData: (board?: string) => Promise<void>
}

export const useBulkActions = ({
  tasks,
  setTasks,
  agents,
  activeBoard,
  isBackendConnected,
  loadLiveData
}: UseBulkActionsProps) => {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [bulkPartialErrors, setBulkPartialErrors] = useState<{ taskId: string; error: string }[]>([])

  const handleToggleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }, [])

  const handleSelectAllTasks = useCallback((taskIds: string[]) => {
    setSelectedTaskIds(new Set(taskIds))
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedTaskIds(new Set())
    setBulkPartialErrors([])
  }, [])

  const handleBulkStatusChange = useCallback(async (newStatus: TaskStatus) => {
    const ids = Array.from(selectedTaskIds)
    if (ids.length === 0) return

    setTasks(prev =>
      prev.map(t => (selectedTaskIds.has(t.id) ? { ...t, status: newStatus, updatedAt: 'Just now' } : t))
    )

    const liveIds = ids
      .map(id => {
        const t = tasks.find(item => item.id === id)
        return t?.rawId || (id.startsWith('t_') ? id : undefined)
      })
      .filter((id): id is string => Boolean(id))

    if (liveIds.length > 0 && isBackendConnected) {
      try {
        const res = await hermesApi.bulkUpdateTasks(liveIds, { status: newStatus }, activeBoard)
        if (res.results) {
          const failures = res.results
            .filter(r => !r.success)
            .map(r => ({ taskId: r.task_id, error: r.error || 'Failed to update' }))
          if (failures.length > 0) {
            setBulkPartialErrors(failures)
          }
        }
        setTimeout(() => loadLiveData(activeBoard), 600)
      } catch (err: any) {
        console.warn('Bulk status update failed:', err)
        setBulkPartialErrors([{ taskId: 'Bulk status change', error: err?.message || 'Request failed' }])
        // Optimistic edit above was not persisted — pull authoritative state back.
        loadLiveData(activeBoard)
      }
    }

    setSelectedTaskIds(new Set())
  }, [selectedTaskIds, tasks, isBackendConnected, activeBoard, setTasks, loadLiveData])

  const handleBulkAssigneeChange = useCallback(async (assigneeId: string) => {
    const ids = Array.from(selectedTaskIds)
    if (ids.length === 0) return

    const agentObj = agents.find(a => a.id === assigneeId)
    const assigneeName = agentObj?.name || assigneeId

    setTasks(prev =>
      prev.map(t =>
        selectedTaskIds.has(t.id)
          ? {
              ...t,
              assigneeProfile: assigneeId,
              assigneeName: assigneeName,
              assigneeAvatar: agentObj?.avatar || t.assigneeAvatar,
              updatedAt: 'Just now'
            }
          : t
      )
    )

    const liveIds = ids
      .map(id => {
        const t = tasks.find(item => item.id === id)
        return t?.rawId || (id.startsWith('t_') ? id : undefined)
      })
      .filter((id): id is string => Boolean(id))

    if (liveIds.length > 0 && isBackendConnected) {
      try {
        const res = await hermesApi.bulkUpdateTasks(liveIds, { assignee: assigneeId }, activeBoard)
        if (res.results) {
          const failures = res.results
            .filter(r => !r.success)
            .map(r => ({ taskId: r.task_id, error: r.error || 'Failed to reassign' }))
          if (failures.length > 0) {
            setBulkPartialErrors(failures)
          }
        }
        setTimeout(() => loadLiveData(activeBoard), 600)
      } catch (err: any) {
        console.warn('Bulk assignee update failed:', err)
        setBulkPartialErrors([{ taskId: 'Bulk reassign', error: err?.message || 'Request failed' }])
        loadLiveData(activeBoard)
      }
    }

    setSelectedTaskIds(new Set())
  }, [selectedTaskIds, tasks, agents, isBackendConnected, activeBoard, setTasks, loadLiveData])

  const handleBulkPriorityChange = useCallback(async (priority: Priority) => {
    const ids = Array.from(selectedTaskIds)
    if (ids.length === 0) return

    const priorityMap: Record<Priority, number> = {
      urgent: 2,
      high: 1,
      medium: 0,
      low: 0,
      none: 0
    }
    const priorityNum = priorityMap[priority] ?? 0

    setTasks(prev =>
      prev.map(t =>
        selectedTaskIds.has(t.id)
          ? { ...t, priority, updatedAt: 'Just now' }
          : t
      )
    )

    const liveIds = ids
      .map(id => {
        const t = tasks.find(item => item.id === id)
        return t?.rawId || (id.startsWith('t_') ? id : undefined)
      })
      .filter((id): id is string => Boolean(id))

    if (liveIds.length > 0 && isBackendConnected) {
      try {
        const res = await hermesApi.bulkUpdateTasks(liveIds, { priority: priorityNum }, activeBoard)
        if (res.results) {
          const failures = res.results
            .filter(r => !r.success)
            .map(r => ({ taskId: r.task_id, error: r.error || 'Failed to change priority' }))
          if (failures.length > 0) {
            setBulkPartialErrors(failures)
          }
        }
        setTimeout(() => loadLiveData(activeBoard), 600)
      } catch (err: any) {
        console.warn('Bulk priority update failed:', err)
        setBulkPartialErrors([{ taskId: 'Bulk priority change', error: err?.message || 'Request failed' }])
        loadLiveData(activeBoard)
      }
    }

    setSelectedTaskIds(new Set())
  }, [selectedTaskIds, tasks, isBackendConnected, activeBoard, setTasks, loadLiveData])

  const handleBulkArchive = useCallback(async () => {
    const ids = Array.from(selectedTaskIds)
    if (ids.length === 0) return

    setTasks(prev => prev.filter(t => !selectedTaskIds.has(t.id)))

    const liveIds = ids
      .map(id => {
        const t = tasks.find(item => item.id === id)
        return t?.rawId || (id.startsWith('t_') ? id : undefined)
      })
      .filter((id): id is string => Boolean(id))

    if (liveIds.length > 0 && isBackendConnected) {
      try {
        const res = await hermesApi.bulkUpdateTasks(liveIds, { archive: true }, activeBoard)
        if (res.results) {
          const failures = res.results
            .filter(r => !r.success)
            .map(r => ({ taskId: r.task_id, error: r.error || 'Failed to archive' }))
          if (failures.length > 0) {
            setBulkPartialErrors(failures)
          }
        }
        setTimeout(() => loadLiveData(activeBoard), 600)
      } catch (err: any) {
        console.warn('Bulk archive failed:', err)
        setBulkPartialErrors([{ taskId: 'Bulk archive', error: err?.message || 'Request failed' }])
        // Cards were removed optimistically; restore them from the backend.
        loadLiveData(activeBoard)
      }
    }

    setSelectedTaskIds(new Set())
  }, [selectedTaskIds, tasks, isBackendConnected, activeBoard, setTasks, loadLiveData])

  return {
    selectedTaskIds,
    setSelectedTaskIds,
    bulkPartialErrors,
    setBulkPartialErrors,
    handleToggleSelectTask,
    handleSelectAllTasks,
    handleClearSelection,
    handleBulkStatusChange,
    handleBulkAssigneeChange,
    handleBulkPriorityChange,
    handleBulkArchive
  }
}
