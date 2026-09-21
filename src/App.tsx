import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { KanbanBoard } from './components/KanbanBoard'
import { TableView } from './components/TableView'
import { InboxView } from './components/InboxView'
import { ProjectsView } from './components/ProjectsView'
import { AutopilotView } from './components/AutopilotView'
import { AgentsView, SquadsView, SkillsView } from './components/AITeamViews'
import { ChatView } from './components/ChatView'
import { NewIssueModal } from './components/NewIssueModal'
import { SearchModal } from './components/SearchModal'
import { NewAutopilotModal } from './components/NewAutopilotModal'
import { CronHistoryDrawer } from './components/CronHistoryDrawer'
import { NewProjectModal } from './components/NewProjectModal'
import { BulkActionToolbar } from './components/BulkActionToolbar'
import { ToastStack, ToastItem, ToastKind } from './components/ToastStack'
import { hermesApi } from './api/hermesApi'
import {
  initialTasks,
  initialProjects
} from './data/mockData'
import { ViewTab, Task, TaskStatus, Priority, Board, Project, BoardStats, KanbanConfig, formatDisplayId, AIAgent, Squad, Skill, AutopilotJob } from './types'

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>('my_issues')
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
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
  const [autopilots, setAutopilots] = useState<AutopilotJob[]>([])
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [squads, setSquads] = useState<Squad[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [activeWorkersCount, setActiveWorkersCount] = useState<number>(0)
  const [boardStats, setBoardStats] = useState<BoardStats | null>(null)
  const [kanbanConfig, setKanbanConfig] = useState<KanbanConfig>({
    render_markdown: true,
    include_archived_by_default: false
  })
  // loadLiveData reads the current preferences without depending on them: putting
  // kanbanConfig in its dependency array would rebuild the callback on every config
  // fetch, re-running the effect that calls it — an endless refetch loop.
  const kanbanConfigRef = useRef(kanbanConfig)
  kanbanConfigRef.current = kanbanConfig
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false)

  const [isNewIssueOpen, setIsNewIssueOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNewAutopilotOpen, setIsNewAutopilotOpen] = useState(false)
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
  const [newIssueInitialStatus, setNewIssueInitialStatus] = useState<TaskStatus>('todo')
  const [chatInitialProfile, setChatInitialProfile] = useState<string>('default')
  const [newIssuePrefill, setNewIssuePrefill] = useState<{
    title?: string
    description?: string
    assignee?: string
  }>({})

  // Multi-Select & Bulk Operations (Fase 2: TASK-2.1)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [bulkPartialErrors, setBulkPartialErrors] = useState<{ taskId: string; error: string }[]>([])

  // User-visible notifications. Backend refusals (409 with the blocking parent named,
  // 400 for a rejected status verb) were previously only console.warn'd, so a rejected
  // action looked identical to one that silently did nothing.
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const pushToast = useCallback((kind: ToastKind, title: string, detail?: string) => {
    setToasts(prev => {
      // Collapse an identical repeat (e.g. dragging the same card twice) instead of stacking.
      if (prev.some(t => t.kind === kind && t.title === title && t.detail === detail)) {
        return prev
      }
      const next = [...prev, { id: Date.now() + Math.random(), kind, title, detail }]
      // Keep the stack bounded so a burst of failures can't cover the board.
      return next.slice(-4)
    })
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

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
    setIsBackendConnected(isHealthy)
    if (!isHealthy) return

    const boardToUse = targetBoard || activeBoard || 'default'

    try {
      // 0. Kanban preferences first (Fase 2: TASK-2.5) — the board read below needs
      // `include_archived`, so fetching config after it meant the flag was always one
      // refresh out of date (and on the first load, simply unknown).
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

      // 2. Fetch live cron jobs
      const liveJobs = await hermesApi.getCronJobs()
      setAutopilots(liveJobs)

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
        // default_tenant scopes which tasks are shown, not which board is selected.
        effectiveConfig.default_tenant || undefined
      )
      if (boardData && boardData.columns) {
        const liveTasks: Task[] = []
        // Column names are already the canonical statuses; 'archived' must be listed
        // too, or archived tasks fall through the `|| 'todo'` default below and show up
        // in Todo.
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

        // Backend is the source of truth: when connected, show ONLY live tasks.
        setTasks(liveTasks)
      }

      // 7. Fetch live board stats (Fase 2: TASK-2.3)
      try {
        const statsData = await hermesApi.getBoardStats(boardToUse)
        if (statsData) {
          setBoardStats(statsData)
        }
      } catch {
        // Handled gracefully via computed stats fallback
      }

      // Preferences are loaded at step 0, since the board read above depends on them.
      // `default_tenant` is applied there as a task filter — it is not a board slug, so
      // it must never drive setActiveBoard.
    } catch (e) {
      console.warn('Hermes live sync error:', e)
    }
  }, [activeBoard])

  // Initial load + realtime WebSocket stream for activeBoard, with polling fallback.
  useEffect(() => {
    loadLiveData(activeBoard)

    // Debounce refreshes so a burst of events triggers a single reload.
    let debounce: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => loadLiveData(activeBoard), 300)
    }

    const disconnect = hermesApi.connectEvents(scheduleRefresh, activeBoard)

    // Fallback poll every 15s (WS handles realtime; this only backstops a dead socket).
    const interval = setInterval(() => loadLiveData(activeBoard), 15000)

    return () => {
      if (debounce) clearTimeout(debounce)
      disconnect()
      clearInterval(interval)
    }
  }, [activeBoard, loadLiveData])

  // Memoized real-time Board Stats (Fase 2: TASK-2.3)
  //
  // Counts come from the loaded tasks so they track optimistic edits immediately. The
  // oldest-ready age can only come from the backend (it needs each task's created_at,
  // which the board payload does not carry): when it is absent the badge is hidden
  // rather than invented — the previous hardcoded 300s reported a fake "5m", which is
  // actively misleading for a widget whose purpose is spotting a stuck dispatcher.
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

  // Global Keyboard shortcuts:
  // - Ctrl/Cmd+K: Quick search
  // - Ctrl/Cmd+A: Select every task on the board (issue views only)
  // - C: New Issue
  // - B: Switch to Board view (Fase 5: TASK-5.3)
  // - T: Switch to Table view (Fase 5: TASK-5.3)
  // - Esc: Close an open modal, otherwise clear the current selection
  //
  // The effect depends on `tasks`/`activeTab` on purpose: with an empty dependency array
  // the listener captured the first render's values forever, so Ctrl+A kept selecting the
  // ids of the initial mock tasks — cards that are no longer on the board.
  useEffect(() => {
    const anyModalOpen = isSearchOpen || isNewIssueOpen || isNewProjectOpen || isNewAutopilotOpen

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K opens global search from anywhere (even inside inputs).
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setIsSearchOpen(true)
        return
      }

      if (e.key === 'Escape') {
        // Layered: Escape dismisses the topmost thing rather than everything at once.
        if (anyModalOpen) {
          setIsSearchOpen(false)
          setIsNewIssueOpen(false)
          setIsNewProjectOpen(false)
          setIsNewAutopilotOpen(false)
        } else {
          setSelectedTaskIds(new Set())
          setBulkPartialErrors([])
        }
        return
      }

      // Never steal keys while the user is typing.
      const target = e.target as HTMLElement | null
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        if (activeTab === 'my_issues' || activeTab === 'issues') {
          e.preventDefault()
          setSelectedTaskIds(new Set(tasks.map(t => t.id)))
        }
        return
      }

      // Single-letter shortcuts must not fire as part of a chord: without this, Ctrl+C
      // opened the New Issue modal and preventDefault() swallowed the copy, and Ctrl+B /
      // Ctrl+T were hijacked the same way.
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // A letter typed while a modal is open belongs to that modal, not to the board.
      if (anyModalOpen) return

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        setNewIssueInitialStatus('todo')
        setIsNewIssueOpen(true)
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        setViewMode('board')
        setActiveTab(prev => (prev === 'my_issues' || prev === 'issues' ? prev : 'my_issues'))
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        setViewMode('list')
        setActiveTab(prev => (prev === 'my_issues' || prev === 'issues' ? prev : 'my_issues'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tasks, activeTab, isSearchOpen, isNewIssueOpen, isNewProjectOpen, isNewAutopilotOpen])

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    // Find the task first so we know whether it is a live (Hermes-backed) task.
    const target = tasks.find(t => t.id === taskId)
    const boardSlug = target?.boardSlug || activeBoard || 'default'

    // 'running' is owned by the dispatcher, not by a status write. The backend rejects
    // it outright ("Cannot set status to 'running' directly; use the dispatcher/claim
    // path"), so every caller — drag-drop into the Running column, the card's Next
    // button, the drawer dropdown — is funnelled into the run path instead, which
    // promotes the task to 'ready' and lets a worker claim it.
    if (newStatus === 'running') {
      await handleRunAgent(taskId)
      return
    }

    const previousStatus = target?.status

    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus, updatedAt: 'Just now' } : t))
    )

    // Only sync to Hermes for live tasks that have a canonical rawId (e.g. "t_663b67ed").
    // Mock/locally-created tasks have no rawId, so we skip the API call instead of
    // sending an invalid id that would fail silently.
    if (!target?.rawId) return

    try {
      await hermesApi.updateTaskStatus(target.rawId, newStatus, boardSlug)
    } catch (err: any) {
      console.warn('Failed to sync task status to Hermes:', err)
      // The transition was refused (e.g. 409 'ready' with an open parent). Put the card
      // back where it was instead of leaving the board showing a state the backend
      // rejected until the next poll.
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
  }

  const handleApproveTask = (taskId: string) => {
    handleUpdateTaskStatus(taskId, 'done')
  }

  const handleDeleteTask = async (taskId: string): Promise<boolean> => {
    const target = tasks.find(t => t.id === taskId)
    if (!target?.rawId) {
      // Local/mock task — just remove from state
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
  }

  const handleRequestChanges = (taskId: string, note?: string) => {
    // Send the revision note as a comment first (best-effort) for live tasks,
    // then hand the task back to its implementer.
    const target = tasks.find(t => t.id === taskId)
    if (note && note.trim() && target?.rawId) {
      hermesApi.addTaskComment(target.rawId, note.trim()).catch(err =>
        console.warn('Failed to attach revision note:', err)
      )
    }
    // 'ready' (not 'running') is the correct reopen target: the backend routes a task
    // leaving 'review' through reopen_review_task, which restores the original
    // implementer and re-gates on parents before a worker picks it up again.
    handleUpdateTaskStatus(taskId, 'ready')
  }

  const handleCreateAutopilot = async (params: {
    name: string
    schedule: string
    prompt: string
    profile: string
  }): Promise<boolean> => {
    const ok = await hermesApi.createCronJob(params)
    if (ok) loadLiveData(activeBoard)
    return ok
  }

  const handleCreateProject = async (params: {
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
  }

  const handleSelectProject = (slug: string) => {
    setActiveBoard(slug)
    setActiveTab('my_issues')
    loadLiveData(slug)
  }

  // Bulk Operations (Fase 2: TASK-2.1)
  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const handleSelectAllTasks = (taskIds: string[]) => {
    setSelectedTaskIds(new Set(taskIds))
  }

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set())
    setBulkPartialErrors([])
  }

  const handleBulkStatusChange = async (newStatus: TaskStatus) => {
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
  }

  const handleBulkAssigneeChange = async (assigneeId: string) => {
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
  }

  const handleBulkPriorityChange = async (priority: Priority) => {
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
  }

  const handleBulkArchive = async () => {
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
  }

  const handleSendComment = async (taskId: string, note: string): Promise<boolean> => {
    const target = tasks.find(t => t.id === taskId)
    if (!target?.rawId) {
      // Local/mock task has no backend thread; nothing to persist.
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
  }

  const handleRunAutopilot = async (jobId: string) => {
    const ok = await hermesApi.triggerCronJob(jobId)
    if (ok) {
      // Refresh so last_run/next_run reflect the manual trigger.
      loadLiveData()
    } else {
      console.warn('Failed to trigger cron job:', jobId)
      pushToast('error', 'Could not run autopilot', `Job ${jobId} failed to trigger.`)
    }
  }

  const handleToggleAutopilot = async (jobId: string, current: 'active' | 'paused') => {
    // Optimistic flip
    setAutopilots(prev =>
      prev.map(j => (j.id === jobId ? { ...j, status: current === 'active' ? 'paused' : 'active' } : j))
    )
    const ok =
      current === 'active'
        ? await hermesApi.pauseCronJob(jobId)
        : await hermesApi.resumeCronJob(jobId)
    if (!ok) {
      // Revert on failure
      setAutopilots(prev =>
        prev.map(j => (j.id === jobId ? { ...j, status: current } : j))
      )
    } else {
      loadLiveData()
    }
  }

  // TASK-1.1: Edit Autopilot
  const [editingAutopilot, setEditingAutopilot] = useState<AutopilotJob | null>(null)

  const handleEditAutopilot = (job: AutopilotJob) => {
    setEditingAutopilot(job)
    setIsNewAutopilotOpen(true)
  }

  const handleUpdateAutopilot = async (jobId: string, params: {
    name: string
    schedule: string
    prompt?: string
    profile: string
  }) => {
    // Only send fields that are present
    const updatePayload: any = {
      name: params.name,
      schedule: params.schedule,
      profile: params.profile
    }

    // Only include prompt if it's provided (not empty)
    if (params.prompt && params.prompt.trim()) {
      updatePayload.prompt = params.prompt
    }

    const ok = await hermesApi.updateCronJob(jobId, updatePayload)
    if (ok) {
      pushToast('success', 'Autopilot updated', `Job "${params.name}" has been updated successfully.`)
      loadLiveData()
      return true
    } else {
      pushToast('error', 'Update failed', 'Could not update autopilot job.')
      return false
    }
  }

  // TASK-1.1: Delete Autopilot
  const handleDeleteAutopilot = async (jobId: string) => {
    const ok = await hermesApi.deleteCronJob(jobId)
    if (ok) {
      pushToast('success', 'Autopilot deleted', 'Job has been removed from scheduler.')
      loadLiveData()
    } else {
      pushToast('error', 'Delete failed', 'Could not delete autopilot job.')
    }
  }

  // TASK-1.2: View History
  const [historyJobId, setHistoryJobId] = useState<string | null>(null)

  const handleViewHistory = (jobId: string) => {
    setHistoryJobId(jobId)
  }

  const handleRunAgent = async (taskId: string) => {
    let target = tasks.find(t => t.id === taskId)
    if (!target) return

    // Captured before the optimistic flip (and before `target` is reassigned below) so a
    // refused dispatch can put the card back where it came from.
    const previousStatus = target.status

    // Optimistically update status to running in UI
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: 'running', updatedAt: 'Just now' } : t))
    )

    let rawId = target.rawId
    // Promoting a mock task below replaces its id, so track the row's current id to
    // keep a later revert pointing at the right task.
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

    // If task has no rawId (offline/mock task), create it in Hermes first so it gets a real t_* ID!
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
      // Nothing to dispatch against: undo the optimistic 'running' flip.
      setTasks(prev => prev.map(t => (t.id === currentId ? { ...t, status: previousStatus } : t)))
      return
    }

    try {
      // runTask resolves with { ok: false, message } instead of throwing, so the result
      // has to be inspected — an unchecked call left the card showing 'running' after
      // the dispatcher had refused it.
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
  }

  const handleSaveNewTask = async (
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

    // The backend owns the landing status: 'triage' when requested or when not running immediately.
    // Tasks in 'triage' are safe from background daemon auto-dispatch.
    const wantsTriage = taskData.status === 'triage' || !runImmediately

    // Save to Hermes Kanban if connected
    if (isBackendConnected) {
      try {
        // Priority mapping kept symmetric with the board reader in loadLiveData
        // (2 => urgent, 1 => high, 0 => medium/low/none).
        const priorityMap: Record<Task['priority'], number> = {
          urgent: 2,
          high: 1,
          medium: 0,
          low: 0,
          none: 0
        }
        const priorityNum = priorityMap[taskData.priority] ?? 0

        // Use direct Hermes profile ID from taskData.assigneeProfile
        const profileAssignee =
          taskData.assigneeProfile ||
          agents.find(a => a.name === taskData.assigneeName)?.id ||
          taskData.assigneeName ||
          'default'

        // Map the selected project to its board slug
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
          // Adopt the status the backend actually assigned instead of keeping the one
          // picked in the modal — otherwise the card sits in a column the task was never
          // in, until the next poll quietly moves it.
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
          // Only worth surfacing when an explicit Triage request did not stick; the
          // "Hermes decides" path already says so in the modal, so landing in
          // ready/todo there is expected rather than a surprise.
          if (!runImmediately && wantsTriage && landedStatus !== 'triage') {
            pushToast(
              'info',
              `Task created in ${landedStatus}`,
              'Hermes did not park this task in Triage.'
            )
          }
        }

        // The backend flags a ready+assigned task that no dispatcher will pick up.
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
        // Drop the optimistic card: leaving it on the board implies the task exists in
        // Hermes when it does not, and it has no rawId so nothing would ever sync it.
        setTasks(prev => prev.filter(t => t.id !== tempId))
        pushToast('error', 'Could not create task', err?.message)
      }
    }
  }

  const handleConvertChatToIssue = (issueData: { title: string; description: string; assignee?: string }) => {
    setNewIssuePrefill({
      title: issueData.title,
      description: issueData.description,
      assignee: issueData.assignee
    })
    setNewIssueInitialStatus('todo')
    setIsNewIssueOpen(true)
  }

  const unreadInboxCount = tasks.filter(t => t.status === 'review').length

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#FAF9F9] dark:bg-[#0F1115] text-[#111827] dark:text-[#F3F4F6] font-body">
      {/* Aura Atmospheric Ambient Glow Layer */}
      <div className="aura-glow-layer pointer-events-none" />

      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewIssue={() => {
          setNewIssueInitialStatus('todo')
          setIsNewIssueOpen(true)
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        unreadInboxCount={unreadInboxCount}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          activeTab={activeTab}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
          activeWorkersCount={activeWorkersCount}
          boards={boards}
          activeBoard={activeBoard}
          boardStats={computedStats}
          onSelectBoard={slug => {
            setActiveBoard(slug)
            loadLiveData(slug)
          }}
          onNewBoard={() => setIsNewProjectOpen(true)}
        />

        {/* Tab View Router */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'my_issues' && (
            viewMode === 'board' ? (
              <KanbanBoard
                tasks={tasks}
                agents={agents}
                activeBoard={activeBoard}
                activeBoardName={boards.find(b => b.slug === activeBoard)?.name || activeBoard}
                boardStats={computedStats}
                kanbanConfig={kanbanConfig}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onOpenNewIssue={status => {
                  setNewIssueInitialStatus(status || 'todo')
                  setIsNewIssueOpen(true)
                }}
                onRunAgent={handleRunAgent}
                onSendComment={handleSendComment}
                onRefreshTasks={() => loadLiveData(activeBoard)}
                onDeleteTask={handleDeleteTask}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={handleToggleSelectTask}
              />
            ) : (
              <TableView
                tasks={tasks}
                agents={agents}
                activeBoard={activeBoard}
                activeBoardName={boards.find(b => b.slug === activeBoard)?.name || activeBoard}
                kanbanConfig={kanbanConfig}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onOpenNewIssue={status => {
                  setNewIssueInitialStatus(status || 'todo')
                  setIsNewIssueOpen(true)
                }}
                onRunAgent={handleRunAgent}
                onSendComment={handleSendComment}
                onRefreshTasks={() => loadLiveData(activeBoard)}
                onDeleteTask={handleDeleteTask}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={handleToggleSelectTask}
                onSelectAll={handleSelectAllTasks}
              />
            )
          )}

          {activeTab === 'issues' && (
            viewMode === 'board' ? (
              <KanbanBoard
                tasks={tasks}
                agents={agents}
                activeBoard={activeBoard}
                activeBoardName={boards.find(b => b.slug === activeBoard)?.name || activeBoard}
                boardStats={computedStats}
                kanbanConfig={kanbanConfig}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onOpenNewIssue={status => {
                  setNewIssueInitialStatus(status || 'todo')
                  setIsNewIssueOpen(true)
                }}
                onRunAgent={handleRunAgent}
                onSendComment={handleSendComment}
                onRefreshTasks={() => loadLiveData(activeBoard)}
                onDeleteTask={handleDeleteTask}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={handleToggleSelectTask}
              />
            ) : (
              <TableView
                tasks={tasks}
                agents={agents}
                activeBoard={activeBoard}
                activeBoardName={boards.find(b => b.slug === activeBoard)?.name || activeBoard}
                kanbanConfig={kanbanConfig}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onOpenNewIssue={status => {
                  setNewIssueInitialStatus(status || 'todo')
                  setIsNewIssueOpen(true)
                }}
                onRunAgent={handleRunAgent}
                onSendComment={handleSendComment}
                onRefreshTasks={() => loadLiveData(activeBoard)}
                onDeleteTask={handleDeleteTask}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={handleToggleSelectTask}
                onSelectAll={handleSelectAllTasks}
              />
            )
          )}

          {activeTab === 'inbox' && (
            <InboxView
              tasks={tasks}
              onApproveTask={handleApproveTask}
              onRequestChanges={handleRequestChanges}
              onSendComment={handleSendComment}
              onRefreshTasks={() => loadLiveData(activeBoard)}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              projects={boards.length > 0 ? boards : projects}
              activeBoard={activeBoard}
              onSelectProject={handleSelectProject}
              onNewProject={() => setIsNewProjectOpen(true)}
              onRefreshProjects={() => loadLiveData(activeBoard)}
            />
          )}

          {activeTab === 'autopilot' && (
            <AutopilotView
              autopilots={autopilots}
              onRunNow={handleRunAutopilot}
              onToggleStatus={handleToggleAutopilot}
              onNewAutopilot={() => setIsNewAutopilotOpen(true)}
              onEditAutopilot={handleEditAutopilot}
              onDeleteAutopilot={handleDeleteAutopilot}
              onViewHistory={handleViewHistory}
            />
          )}

          {activeTab === 'agents' && (
            <AgentsView
              agents={agents}
              tasks={tasks}
              onRefreshAgents={() => loadLiveData(activeBoard)}
              onSelectAgentForChat={(agentId) => {
                setChatInitialProfile(agentId)
                setActiveTab('chat')
              }}
            />
          )}

          {activeTab === 'squads' && (
            <SquadsView
              squads={squads}
              agents={agents}
              onRefresh={() => loadLiveData(activeBoard)}
            />
          )}

          {activeTab === 'skills' && (
            <SkillsView
              skills={skills}
              onRefreshSkills={() => loadLiveData(activeBoard)}
            />
          )}

          {activeTab === 'chat' && (
            <ChatView
              agents={agents}
              initialProfile={chatInitialProfile}
              onConvertToIssue={handleConvertChatToIssue}
            />
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="p-4 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 mb-3 text-2xl shadow-xs">
                ⚙️
              </div>
              <h3 className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-200 font-display">
                Settings Management
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Modul ini terhubung ke Hermes Profile Engine & Aura Smart Settings.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* New Issue Modal */}
      <NewIssueModal
        isOpen={isNewIssueOpen}
        onClose={() => {
          setIsNewIssueOpen(false)
          setNewIssuePrefill({})
        }}
        onSaveTask={(task, runImmediately) => {
          handleSaveNewTask(task, runImmediately)
          setNewIssuePrefill({})
        }}
        initialStatus={newIssueInitialStatus}
        initialTitle={newIssuePrefill.title}
        initialDescription={newIssuePrefill.description}
        initialAssignee={newIssuePrefill.assignee}
        initialBoardSlug={activeBoard}
        agents={agents}
        projects={projects}
      />

      {/* Global Search Modal (Ctrl/Cmd + K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        tasks={tasks}
        projects={projects}
        agents={agents}
        skills={skills}
        onNavigate={setActiveTab}
      />

      {/* New Autopilot Modal */}
      <NewAutopilotModal
        isOpen={isNewAutopilotOpen}
        onClose={() => {
          setIsNewAutopilotOpen(false)
          setEditingAutopilot(null)
        }}
        onCreate={handleCreateAutopilot}
        onUpdate={handleUpdateAutopilot}
        editJob={editingAutopilot}
        availableProfiles={agents}
      />

      {/* Cron Job History Drawer (TASK-1.2) */}
      <CronHistoryDrawer
        jobId={historyJobId}
        jobName={autopilots.find(j => j.id === historyJobId)?.name}
        onClose={() => setHistoryJobId(null)}
      />

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreate={handleCreateProject}
        existingBoards={boards.length > 0 ? boards : projects}
        onSelectBoard={slug => {
          setActiveBoard(slug)
          loadLiveData(slug)
        }}
        onRefreshBoards={() => loadLiveData(activeBoard)}
      />

      {/* Floating Bulk Action Toolbar (Fase 2: TASK-2.1) */}
      <BulkActionToolbar
        selectedCount={selectedTaskIds.size}
        agents={agents}
        onClearSelection={handleClearSelection}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkAssigneeChange={handleBulkAssigneeChange}
        onBulkPriorityChange={handleBulkPriorityChange}
        onBulkArchive={handleBulkArchive}
        partialErrors={bulkPartialErrors}
        onDismissErrors={() => setBulkPartialErrors([])}
      />

      {/* Global notifications for backend refusals (Fase 1: TASK-1.1 error toast) */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Hermes Hub React Caught Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#FAF9F9] dark:bg-[#0F1115] text-[#111827] dark:text-[#F3F4F6] p-6 text-center font-body">
          <div className="max-w-md p-6 rounded-2xl border border-rose-500/30 bg-white dark:bg-[#191C21] space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-rose-500 font-display">Something went wrong</h2>
            <p className="text-xs text-slate-400 font-mono text-left bg-black/40 p-3 rounded-lg border border-slate-200 dark:border-[#2A2524] overflow-auto max-h-40">
              {this.state.error?.message || 'Unknown error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
