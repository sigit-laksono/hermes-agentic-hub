import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Task,
  TaskStatus,
  Board,
  Project,
  BoardStats,
  KanbanConfig,
  formatDisplayId,
  AIAgent,
  Squad,
  Skill,
  AutopilotJob
} from '../types'
import { initialTasks, initialProjects } from '../data/mockData'
import { hermesApi } from '../api/hermesApi'
import { ToastKind } from '../components/ToastStack'

interface UseKanbanProps {
  pushToast: (kind: ToastKind, title: string, detail?: string) => void
  isBackendConnected: boolean
  setAutopilots?: React.Dispatch<React.SetStateAction<AutopilotJob[]>>
}

export const useKanban = ({
  pushToast,
  isBackendConnected,
  setAutopilots
}: UseKanbanProps) => {
  const [activeBoard, setActiveBoard] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const urlBoard = urlParams.get('board')
      if (urlBoard) return urlBoard
      return localStorage.getItem('hermes_active_board') || 'default'
    } catch {
      return 'default'
    }
  })

  const [boards, setBoards] = useState<Board[]>([])
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [squads, setSquads] = useState<Squad[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [activeWorkersCount, setActiveWorkersCount] = useState<number>(0)
  const [boardStats, setBoardStats] = useState<BoardStats | null>(null)
  const [kanbanConfig, setKanbanConfig] = useState<KanbanConfig>({
    render_markdown: true,
    include_archived_by_default: false
  })

  const kanbanConfigRef = useRef(kanbanConfig)
  kanbanConfigRef.current = kanbanConfig

  // Synchronize activeBoard with localStorage and URL query param
  useEffect(() => {
    try {
      localStorage.setItem('hermes_active_board', activeBoard)
      const url = new URL(window.location.href)
      if (activeBoard === 'default') {
        url.searchParams.delete('board')
      } else {
        url.searchParams.set('board', activeBoard)
      }
      window.history.replaceState({}, '', url.toString())
    } catch (e) {
      console.warn('Failed to update URL search params:', e)
    }
  }, [activeBoard])

  // Load live data from Hermes harness
  const loadLiveData = useCallback(async (targetBoard?: string) => {
    const isHealthy = await hermesApi.checkHealth()
    if (!isHealthy) return

    const boardToUse = targetBoard || activeBoard || 'default'

    try {
      let effectiveConfig = kanbanConfigRef.current
      try {
        const cfg = await hermesApi.getKanbanConfig()
        if (cfg && typeof cfg === 'object' && Object.keys(cfg).length > 0) {
          effectiveConfig = { ...kanbanConfigRef.current, ...cfg }
          setKanbanConfig(effectiveConfig)
        }
      } catch {
        // Keep the current preferences on failure.
      }

      // 1. Fetch live profiles
      const liveProfiles = await hermesApi.getProfiles()
      setAgents(liveProfiles)

      // 2. Fetch live cron jobs (if handler provided)
      if (setAutopilots) {
        const liveJobs = await hermesApi.getCronJobs()
        setAutopilots(liveJobs)
      }

      // 3. Fetch live skills
      const liveSkills = await hermesApi.getSkills()
      setSkills(liveSkills)

      // 3b. Fetch live squads (derived from orchestration + profiles)
      const liveSquads = await hermesApi.getSquads()
      setSquads(liveSquads)

      // 4. Fetch active workers count
      const workers = await hermesApi.getActiveWorkers()
      setActiveWorkersCount(workers.length)

      // 5. Fetch live boards (projects)
      const liveBoards = await hermesApi.getBoards()
      if (liveBoards.length > 0) {
        setBoards(liveBoards)
        setProjects(
          liveBoards.map(b => ({
            id: b.slug,
            slug: b.slug,
            name: b.name,
            status: 'active',
            priority: 'medium',
            progressDone: b.counts?.done || 0,
            progressTotal: b.total || 0,
            lead: 'Workspace Owner',
            leadAvatar: '👤',
            createdAt: 'Active',
            description: b.description || '',
            default_workdir: b.default_workdir,
            is_current: b.is_current,
            counts: b.counts,
            total: b.total
          }))
        )
      }

      // 6. Fetch live board tasks for active board
      const boardData = await hermesApi.getBoard(
        boardToUse,
        Boolean(effectiveConfig.include_archived_by_default),
        effectiveConfig.default_tenant || undefined
      )
      if (boardData && boardData.columns) {
        const liveTasks: Task[] = []
        const statusReverseMap: Record<string, TaskStatus> = {
          triage: 'triage',
          todo: 'todo',
          scheduled: 'scheduled',
          ready: 'ready',
          running: 'running',
          review: 'review',
          blocked: 'blocked',
          done: 'done',
          archived: 'archived'
        }

        const activeBoardObj = liveBoards.find(b => b.slug === boardToUse)

        boardData.columns.forEach(col => {
          col.tasks.forEach((t: any) => {
            const agent = liveProfiles.find(a => a.id === t.assignee)
            const assigneeProfile = t.assignee || 'sa-aws'
            const assigneeName = agent?.name || t.assignee || 'sa-aws'
            const assigneeAvatar =
              agent?.avatar ||
              (assigneeProfile.includes('aws')
                ? '⚡'
                : assigneeProfile.includes('writer')
                ? '📝'
                : assigneeProfile.includes('azure') || assigneeProfile.includes('microsoft')
                ? '☁️'
                : assigneeProfile.includes('db')
                ? '🗄️'
                : '🤖')

            const isBlocked =
              col.name === 'blocked' ||
              t.status === 'blocked' ||
              (Boolean(t.link_counts?.parents && t.link_counts.parents > 0) && col.name !== 'done')

            const subtasksCount =
              t.progress && typeof t.progress.total === 'number' && t.progress.total > 0
                ? { done: t.progress.done || 0, total: t.progress.total }
                : undefined

            liveTasks.push({
              id: t.id,
              rawId: t.id,
              displayId: formatDisplayId(t.id, t.display_id),
              title: t.title,
              description: t.body,
              status: statusReverseMap[col.name] || 'todo',
              priority: t.priority === 2 ? 'urgent' : t.priority === 1 ? 'high' : 'medium',
              assigneeType: 'agent',
              assigneeName,
              assigneeProfile,
              assigneeAvatar,
              projectName: activeBoardObj?.name || (boardToUse === 'default' ? 'Default Workspace' : boardToUse),
              projectTag: boardToUse,
              boardSlug: boardToUse,
              updatedAt: 'Live',
              reviewReport: t.result || t.latest_summary || undefined,
              subtasksCount,
              isBlocked,
              linkCounts: t.link_counts,
              diagnostics: Array.isArray(t.diagnostics) ? t.diagnostics : undefined,
              warnings: Array.isArray(t.warnings) ? t.warnings : undefined
            })
          })
        })

        setTasks(liveTasks)
      }

      // 7. Fetch live board stats
      try {
        const statsData = await hermesApi.getBoardStats(boardToUse)
        if (statsData) {
          setBoardStats(statsData)
        }
      } catch {
        // Handled gracefully via computed stats fallback
      }
    } catch (e) {
      console.warn('Hermes live sync error:', e)
    }
  }, [activeBoard, setAutopilots])

  // Initial load + realtime WebSocket stream
  useEffect(() => {
    loadLiveData(activeBoard)

    let debounce: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => loadLiveData(activeBoard), 300)
    }

    const disconnect = hermesApi.connectEvents(scheduleRefresh, activeBoard)
    const interval = setInterval(() => loadLiveData(activeBoard), 15000)

    return () => {
      if (debounce) clearTimeout(debounce)
      disconnect()
      clearInterval(interval)
    }
  }, [activeBoard, loadLiveData])

  // Memoized real-time Board Stats
  const computedStats: BoardStats = useMemo(() => {
    const counts: Record<string, number> = {
      triage: 0,
      todo: 0,
      scheduled: 0,
      ready: 0,
      running: 0,
      blocked: 0,
      review: 0,
      done: 0
    }

    tasks.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1
    })

    return {
      total: tasks.length,
      byStatus: counts,
      activeWorkers: activeWorkersCount,
      oldestReadyAgeSeconds: boardStats?.oldestReadyAgeSeconds,
      oldestReadyAgeFormatted: boardStats?.oldestReadyAgeFormatted
    }
  }, [tasks, activeWorkersCount, boardStats])

  const handleRunAgent = useCallback(async (taskId: string) => {
    let target = tasks.find(t => t.id === taskId)
    if (!target) return

    const previousStatus = target.status

    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: 'running', updatedAt: 'Just now' } : t))
    )

    let rawId = target.rawId
    let currentId = taskId
    const boardSlug =
      target.boardSlug ||
      activeBoard ||
      projects.find(p => p.name === target?.projectName)?.id ||
      'default'
    const profile =
      target.assigneeProfile ||
      agents.find(a => a.name === target?.assigneeName)?.id ||
      target.assigneeName ||
      'default'

    if (!rawId && isBackendConnected) {
      try {
        const priorityMap: Record<Task['priority'], number> = {
          urgent: 2,
          high: 1,
          medium: 0,
          low: 0,
          none: 0
        }
        const priorityNum = priorityMap[target.priority] ?? 0

        const res = await hermesApi.createTask({
          title: target.title,
          body: target.description,
          assignee: profile,
          priority: priorityNum,
          board: boardSlug
        })
        if (res?.task?.id) {
          const newTaskId: string = res.task.id
          rawId = newTaskId
          currentId = newTaskId
          target = { ...target, id: newTaskId, rawId: newTaskId, displayId: formatDisplayId(newTaskId), boardSlug, assigneeProfile: profile }
          setTasks(prev =>
            prev.map(t => (t.id === taskId ? { ...t, id: newTaskId, rawId: newTaskId, displayId: formatDisplayId(newTaskId), status: 'running', assigneeProfile: profile } : t))
          )
        }
      } catch (err) {
        console.warn('Failed to promote mock task to live Hermes task:', err)
      }
    }

    if (!rawId) {
      setTasks(prev => prev.map(t => (t.id === currentId ? { ...t, status: previousStatus } : t)))
      return
    }

    try {
      const res = await hermesApi.runTask(rawId, boardSlug, profile)
      if (!res.ok) {
        console.warn('Failed to run agent for task:', res.message)
        setTasks(prev =>
          prev.map(t => (t.id === currentId ? { ...t, status: previousStatus } : t))
        )
        pushToast('error', `Could not start ${target.displayId || rawId}`, res.message)
      }
      setTimeout(() => loadLiveData(boardSlug), 1000)
    } catch (err: any) {
      console.warn('Failed to run agent for task:', err)
      setTasks(prev => prev.map(t => (t.id === currentId ? { ...t, status: previousStatus } : t)))
      pushToast('error', `Could not start ${target?.displayId || rawId}`, err?.message)
    }
  }, [tasks, activeBoard, projects, agents, isBackendConnected, pushToast, loadLiveData])

  const handleUpdateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const target = tasks.find(t => t.id === taskId)
    const boardSlug = target?.boardSlug || activeBoard || 'default'

    if (newStatus === 'running') {
      await handleRunAgent(taskId)
      return
    }

    const previousStatus = target?.status

    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus, updatedAt: 'Just now' } : t))
    )

    if (!target?.rawId) return

    try {
      await hermesApi.updateTaskStatus(target.rawId, newStatus, boardSlug)
    } catch (err: any) {
      console.warn('Failed to sync task status to Hermes:', err)
      if (previousStatus) {
        setTasks(prev =>
          prev.map(t => (t.id === taskId ? { ...t, status: previousStatus } : t))
        )
      }
      pushToast(
        'error',
        `Could not move ${target.displayId || target.id} to ${newStatus}`,
        err?.message
      )
    }
  }, [tasks, activeBoard, handleRunAgent, pushToast])

  const handleApproveTask = useCallback((taskId: string) => {
    handleUpdateTaskStatus(taskId, 'done')
  }, [handleUpdateTaskStatus])

  const handleDeleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    const target = tasks.find(t => t.id === taskId)
    if (!target?.rawId) {
      setTasks(prev => prev.filter(t => t.id !== taskId))
      return true
    }
    try {
      const boardSlug = target.boardSlug || activeBoard || 'default'
      const res = await hermesApi.deleteTask(target.rawId, boardSlug)
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId))
        loadLiveData(activeBoard)
        return true
      } else {
        console.warn('Failed to delete task:', res.message)
        pushToast('error', `Could not delete ${target.displayId || target.id}`, res.message)
        return false
      }
    } catch (err: any) {
      console.warn('Failed to delete task:', err)
      pushToast('error', `Could not delete ${target.displayId || target.id}`, err?.message)
      return false
    }
  }, [tasks, activeBoard, loadLiveData, pushToast])

  const handleRequestChanges = useCallback((taskId: string, note?: string) => {
    const target = tasks.find(t => t.id === taskId)
    if (note && note.trim() && target?.rawId) {
      hermesApi.addTaskComment(target.rawId, note.trim()).catch(err =>
        console.warn('Failed to attach revision note:', err)
      )
    }
    handleUpdateTaskStatus(taskId, 'ready')
  }, [tasks, handleUpdateTaskStatus])

  const handleSendComment = useCallback(async (taskId: string, note: string): Promise<boolean> => {
    const target = tasks.find(t => t.id === taskId)
    if (!target?.rawId) {
      console.warn('Comment not sent: task is not backed by Hermes (no rawId).')
      pushToast(
        'error',
        'Comment not sent',
        'This task only exists locally and has no Hermes thread yet.'
      )
      return false
    }
    try {
      await hermesApi.addTaskComment(target.rawId, note)
      return true
    } catch (err: any) {
      console.warn('Failed to send comment:', err)
      pushToast('error', 'Comment not sent', err?.message)
      return false
    }
  }, [tasks, pushToast])

  const handleSaveNewTask = useCallback(async (
    taskData: Omit<Task, 'id' | 'updatedAt'>,
    runImmediately = false
  ) => {
    const tempId = `DIK-${Math.floor(Math.random() * 80) + 60}`
    const newTask: Task = {
      ...taskData,
      id: tempId,
      displayId: tempId,
      status: runImmediately ? 'running' : taskData.status,
      updatedAt: 'Just now'
    }
    setTasks(prev => [newTask, ...prev])

    const wantsTriage = taskData.status === 'triage' || !runImmediately

    if (isBackendConnected) {
      try {
        const priorityMap: Record<Task['priority'], number> = {
          urgent: 2,
          high: 1,
          medium: 0,
          low: 0,
          none: 0
        }
        const priorityNum = priorityMap[taskData.priority] ?? 0

        const profileAssignee =
          taskData.assigneeProfile ||
          agents.find(a => a.name === taskData.assigneeName)?.id ||
          taskData.assigneeName ||
          'default'

        const boardSlug =
          taskData.boardSlug ||
          activeBoard ||
          projects.find(p => p.name === taskData.projectName)?.id ||
          'default'

        const res = await hermesApi.createTask({
          title: taskData.title,
          body: taskData.description,
          assignee: profileAssignee,
          priority: priorityNum,
          triage: wantsTriage,
          board: boardSlug
        })

        const createdTask = res?.task
        if (createdTask) {
          const landedStatus = (createdTask.status as TaskStatus) || 'ready'
          setTasks(prev =>
            prev.map(t =>
              t.id === tempId
                ? {
                    ...t,
                    id: createdTask.id,
                    rawId: createdTask.id,
                    displayId: formatDisplayId(createdTask.id),
                    status: runImmediately ? t.status : landedStatus
                  }
                : t
            )
          )
          if (!runImmediately && wantsTriage && landedStatus !== 'triage') {
            pushToast(
              'info',
              `Task created in ${landedStatus}`,
              'Hermes did not park this task in Triage.'
            )
          }
        }

        if (res?.warning) {
          pushToast('error', 'Task created, but it may not start', res.warning)
        }
        if (createdTask && runImmediately) {
          const runRes = await hermesApi.runTask(createdTask.id, boardSlug, profileAssignee)
          if (!runRes.ok) {
            pushToast('error', 'Task created, but the agent did not start', runRes.message)
          }
        }
        setTimeout(() => loadLiveData(boardSlug), 800)
      } catch (err: any) {
        console.warn('Task created in local UI only:', err)
        setTasks(prev => prev.filter(t => t.id !== tempId))
        pushToast('error', 'Could not create task', err?.message)
      }
    }
  }, [isBackendConnected, agents, activeBoard, projects, pushToast, loadLiveData])

  const handleCreateProject = useCallback(async (params: {
    slug: string
    name: string
    description: string
    default_workdir?: string
    switch?: boolean
  }): Promise<boolean> => {
    const ok = await hermesApi.createBoard(params)
    if (ok) {
      if (params.switch) {
        setActiveBoard(params.slug)
        loadLiveData(params.slug)
      } else {
        loadLiveData(activeBoard)
      }
    }
    return ok
  }, [activeBoard, loadLiveData])

  const handleSelectProject = useCallback((slug: string) => {
    setActiveBoard(slug)
    loadLiveData(slug)
  }, [loadLiveData])

  return {
    activeBoard,
    setActiveBoard,
    boards,
    setBoards,
    tasks,
    setTasks,
    projects,
    setProjects,
    agents,
    setAgents,
    squads,
    setSquads,
    skills,
    setSkills,
    activeWorkersCount,
    setActiveWorkersCount,
    boardStats,
    setBoardStats,
    kanbanConfig,
    setKanbanConfig,
    loadLiveData,
    computedStats,
    handleRunAgent,
    handleUpdateTaskStatus,
    handleApproveTask,
    handleDeleteTask,
    handleRequestChanges,
    handleSendComment,
    handleSaveNewTask,
    handleCreateProject,
    handleSelectProject
  }
}
