import React, { useState, useEffect } from 'react'
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
import { ToastStack } from './components/ToastStack'
import { ViewTab, TaskStatus } from './types'
import {
  useToasts,
  useBackendHealth,
  useAutopilot,
  useKanban,
  useBulkActions
} from './hooks'

export const AppContent: React.FC = () => {
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<ViewTab>('my_issues')
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

  // Modals & Interaction States
  const [isNewIssueOpen, setIsNewIssueOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
  const [newIssueInitialStatus, setNewIssueInitialStatus] = useState<TaskStatus>('todo')
  const [chatInitialProfile, setChatInitialProfile] = useState<string>('default')
  const [newIssuePrefill, setNewIssuePrefill] = useState<{
    title?: string
    description?: string
    assignee?: string
  }>({})

  // Custom Domain Hooks
  const { toasts, pushToast, dismissToast } = useToasts()
  const { isBackendConnected } = useBackendHealth()

  // Intermediate state bridge for autopilot setAutopilots
  const [autopilotStateHolder, setAutopilotStateHolder] = useState<any>()

  const kanban = useKanban({
    pushToast,
    isBackendConnected,
    setAutopilots: autopilotStateHolder
  })

  const autopilot = useAutopilot({
    activeBoard: kanban.activeBoard,
    loadLiveData: kanban.loadLiveData,
    pushToast
  })

  // Wire up autopilot state setter to kanban live load
  useEffect(() => {
    if (!autopilotStateHolder) {
      setAutopilotStateHolder(() => autopilot.setAutopilots)
    }
  }, [autopilot.setAutopilots, autopilotStateHolder])

  const bulk = useBulkActions({
    tasks: kanban.tasks,
    setTasks: kanban.setTasks,
    agents: kanban.agents,
    activeBoard: kanban.activeBoard,
    isBackendConnected,
    loadLiveData: kanban.loadLiveData
  })

  // Global Keyboard shortcuts:
  // - Ctrl/Cmd+K: Quick search
  // - Ctrl/Cmd+A: Select every task on the board (issue views only)
  // - C: New Issue
  // - B: Switch to Board view
  // - T: Switch to Table view
  // - Esc: Close an open modal, otherwise clear the current selection
  useEffect(() => {
    const anyModalOpen = isSearchOpen || isNewIssueOpen || isNewProjectOpen || autopilot.isNewAutopilotOpen

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setIsSearchOpen(true)
        return
      }

      if (e.key === 'Escape') {
        if (anyModalOpen) {
          setIsSearchOpen(false)
          setIsNewIssueOpen(false)
          setIsNewProjectOpen(false)
          autopilot.setIsNewAutopilotOpen(false)
        } else {
          bulk.handleClearSelection()
        }
        return
      }

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
          bulk.handleSelectAllTasks(kanban.tasks.map(t => t.id))
        }
        return
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return
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
  }, [
    kanban.tasks,
    activeTab,
    isSearchOpen,
    isNewIssueOpen,
    isNewProjectOpen,
    autopilot.isNewAutopilotOpen,
    bulk,
    autopilot
  ])

  const handleConvertChatToIssue = (issueData: { title: string; description: string; assignee?: string }) => {
    setNewIssuePrefill({
      title: issueData.title,
      description: issueData.description,
      assignee: issueData.assignee
    })
    setNewIssueInitialStatus('todo')
    setIsNewIssueOpen(true)
  }

  const unreadInboxCount = kanban.tasks.filter(t => t.status === 'review').length

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
          activeWorkersCount={kanban.activeWorkersCount}
          boards={kanban.boards}
          activeBoard={kanban.activeBoard}
          boardStats={kanban.computedStats}
          onSelectBoard={slug => {
            kanban.setActiveBoard(slug)
            kanban.loadLiveData(slug)
          }}
          onNewBoard={() => setIsNewProjectOpen(true)}
        />

        {/* Tab View Router */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'my_issues' && (
            viewMode === 'board' ? (
              <KanbanBoard
                tasks={kanban.tasks}
                agents={kanban.agents}
                activeBoard={kanban.activeBoard}
                activeBoardName={kanban.boards.find(b => b.slug === kanban.activeBoard)?.name || kanban.activeBoard}
                boardStats={kanban.computedStats}
                kanbanConfig={kanban.kanbanConfig}
                onUpdateTaskStatus={kanban.handleUpdateTaskStatus}
                onOpenNewIssue={status => {
                  setNewIssueInitialStatus(status || 'todo')
                  setIsNewIssueOpen(true)
                }}
                onRunAgent={kanban.handleRunAgent}
                onSendComment={kanban.handleSendComment}
                onRefreshTasks={() => kanban.loadLiveData(kanban.activeBoard)}
                onDeleteTask={kanban.handleDeleteTask}
                selectedTaskIds={bulk.selectedTaskIds}
                onToggleSelect={bulk.handleToggleSelectTask}
              />
            ) : (
              <TableView
                tasks={kanban.tasks}
                agents={kanban.agents}
                activeBoard={kanban.activeBoard}
                activeBoardName={kanban.boards.find(b => b.slug === kanban.activeBoard)?.name || kanban.activeBoard}
                kanbanConfig={kanban.kanbanConfig}
                onUpdateTaskStatus={kanban.handleUpdateTaskStatus}
                onOpenNewIssue={status => {
                  setNewIssueInitialStatus(status || 'todo')
                  setIsNewIssueOpen(true)
                }}
                onRunAgent={kanban.handleRunAgent}
                onSendComment={kanban.handleSendComment}
                onRefreshTasks={() => kanban.loadLiveData(kanban.activeBoard)}
                onDeleteTask={kanban.handleDeleteTask}
                selectedTaskIds={bulk.selectedTaskIds}
                onToggleSelect={bulk.handleToggleSelectTask}
                onSelectAll={bulk.handleSelectAllTasks}
              />
            )
          )}

          {activeTab === 'issues' && (
            viewMode === 'board' ? (
              <KanbanBoard
                tasks={kanban.tasks}
                agents={kanban.agents}
                activeBoard={kanban.activeBoard}
                activeBoardName={kanban.boards.find(b => b.slug === kanban.activeBoard)?.name || kanban.activeBoard}
                boardStats={kanban.computedStats}
                kanbanConfig={kanban.kanbanConfig}
                onUpdateTaskStatus={kanban.handleUpdateTaskStatus}
                onOpenNewIssue={status => {
                  setNewIssueInitialStatus(status || 'todo')
                  setIsNewIssueOpen(true)
                }}
                onRunAgent={kanban.handleRunAgent}
                onSendComment={kanban.handleSendComment}
                onRefreshTasks={() => kanban.loadLiveData(kanban.activeBoard)}
                onDeleteTask={kanban.handleDeleteTask}
                selectedTaskIds={bulk.selectedTaskIds}
                onToggleSelect={bulk.handleToggleSelectTask}
              />
            ) : (
              <TableView
                tasks={kanban.tasks}
                agents={kanban.agents}
                activeBoard={kanban.activeBoard}
                activeBoardName={kanban.boards.find(b => b.slug === kanban.activeBoard)?.name || kanban.activeBoard}
                kanbanConfig={kanban.kanbanConfig}
                onUpdateTaskStatus={kanban.handleUpdateTaskStatus}
                onOpenNewIssue={status => {
                  setNewIssueInitialStatus(status || 'todo')
                  setIsNewIssueOpen(true)
                }}
                onRunAgent={kanban.handleRunAgent}
                onSendComment={kanban.handleSendComment}
                onRefreshTasks={() => kanban.loadLiveData(kanban.activeBoard)}
                onDeleteTask={kanban.handleDeleteTask}
                selectedTaskIds={bulk.selectedTaskIds}
                onToggleSelect={bulk.handleToggleSelectTask}
                onSelectAll={bulk.handleSelectAllTasks}
              />
            )
          )}

          {activeTab === 'inbox' && (
            <InboxView
              tasks={kanban.tasks}
              onApproveTask={kanban.handleApproveTask}
              onRequestChanges={kanban.handleRequestChanges}
              onSendComment={kanban.handleSendComment}
              onRefreshTasks={() => kanban.loadLiveData(kanban.activeBoard)}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              projects={kanban.boards.length > 0 ? kanban.boards : kanban.projects}
              activeBoard={kanban.activeBoard}
              onSelectProject={slug => {
                kanban.handleSelectProject(slug)
                setActiveTab('my_issues')
              }}
              onNewProject={() => setIsNewProjectOpen(true)}
              onRefreshProjects={() => kanban.loadLiveData(kanban.activeBoard)}
            />
          )}

          {activeTab === 'autopilot' && (
            <AutopilotView
              autopilots={autopilot.autopilots}
              onRunNow={autopilot.handleRunAutopilot}
              onToggleStatus={autopilot.handleToggleAutopilot}
              onNewAutopilot={() => autopilot.setIsNewAutopilotOpen(true)}
              onEditAutopilot={autopilot.handleEditAutopilot}
              onDeleteAutopilot={autopilot.handleDeleteAutopilot}
              onViewHistory={autopilot.handleViewHistory}
            />
          )}

          {activeTab === 'agents' && (
            <AgentsView
              agents={kanban.agents}
              tasks={kanban.tasks}
              onRefreshAgents={() => kanban.loadLiveData(kanban.activeBoard)}
              onSelectAgentForChat={(agentId) => {
                setChatInitialProfile(agentId)
                setActiveTab('chat')
              }}
            />
          )}

          {activeTab === 'squads' && (
            <SquadsView
              squads={kanban.squads}
              agents={kanban.agents}
              onRefresh={() => kanban.loadLiveData(kanban.activeBoard)}
            />
          )}

          {activeTab === 'skills' && (
            <SkillsView
              skills={kanban.skills}
              onRefreshSkills={() => kanban.loadLiveData(kanban.activeBoard)}
            />
          )}

          {activeTab === 'chat' && (
            <ChatView
              agents={kanban.agents}
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
          kanban.handleSaveNewTask(task, runImmediately)
          setNewIssuePrefill({})
        }}
        initialStatus={newIssueInitialStatus}
        initialTitle={newIssuePrefill.title}
        initialDescription={newIssuePrefill.description}
        initialAssignee={newIssuePrefill.assignee}
        initialBoardSlug={kanban.activeBoard}
        agents={kanban.agents}
        projects={kanban.projects}
      />

      {/* Global Search Modal (Ctrl/Cmd + K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        tasks={kanban.tasks}
        projects={kanban.projects}
        agents={kanban.agents}
        skills={kanban.skills}
        onNavigate={setActiveTab}
      />

      {/* New Autopilot Modal */}
      <NewAutopilotModal
        isOpen={autopilot.isNewAutopilotOpen}
        onClose={() => {
          autopilot.setIsNewAutopilotOpen(false)
          autopilot.setEditingAutopilot(null)
        }}
        onCreate={autopilot.handleCreateAutopilot}
        onUpdate={autopilot.handleUpdateAutopilot}
        editJob={autopilot.editingAutopilot}
        availableProfiles={kanban.agents}
      />

      {/* Cron Job History Drawer (TASK-1.2) */}
      <CronHistoryDrawer
        jobId={autopilot.historyJobId}
        jobName={autopilot.autopilots.find(j => j.id === autopilot.historyJobId)?.name}
        onClose={() => autopilot.setHistoryJobId(null)}
      />

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreate={kanban.handleCreateProject}
        existingBoards={kanban.boards.length > 0 ? kanban.boards : kanban.projects}
        onSelectBoard={slug => {
          kanban.setActiveBoard(slug)
          kanban.loadLiveData(slug)
        }}
        onRefreshBoards={() => kanban.loadLiveData(kanban.activeBoard)}
      />

      {/* Floating Bulk Action Toolbar (Fase 2: TASK-2.1) */}
      <BulkActionToolbar
        selectedCount={bulk.selectedTaskIds.size}
        agents={kanban.agents}
        onClearSelection={bulk.handleClearSelection}
        onBulkStatusChange={bulk.handleBulkStatusChange}
        onBulkAssigneeChange={bulk.handleBulkAssigneeChange}
        onBulkPriorityChange={bulk.handleBulkPriorityChange}
        onBulkArchive={bulk.handleBulkArchive}
        partialErrors={bulk.bulkPartialErrors}
        onDismissErrors={() => bulk.setBulkPartialErrors([])}
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
