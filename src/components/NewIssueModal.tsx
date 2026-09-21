import React, { useState, useEffect } from 'react'
import { X, Plus, Play } from 'lucide-react'
import { Task, TaskStatus, Priority, AIAgent, Project } from '../types'
import { hermesApi } from '../api/hermesApi'

interface NewIssueModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveTask: (task: Omit<Task, 'id' | 'updatedAt'>, runImmediately?: boolean) => void
  initialStatus?: TaskStatus
  initialTitle?: string
  initialDescription?: string
  initialAssignee?: string
  initialBoardSlug?: string
  agents?: AIAgent[]
  projects?: Project[]
}

export const NewIssueModal: React.FC<NewIssueModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  initialStatus = 'todo',
  initialTitle = '',
  initialDescription = '',
  initialAssignee = '',
  initialBoardSlug = 'default',
  agents = [],
  projects = []
}) => {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [status, setStatus] = useState<TaskStatus>(initialStatus)
  const [priority, setPriority] = useState<Priority>('medium')
  const [assigneeProfile, setAssigneeProfile] = useState(initialAssignee)
  const [projectSlug, setProjectSlug] = useState(initialBoardSlug)
  const [runImmediately, setRunImmediately] = useState(false)
  const [knownAssignees, setKnownAssignees] = useState<string[]>([])

  // Fetch known assignees from backend when modal opens or board changes
  useEffect(() => {
    if (!isOpen) return
    let active = true
    hermesApi.getAssignees(projectSlug || initialBoardSlug).then(list => {
      if (active && list.length > 0) {
        setKnownAssignees(list)
      }
    })
    return () => {
      active = false
    }
  }, [isOpen, projectSlug, initialBoardSlug])

  // Initialize and synchronize defaults whenever modal opens or lists update
  useEffect(() => {
    if (isOpen) {
      if (initialTitle) setTitle(initialTitle)
      if (initialDescription) setDescription(initialDescription)
      // Callers pass the column they were clicked from (the "+" on each Kanban column),
      // but create only supports Triage vs. backend-derived. Honour an explicit Triage
      // request and collapse everything else to the default rather than pre-selecting a
      // column the task cannot actually be created in.
      setStatus(initialStatus === 'triage' ? 'triage' : 'todo')

      if (initialAssignee) {
        setAssigneeProfile(initialAssignee)
      } else if (agents.length > 0 && (!assigneeProfile || !agents.some(a => a.id === assigneeProfile))) {
        setAssigneeProfile(agents[0].id)
      } else if (!assigneeProfile) {
        setAssigneeProfile('sa-aws')
      }

      if (initialBoardSlug) {
        setProjectSlug(initialBoardSlug)
      } else if (projects.length > 0 && (!projectSlug || !projects.some(p => p.id === projectSlug))) {
        setProjectSlug(projects[0].id)
      } else if (!projectSlug) {
        setProjectSlug('default')
      }
    }
  }, [isOpen, agents, projects, initialTitle, initialDescription, initialAssignee, initialStatus, initialBoardSlug])

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
        status: runImmediately ? 'running' : status,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 font-body">
      <div className="w-full max-w-lg rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Aura</span>
            <span className="text-slate-500">/</span>
            <h3 className="font-semibold text-slate-900 dark:text-white font-display text-sm">New Issue</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Issue title (e.g. Asesmen Arsitektur VPC, Buat Diagram...)"
              className="w-full px-3.5 py-2 text-sm font-medium rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-900 dark:text-white focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-orange-500/30 transition-colors"
            />
          </div>

          <div>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add detailed task instructions or requirements for Hermes Agent..."
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-orange-500/30 resize-none transition-colors"
            />
          </div>

          {/* Properties grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-mono">Start in</label>
              {/*
                Only these two are real choices on create. The backend's CreateTaskBody has
                no `status` field — it derives the landing status itself ('ready', or 'todo'
                when a parent is still open) and exposes just a `triage` flag. Offering
                Scheduled/Ready/Blocked/Review here meant picking a column the task was
                never placed in, then watching it jump on the next refresh.
              */}
              <select
                value={status === 'triage' ? 'triage' : 'auto'}
                onChange={e =>
                  setStatus(e.target.value === 'triage' ? 'triage' : 'todo')
                }
                aria-label="Starting column for the new task"
                className="w-full p-2 rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-800 dark:text-slate-200 focus:border-[#F97316]"
              >
                <option value="auto">Queue for work (Hermes decides)</option>
                <option value="triage">Triage (refine first)</option>
              </select>
              <p className="mt-1 text-[10px] text-slate-400 leading-snug">
                {status === 'triage'
                  ? 'Parked in Triage until you specify or decompose it.'
                  : 'Lands in Ready, or Todo while a parent task is still open.'}
              </p>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-mono">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full p-2 rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-800 dark:text-slate-200 focus:border-[#F97316]"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="none">No Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-mono">Assign to Agent</label>
              <select
                value={assigneeProfile}
                onChange={e => setAssigneeProfile(e.target.value)}
                className="w-full p-2 rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-800 dark:text-slate-200 focus:border-[#F97316]"
              >
                {/* Active Agent Profiles */}
                {agents.length > 0 ? (
                  <optgroup label="Active Profiles">
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.avatar || '🤖'} {agent.name} ({agent.id}) {agent.status === 'online' ? '• Online' : ''}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <optgroup label="Default Agents">
                    <option value="sa-aws">⚡ AWS Solution Architect (sa-aws)</option>
                    <option value="sa-microsoft">☁️ Azure Specialist (sa-microsoft)</option>
                    <option value="technical-writer">📝 Technical Writer (technical-writer)</option>
                    <option value="database-engineer">🗄️ Database Engineer (database-engineer)</option>
                    <option value="default">⚙️ Default Agent (default)</option>
                  </optgroup>
                )}

                {/* Historical / Archived Known Assignees */}
                {knownAssignees
                  .map(ka => (typeof ka === 'string' ? ka : (ka as any)?.name))
                  .filter((ka): ka is string => Boolean(ka) && !agents.some(a => a.id === ka)).length > 0 && (
                  <optgroup label="Historical / Other Assignees">
                    {knownAssignees
                      .map(ka => (typeof ka === 'string' ? ka : (ka as any)?.name))
                      .filter((ka): ka is string => Boolean(ka) && !agents.some(a => a.id === ka))
                      .map(ka => (
                        <option key={ka} value={ka}>
                          📁 {ka} (archived/other)
                        </option>
                      ))}
                  </optgroup>
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
            <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/25 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={runImmediately}
                onChange={e => setRunImmediately(e.target.checked)}
                className="rounded text-[#F97316] focus:ring-orange-500 w-4 h-4 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <Play className="w-3.5 h-3.5 text-[#F97316] fill-[#F97316]" />
                <span>⚡ Run Agent immediately after creation (Dispatch Now)</span>
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white shadow-xs shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
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
