import React, { useState, useEffect, useCallback } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { KanbanBoard } from './components/KanbanBoard'
import { InboxView } from './components/InboxView'
import { ProjectsView } from './components/ProjectsView'
import { AutopilotView } from './components/AutopilotView'
import { AgentsView, SquadsView, SkillsView } from './components/AITeamViews'
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
import { ViewTab, Task, TaskStatus } from './types'

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>('my_issues')
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [projects, setProjects] = useState(initialProjects)
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

  // Load live data from Hermes harness
  const loadLiveData = useCallback(async () => {
    const isHealthy = await hermesApi.checkHealth()
    setIsBackendConnected(isHealthy)
    if (!isHealthy) return

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

      // 5. Fetch live board tasks
      const boardData = await hermesApi.getBoard()
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
              projectName: 'Default Workspace',
              projectTag: 'Cloud Operations',
              boardSlug: 'default',
              updatedAt: 'Live',
              reviewReport: t.result || t.latest_summary || undefined
            })
          })
        })

        // Backend is the source of truth: when connected, show ONLY live tasks.
        // Mock data is a placeholder for the offline state, never merged on top of
        // live data (that produced phantom cards that don't exist in Hermes).
        setTasks(liveTasks)
      }

      // 6. Fetch live boards (projects) — replace, don't merge with mock.
      const liveBoards = await hermesApi.getBoards()
      setProjects(liveBoards)
    } catch (e) {
      console.warn('Hermes live sync error:', e)
    }
  }, [])

  // Initial load + realtime WebSocket stream, with polling as a slower fallback.
  useEffect(() => {
    loadLiveData()

    // Debounce refreshes so a burst of events triggers a single reload.
    let debounce: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(loadLiveData, 300)
    }

    const disconnect = hermesApi.connectEvents(scheduleRefresh)

    // Fallback poll every 15s (WS handles realtime; this only backstops a dead socket).
    const interval = setInterval(loadLiveData, 15000)

    return () => {
      if (debounce) clearTimeout(debounce)
      disconnect()
      clearInterval(interval)
    }
  }, [loadLiveData])

  // Global Keyboard shortcuts ('c' for new issue, Ctrl/Cmd+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    // Find the task first so we know whether it is a live (Hermes-backed) task.
    const target = tasks.find(t => t.id === taskId)

    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus, updatedAt: 'Just now' } : t))
    )

    // Only sync to Hermes for live tasks that have a canonical rawId (e.g. "t_663b67ed").
    // Mock/locally-created tasks have no rawId, so we skip the API call instead of
    // sending an invalid id that would fail silently.
    if (!target?.rawId) return

    try {
      await hermesApi.updateTaskStatus(target.rawId, newStatus)
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
    if (ok) loadLiveData()
    return ok
  }

  const handleCreateProject = async (params: {
    slug: string
    name: string
    description: string
  }): Promise<boolean> => {
    const ok = await hermesApi.createBoard(params)
    if (ok) loadLiveData()
    return ok
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
        />

        {/* Tab View Router */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'my_issues' && (
            <KanbanBoard
              tasks={tasks}
              agents={agents}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onOpenNewIssue={status => {
                setNewIssueInitialStatus(status || 'todo')
                setIsNewIssueOpen(true)
              }}
              onRunAgent={handleRunAgent}
              onSendComment={handleSendComment}
            />
          )}

          {activeTab === 'issues' && (
            <KanbanBoard
              tasks={tasks}
              agents={agents}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onOpenNewIssue={status => {
                setNewIssueInitialStatus(status || 'todo')
                setIsNewIssueOpen(true)
              }}
              onRunAgent={handleRunAgent}
              onSendComment={handleSendComment}
            />
          )}

          {activeTab === 'inbox' && (
            <InboxView
              tasks={tasks}
              onApproveTask={handleApproveTask}
              onRequestChanges={handleRequestChanges}
              onSendComment={handleSendComment}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView projects={projects} onNewProject={() => setIsNewProjectOpen(true)} />
          )}

          {activeTab === 'autopilot' && (
            <AutopilotView
              autopilots={autopilots}
              onRunNow={handleRunAutopilot}
              onToggleStatus={handleToggleAutopilot}
              onNewAutopilot={() => setIsNewAutopilotOpen(true)}
            />
          )}

          {activeTab === 'agents' && <AgentsView agents={agents} />}

          {activeTab === 'squads' && <SquadsView squads={squads} />}

          {activeTab === 'skills' && <SkillsView skills={skills} />}

          {['chat', 'settings'].includes(activeTab) && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800/80 mb-3 text-2xl">
                ⚙️
              </div>
              <h3 className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
                {activeTab} Management
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
        onClose={() => setIsNewIssueOpen(false)}
        onSaveTask={handleSaveNewTask}
        initialStatus={newIssueInitialStatus}
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
      />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
