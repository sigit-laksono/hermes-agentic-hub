import React, { useState } from 'react'
import {
  FolderGit2,
  Plus,
  Search,
  ArrowUpRight,
  SlidersHorizontal,
  Download,
  X,
  Check,
  Loader2,
  FolderOpen,
  Sparkles,
  Info
} from 'lucide-react'
import { Project, Board } from '../types'
import { hermesApi } from '../api/hermesApi'

interface ProjectsViewProps {
  projects: (Project | Board)[]
  activeBoard?: string
  onSelectProject: (slug: string) => void
  onNewProject: () => void
  onRefreshProjects?: () => void
}

const PRESETS = [
  {
    name: 'AWS Cloud & Terraform',
    icon: '⚡',
    text: 'Gunakan Terraform AWS Provider v5+. Penamaan resource format kpc-prod-*. Semua security group wajib memiliki tag Environment=production dan Owner=CloudOps. Simpan state di remote S3 backend dengan DynamoDB state locking.'
  },
  {
    name: 'Kubernetes & GitOps',
    icon: '☸️',
    text: 'Standard Kubernetes manifest v1.28+ dengan Kustomize overlay. Setiap deployment wajib menyertakan resource requests & limits (CPU/Memory) serta livenessProbe dan readinessProbe.'
  },
  {
    name: 'Python Microservices',
    icon: '🐍',
    text: 'Gunakan Python 3.12+ dengan FastAPI dan Pydantic v2. Tulis type hints lengkap, error handling terstruktur, dan sertakan unit test pytest dengan coverage minimal 80%.'
  }
]

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  activeBoard = 'default',
  onSelectProject,
  onNewProject,
  onRefreshProjects
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingProject, setEditingProject] = useState<(Project | Board) | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editWorkdir, setEditWorkdir] = useState('')
  const [isSavingContext, setIsSavingContext] = useState(false)
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [exportingSlug, setExportingSlug] = useState<string | null>(null)

  // Filter projects by search query
  const filteredProjects = projects.filter(p => {
    const slug = p.slug || p.id || ''
    const q = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      slug.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    )
  })

  // Open context editor drawer/modal
  const handleOpenContextEditor = (proj: Project | Board, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingProject(proj)
    setEditName(proj.name)
    setEditDescription(proj.description || '')
    setEditWorkdir(proj.default_workdir || '')
    setSaveNotice(null)
  }

  // Save updated project shared context
  const handleSaveContext = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject || isSavingContext) return
    const slug = editingProject.slug || editingProject.id || ''

    setIsSavingContext(true)
    setSaveNotice(null)
    try {
      const ok = await hermesApi.updateBoard(slug, {
        name: editName.trim() || undefined,
        description: editDescription.trim(),
        default_workdir: editWorkdir.trim() || undefined
      })

      if (ok) {
        setSaveNotice({
          type: 'success',
          text: 'Project Shared Context successfully updated! Agents will use these instructions.'
        })
        if (onRefreshProjects) onRefreshProjects()
      } else {
        setSaveNotice({ type: 'error', text: 'Failed to update board context.' })
      }
    } catch (err: any) {
      setSaveNotice({ type: 'error', text: err.message || 'Error updating board context' })
    } finally {
      setIsSavingContext(false)
    }
  }

  // One-click JSON export & download
  const handleExportJson = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExportingSlug(slug)
    try {
      const data = await hermesApi.exportBoardJson(slug)
      if (data) {
        const jsonStr = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${slug}-board-backup.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        alert('Failed to export board JSON.')
      }
    } catch (err: any) {
      alert(`Export error: ${err.message}`)
    } finally {
      setExportingSlug(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-white dark:bg-[#0D0F12]">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-blue-500" />
            Projects & Workspaces
            <span className="text-xs font-normal text-slate-400">({projects.length} boards)</span>
          </h2>
        </div>

        <button
          onClick={onNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project Board</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between text-xs bg-slate-50/50 dark:bg-[#111317]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects by name, slug, or context..."
              className="pl-8 pr-3 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#16191E] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 w-64"
            />
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          Click any project row to switch active Kanban board.
        </div>
      </div>

      {/* Projects Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#23272F] bg-slate-50 dark:bg-[#14171D] text-slate-500">
              <th className="py-2.5 px-4 font-medium">Board / Project</th>
              <th className="py-2.5 px-4 font-medium">Slug</th>
              <th className="py-2.5 px-4 font-medium">Status & Tasks</th>
              <th className="py-2.5 px-4 font-medium">Shared Context (Guidelines)</th>
              <th className="py-2.5 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-[#1F232B]">
            {filteredProjects.map(proj => {
              const slug = proj.slug || proj.id || ''
              const isCurrent = slug === activeBoard
              const totalTasks =
                'total' in proj && typeof proj.total === 'number'
                  ? proj.total
                  : 'progressTotal' in proj
                  ? proj.progressTotal
                  : 0

              const doneTasks =
                'counts' in proj && proj.counts && typeof proj.counts.done === 'number'
                  ? proj.counts.done
                  : 'progressDone' in proj
                  ? proj.progressDone
                  : 0

              return (
                <tr
                  key={slug}
                  onClick={() => onSelectProject(slug)}
                  className={`transition-colors cursor-pointer group ${
                    isCurrent
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-[#16191E]'
                  }`}
                >
                  {/* Name & Active Badge */}
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{isCurrent ? '📂' : '📁'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {proj.name}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500 text-white shadow-2xs">
                              Active Board
                            </span>
                          )}
                        </div>
                        {proj.default_workdir && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <FolderOpen className="w-2.5 h-2.5 text-slate-400" />
                            <span className="truncate max-w-xs">{proj.default_workdir}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Slug */}
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      {slug}
                    </span>
                  </td>

                  {/* Tasks count & progress */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${totalTasks > 0 ? Math.min(100, (doneTasks / totalTasks) * 100) : 0}%`
                          }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {doneTasks}/{totalTasks} tasks
                      </span>
                    </div>
                  </td>

                  {/* Shared Context Preview */}
                  <td className="py-3 px-4 max-w-xs">
                    {proj.description ? (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-sm" title={proj.description}>
                        {proj.description}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No context configured</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Shared Context Button */}
                      <button
                        onClick={e => handleOpenContextEditor(proj, e)}
                        title="Edit Project Shared Context & Architecture Guidelines"
                        className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>

                      {/* Export JSON Button */}
                      <button
                        onClick={e => handleExportJson(slug, e)}
                        disabled={exportingSlug === slug}
                        title="Export Board as JSON backup"
                        className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {exportingSlug === slug ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Open Board Arrow */}
                      <button
                        onClick={() => onSelectProject(slug)}
                        title="Switch to this Kanban Board"
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100/60 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                      >
                        <span>Open Board</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Project Shared Context Editor Modal / Drawer */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-[#282D37] bg-white dark:bg-[#16191E] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between bg-slate-50/50 dark:bg-[#111317]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    Project Shared Context & Architecture Guidelines
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Board Slug: <span className="font-mono text-blue-500 font-semibold">{editingProject.slug || editingProject.id || ''}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveContext} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Project Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Default Working Directory <span className="text-slate-400 font-normal">(Optional repo path)</span>
                  </label>
                  <input
                    type="text"
                    value={editWorkdir}
                    onChange={e => setEditWorkdir(e.target.value)}
                    placeholder="e.g. /home/sigit/projects/infra"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Shared Context Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Shared Context & Technical Directives
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Automatically injected into system prompts of all agents in this board.
                  </span>
                </div>

                {/* Quick Preset Chips */}
                <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Presets:
                  </span>
                  {PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setEditDescription(prev => (prev ? `${prev}\n\n${preset.text}` : preset.text))
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  rows={6}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Gunakan Terraform AWS Provider v5+, penamaan resource format kpc-prod-*, pastikan semua security group egress dibatasi..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-y leading-relaxed"
                />
              </div>

              {/* Explanation note */}
              <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Hermes Multi-Board Isolation:</strong> Deskripsi ini disimpan secara permanen di{' '}
                  <code className="font-mono text-blue-600 dark:text-blue-400">~/.hermes/kanban/boards/&lt;slug&gt;/board.json</code>.
                  Setiap kali agen mengeksekusi tiket di board ini (misal via <em>AI Specify</em>, <em>AI Decompose</em>, atau <em>Run Agent</em>),
                  instruksi ini secara otomatis disuntikkan ke dalam sistem prompt LLM.
                </div>
              </div>

              {/* Feedback Alert */}
              {saveNotice && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    saveNotice.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {saveNotice.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{saveNotice.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-[#23272F] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSavingContext}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingContext ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
