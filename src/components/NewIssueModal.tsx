import React, { useState, useEffect } from 'react'
import { X, Plus, Play } from 'lucide-react'
import { Task, TaskStatus, Priority, AIAgent, Project } from '../types'

interface NewIssueModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveTask: (task: Omit<Task, 'id' | 'updatedAt'>, runImmediately?: boolean) => void
  initialStatus?: TaskStatus
  agents?: AIAgent[]
  projects?: Project[]
}

export const NewIssueModal: React.FC<NewIssueModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  initialStatus = 'todo',
  agents = [],
  projects = []
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(initialStatus)
  const [priority, setPriority] = useState<Priority>('medium')
  const [assigneeProfile, setAssigneeProfile] = useState('')
  const [projectSlug, setProjectSlug] = useState('')
  const [runImmediately, setRunImmediately] = useState(true)

  // Initialize and synchronize defaults whenever modal opens or lists update
  useEffect(() => {
    if (isOpen) {
      if (agents.length > 0 && (!assigneeProfile || !agents.some(a => a.id === assigneeProfile))) {
        setAssigneeProfile(agents[0].id)
      } else if (!assigneeProfile) {
        setAssigneeProfile('sa-aws')
      }

      if (projects.length > 0 && (!projectSlug || !projects.some(p => p.id === projectSlug))) {
        setProjectSlug(projects[0].id)
      } else if (!projectSlug) {
        setProjectSlug('default')
      }
    }
  }, [isOpen, agents, projects])

  if (!isOpen) return null

  const selectedAgent = agents.find(a => a.id === assigneeProfile)
  const selectedProject = projects.find(p => p.id === projectSlug) || projects[0]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const resolvedProfile = assigneeProfile || agents[0]?.id || 'sa-aws'
    const resolvedAgent = agents.find(a => a.id === resolvedProfile) || selectedAgent
    const resolvedBoardSlug = projectSlug || projects[0]?.id || 'default'
    const resolvedProject = projects.find(p => p.id === resolvedBoardSlug) || selectedProject

    onSaveTask(
      {
        title: title.trim(),
        description: description.trim(),
        status: runImmediately ? 'in_progress' : status,
        priority,
        assigneeType: 'agent',
        assigneeName: resolvedAgent?.name || resolvedProfile,
        assigneeProfile: resolvedProfile,
        assigneeAvatar: resolvedAgent?.avatar || '🤖',
        projectName: resolvedProject?.name || 'Default Workspace',
        projectTag: resolvedProject?.name || 'General',
        boardSlug: resolvedBoardSlug
      },
      runImmediately
    )

    setTitle('')
    setDescription('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-[#282D37] bg-white dark:bg-[#16191E] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Modal Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">DikstraCloud</span>
            <span className="text-slate-500">/</span>
            <h3 className="font-semibold text-slate-800 dark:text-white">New Issue</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Issue title (e.g. Asesmen Arsitektur VPC, Buat Diagram...)"
              className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add detailed task instructions or requirements for Hermes Agent..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Properties grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="none">No Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Assign to Agent</label>
              <select
                value={assigneeProfile}
                onChange={e => setAssigneeProfile(e.target.value)}
                className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200"
              >
                {agents.length > 0 ? (
                  agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.avatar || '🤖'} {agent.name} ({agent.id}) {agent.status === 'online' ? '• Online' : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="sa-aws">⚡ AWS Solution Architect (sa-aws)</option>
                    <option value="sa-microsoft">☁️ Azure Specialist (sa-microsoft)</option>
                    <option value="technical-writer">📝 Technical Writer (technical-writer)</option>
                    <option value="database-engineer">🗄️ Database Engineer (database-engineer)</option>
                    <option value="default">⚙️ Default Agent (default)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Project / Board</label>
              <select
                value={projectSlug}
                onChange={e => setProjectSlug(e.target.value)}
                className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200"
              >
                {projects.length > 0 ? (
                  projects.map(p => (
                    <option key={p.id} value={p.id}>
                      📁 {p.name} {p.id !== 'default' ? `(${p.id})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="default">📁 Default Workspace (default)</option>
                )}
              </select>
            </div>
          </div>

          {/* Quick trigger option */}
          <div className="pt-2">
            <label className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={runImmediately}
                onChange={e => setRunImmediately(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <Play className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>⚡ Run Agent immediately after creation (Dispatch Now)</span>
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#23272F] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{runImmediately ? 'Create & Run Agent' : 'Create Issue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
