import React, { useState, useEffect } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { KanbanBoard } from './components/KanbanBoard'
import { InboxView } from './components/InboxView'
import { ProjectsView } from './components/ProjectsView'
import { AutopilotView } from './components/AutopilotView'
import { AgentsView, SquadsView, SkillsView } from './components/AITeamViews'
import { NewIssueModal } from './components/NewIssueModal'
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
  const [projects] = useState(initialProjects)
  const [autopilots] = useState(initialAutopilots)
  const [agents] = useState(initialAgents)
  const [squads] = useState(initialSquads)
  const [skills] = useState(initialSkills)

  const [isNewIssueOpen, setIsNewIssueOpen] = useState(false)
  const [newIssueInitialStatus, setNewIssueInitialStatus] = useState<TaskStatus>('todo')

  // Global Keyboard shortcuts (e.g. 'c' for new issue)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
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

  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus, updatedAt: 'Just now' } : t))
    )
  }

  const handleApproveTask = (taskId: string) => {
    handleUpdateTaskStatus(taskId, 'done')
  }

  const handleRequestChanges = (taskId: string) => {
    handleUpdateTaskStatus(taskId, 'in_progress')
  }

  const handleSaveNewTask = (taskData: Omit<Task, 'id' | 'updatedAt'>) => {
    const newId = `DIK-${Math.floor(Math.random() * 80) + 60}`
    const newTask: Task = {
      ...taskData,
      id: newId,
      updatedAt: 'Just now'
    }
    setTasks(prev => [newTask, ...prev])
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
          activeWorkersCount={0}
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

          {/* Fallback views for minor tabs */}
          {['chat', 'runtimes', 'analytics', 'settings'].includes(activeTab) && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800/80 mb-3 text-2xl">
                ⚙️
              </div>
              <h3 className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
                {activeTab} Management
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Modul ini dikonfigurasi langsung via Hermes CLI & Profiles.
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
