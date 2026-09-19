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
  const [squads] = useState(initialSquads)
  const [skills, setSkills] = useState(initialSkills)
  const [activeWorkersCount, setActiveWorkersCount] = useState<number>(0)
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false)

  const [isNewIssueOpen, setIsNewIssueOpen] = useState(false)
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
          ready: 'todo',
          running: 'in_progress',
          review: 'in_review',
          blocked: 'blocked',
          done: 'done'
        }

        boardData.columns.forEach(col => {
          col.tasks.forEach((t: any) => {
            liveTasks.push({
              id: t.id.replace('t_', 'DIK-'),
              title: t.title,
              description: t.body,
              status: statusReverseMap[col.name] || 'todo',
              priority: t.priority === 2 ? 'urgent' : t.priority === 1 ? 'high' : 'medium',
              assigneeType: 'agent',
              assigneeName: t.assignee || 'sa-aws',
              assigneeAvatar: t.assignee?.includes('aws') ? '⚡' : '🤖',
              projectName: 'Default Workspace',
              projectTag: 'Cloud Operations',
              updatedAt: 'Live',
              reviewReport: t.result || t.latest_summary || undefined
            })
          })
        })

        if (liveTasks.length > 0) {
          // Merge with initial tasks so UI remains complete
          setTasks(prev => {
            const existingIds = new Set(liveTasks.map(lt => lt.id))
            const remaining = prev.filter(pt => !existingIds.has(pt.id))
            return [...liveTasks, ...remaining]
          })
        }
      }

      // 6. Fetch live boards (projects)
      const liveBoards = await hermesApi.getBoards()
      if (liveBoards.length > 0) {
        setProjects(prev => {
          const names = new Set(liveBoards.map(lb => lb.name))
          return [...liveBoards, ...prev.filter(p => !names.has(p.name))]
        })
      }
    } catch (e) {
      console.warn('Hermes live sync error:', e)
    }
  }, [])

  // Initial load and periodic liveness polling
  useEffect(() => {
    loadLiveData()
    const interval = setInterval(loadLiveData, 5000)
    return () => clearInterval(interval)
  }, [loadLiveData])

  // Global Keyboard shortcuts ('c' for new issue)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus, updatedAt: 'Just now' } : t))
    )

    // Sync to Hermes API if task id begins with t_
    try {
      const rawId = taskId.replace('DIK-', 't_')
      await hermesApi.updateTaskStatus(rawId, newStatus)
    } catch {
      // Local state already updated
    }
  }

  const handleApproveTask = (taskId: string) => {
    handleUpdateTaskStatus(taskId, 'done')
  }

  const handleRequestChanges = (taskId: string) => {
    handleUpdateTaskStatus(taskId, 'in_progress')
  }

  const handleSaveNewTask = async (taskData: Omit<Task, 'id' | 'updatedAt'>) => {
    const tempId = `DIK-${Math.floor(Math.random() * 80) + 60}`
    const newTask: Task = {
      ...taskData,
      id: tempId,
      updatedAt: 'Just now'
    }
    setTasks(prev => [newTask, ...prev])

    // Save to Hermes Kanban if connected
    if (isBackendConnected) {
      try {
        const priorityNum = taskData.priority === 'urgent' ? 2 : taskData.priority === 'high' ? 1 : 0
        const profileAssignee = taskData.assigneeName.includes('AWS') ? 'sa-aws' : 'default'
        await hermesApi.createTask({
          title: taskData.title,
          body: taskData.description,
          assignee: profileAssignee,
          priority: priorityNum
        })
        loadLiveData()
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
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onOpenNewIssue={status => {
                setNewIssueInitialStatus(status || 'todo')
                setIsNewIssueOpen(true)
              }}
            />
          )}

          {activeTab === 'issues' && (
            <KanbanBoard
              tasks={tasks}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onOpenNewIssue={status => {
                setNewIssueInitialStatus(status || 'todo')
                setIsNewIssueOpen(true)
              }}
            />
          )}

          {activeTab === 'inbox' && (
            <InboxView
              tasks={tasks}
              onApproveTask={handleApproveTask}
              onRequestChanges={handleRequestChanges}
            />
          )}

          {activeTab === 'projects' && <ProjectsView projects={projects} />}

          {activeTab === 'autopilot' && <AutopilotView autopilots={autopilots} />}

          {activeTab === 'agents' && <AgentsView agents={agents} />}

          {activeTab === 'squads' && <SquadsView squads={squads} />}

          {activeTab === 'skills' && <SkillsView skills={skills} />}

          {['chat', 'runtimes', 'analytics', 'settings'].includes(activeTab) && (
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
