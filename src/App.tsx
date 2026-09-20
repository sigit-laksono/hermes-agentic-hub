import React, { useState, useEffect, useCallback } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { KanbanBoard } from './components/KanbanBoard'
import { InboxView } from './components/InboxView'
import { ProjectsView } from './components/ProjectsView'
import { AutopilotView } from './components/AutopilotView'
import { AgentsView, SquadsView, SkillsView } from './components/AITeamViews'
import { ChatView } from './components/ChatView'
import { NewIssueModal } from './components/NewIssueModal'
import { SearchModal } from './components/SearchModal'
import { NewAutopilotModal } from './components/NewAutopilotModal'
import { NewProjectModal } from './components/NewProjectModal'
import { hermesApi } from './api/hermesApi'
import {
  initialTasks,
  initialProjects,
  initialAutopilots,
  initialAgents,
  initialSquads,
  initialSkills
} from './data/mockData'
import { ViewTab, Task, TaskStatus, Board, Project } from './types'

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
  const [autopilots, setAutopilots] = useState(initialAutopilots)
  const [agents, setAgents] = useState(initialAgents)
  const [squads, setSquads] = useState(initialSquads)
  const [skills, setSkills] = useState(initialSkills)
  const [activeWorkersCount, setActiveWorkersCount] = useState<number>(0)
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
      // 1. Fetch live profiles
      const liveProfiles = await hermesApi.getProfiles()
      if (liveProfiles.length > 0) {
        setAgents(liveProfiles)
      }

      // 2. Fetch live cron jobs
      const liveJobs = await hermesApi.getCronJobs()
      if (liveJobs.length > 0) {
        setAutopilots(liveJobs)
      }

      // 3. Fetch live skills
      const liveSkills = await hermesApi.getSkills()
      if (liveSkills.length > 0) {
        setSkills(liveSkills)
      }

      // 3b. Fetch live squads (derived from orchestration + profiles)
      const liveSquads = await hermesApi.getSquads()
      if (liveSquads.length > 0) {
        setSquads(liveSquads)
      }

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
            lead: 'Muhammad Sigit',
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
      const boardData = await hermesApi.getBoard(boardToUse)
      if (boardData && boardData.columns) {
        const liveTasks: Task[] = []
        const statusReverseMap: Record<string, TaskStatus> = {
          triage: 'backlog',
          todo: 'todo',
          scheduled: 'todo',
          ready: 'todo',
          running: 'in_progress',
          review: 'in_review',
          blocked: 'blocked',
          done: 'done'
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
              id: t.id.replace('t_', 'DIK-'),
              rawId: t.id,
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
              linkCounts: t.link_counts
            })
          })
        })

        // Backend is the source of truth: when connected, show ONLY live tasks.
        setTasks(liveTasks)
      }
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

  // Global Keyboard shortcuts:
  // - Ctrl/Cmd+K: Quick search
  // - C: New Issue
  // - B: Switch to Board view (Fase 5: TASK-5.3)
  // - T: Switch to Table view (Fase 5: TASK-5.3)
  // - Esc: Close any open modal/drawer (Fase 5: TASK-5.3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes any open modal from anywhere
      if (e.key === 'Escape') {
        setIsSearchOpen(false)
        setIsNewIssueOpen(false)
        setIsNewProjectOpen(false)
        setIsNewAutopilotOpen(false)
        return
      }

      // Ctrl/Cmd+K opens global search from anywhere (even inside inputs).
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setIsSearchOpen(true)
        return
      }

      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

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
  }, [])

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    // Find the task first so we know whether it is a live (Hermes-backed) task.
    const target = tasks.find(t => t.id === taskId)
    const boardSlug = target?.boardSlug || activeBoard || 'default'

    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus, updatedAt: 'Just now' } : t))
    )

    // Only sync to Hermes for live tasks that have a canonical rawId (e.g. "t_663b67ed").
    // Mock/locally-created tasks have no rawId, so we skip the API call instead of
    // sending an invalid id that would fail silently.
    if (!target?.rawId) return

    try {
      await hermesApi.updateTaskStatus(target.rawId, newStatus, boardSlug)
    } catch (err) {
      console.warn('Failed to sync task status to Hermes:', err)
      // Local state already updated; live poll will reconcile on next tick.
    }
  }

  const handleApproveTask = (taskId: string) => {
    handleUpdateTaskStatus(taskId, 'done')
  }

  const handleRequestChanges = (taskId: string, note?: string) => {
    // Send the revision note as a comment first (best-effort) for live tasks,
    // then move the task back to in_progress.
    const target = tasks.find(t => t.id === taskId)
    if (note && note.trim() && target?.rawId) {
      hermesApi.addTaskComment(target.rawId, note.trim()).catch(err =>
        console.warn('Failed to attach revision note:', err)
      )
    }
    handleUpdateTaskStatus(taskId, 'in_progress')
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

  const handleSendComment = async (taskId: string, note: string): Promise<boolean> => {
    const target = tasks.find(t => t.id === taskId)
    if (!target?.rawId) {
      // Local/mock task has no backend thread; nothing to persist.
      console.warn('Comment not sent: task is not backed by Hermes (no rawId).')
      return false
    }
    try {
      await hermesApi.addTaskComment(target.rawId, note)
      return true
    } catch (err) {
      console.warn('Failed to send comment:', err)
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

  const handleRunAgent = async (taskId: string) => {
    let target = tasks.find(t => t.id === taskId)
    if (!target) return

    // Optimistically update status to in_progress in UI
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: 'in_progress', updatedAt: 'Just now' } : t))
    )

    let rawId = target.rawId
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
          rawId = res.task.id
          target = { ...target, rawId, boardSlug, assigneeProfile: profile }
          setTasks(prev =>
            prev.map(t => (t.id === taskId ? { ...t, rawId, status: 'in_progress', assigneeProfile: profile } : t))
          )
        }
      } catch (err) {
        console.warn('Failed to promote mock task to live Hermes task:', err)
      }
    }

    if (rawId) {
      try {
        await hermesApi.runTask(rawId, boardSlug, profile)
        setTimeout(loadLiveData, 1000)
      } catch (err) {
        console.warn('Failed to run agent for task:', err)
      }
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
      status: runImmediately ? 'in_progress' : taskData.status,
      updatedAt: 'Just now'
    }
    setTasks(prev => [newTask, ...prev])

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
          board: boardSlug
        })

        const createdTask = res?.task
        if (createdTask && runImmediately) {
          await hermesApi.runTask(createdTask.id, boardSlug, profileAssignee)
        }
        setTimeout(loadLiveData, 800)
        setTimeout(loadLiveData, 800)
      } catch (err) {
        console.warn('Task created in local UI only:', err)
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

  const unreadInboxCount = tasks.filter(t => t.status === 'in_review').length

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#0D0F12] text-slate-900 dark:text-slate-100 font-sans">
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
          onSelectBoard={slug => {
            setActiveBoard(slug)
            loadLiveData(slug)
          }}
          onNewBoard={() => setIsNewProjectOpen(true)}
        />

        {/* Tab View Router */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'my_issues' && (
            <KanbanBoard
              tasks={tasks}
              agents={agents}
              activeBoard={activeBoard}
              activeBoardName={boards.find(b => b.slug === activeBoard)?.name || activeBoard}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onOpenNewIssue={status => {
                setNewIssueInitialStatus(status || 'todo')
                setIsNewIssueOpen(true)
              }}
              onRunAgent={handleRunAgent}
              onSendComment={handleSendComment}
              onRefreshTasks={() => loadLiveData(activeBoard)}
            />
          )}

          {activeTab === 'issues' && (
            <KanbanBoard
              tasks={tasks}
              agents={agents}
              activeBoard={activeBoard}
              activeBoardName={boards.find(b => b.slug === activeBoard)?.name || activeBoard}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onOpenNewIssue={status => {
                setNewIssueInitialStatus(status || 'todo')
                setIsNewIssueOpen(true)
              }}
              onRunAgent={handleRunAgent}
              onSendComment={handleSendComment}
              onRefreshTasks={() => loadLiveData(activeBoard)}
            />
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
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800/80 mb-3 text-2xl">
                ⚙️
              </div>
              <h3 className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
                Settings Management
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Modul ini terhubung ke Hermes Profile Engine.
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
        onClose={() => setIsNewAutopilotOpen(false)}
        onCreate={handleCreateAutopilot}
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
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0D0F12] text-slate-100 p-6 text-center">
          <div className="max-w-md p-6 rounded-xl border border-rose-500/30 bg-[#16191E] space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-rose-500">Something went wrong</h2>
            <p className="text-xs text-slate-400 font-mono text-left bg-black/50 p-3 rounded overflow-auto max-h-40">
              {this.state.error?.message || 'Unknown error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
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
