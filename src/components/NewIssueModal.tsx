import React, { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Task, TaskStatus, Priority } from '../types'

interface NewIssueModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveTask: (task: Omit<Task, 'id' | 'updatedAt'>) => void
  initialStatus?: TaskStatus
}

export const NewIssueModal: React.FC<NewIssueModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  initialStatus = 'todo'
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(initialStatus)
  const [priority, setPriority] = useState<Priority>('medium')
  const [assignee, setAssignee] = useState('AWS Solution Architect')
  const [project, setProject] = useState('KPC-Cloud-Managed Services')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSaveTask({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigneeType: 'agent',
      assigneeName: assignee,
      assigneeAvatar: assignee.includes('Lead') ? '👑' : assignee.includes('Email') ? '📧' : '🤖',
      projectName: project,
      projectTag: project
    })

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
              placeholder="Issue title..."
              className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add detailed description or context for Hermes Agent..."
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
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200"
              >
                <option value="AWS Solution Architect">🤖 AWS Solution Architect</option>
                <option value="AWS Cloud Operations">⚡ AWS Cloud Operations</option>
                <option value="AWS Team Lead">👑 AWS Team Lead</option>
                <option value="Outlook Email Agent">🦊 Outlook Email Agent</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Project</label>
              <select
                value={project}
                onChange={e => setProject(e.target.value)}
                className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200"
              >
                <option value="KPC-Cloud-Managed Services">KPC-Cloud-Managed Services</option>
                <option value="Email Management">Email Management</option>
              </select>
            </div>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Issue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
