import React, { useState, useEffect } from 'react'
import {
  X,
  FolderGit2,
  Loader2,
  Upload,
  Download,
  Check,
  AlertCircle,
  FolderPlus,
  Archive,
  FileCode,
  Plus
} from 'lucide-react'
import { Project, Board } from '../types'
import { hermesApi } from '../api/hermesApi'

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (params: {
    slug: string
    name: string
    description: string
    default_workdir?: string
    switch?: boolean
  }) => Promise<boolean> | boolean
  existingBoards?: (Project | Board)[]
  onSelectBoard?: (slug: string) => void
  onRefreshBoards?: () => void
}

// Convert string to URL-safe board slug
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingBoards = [],
  onSelectBoard,
  onRefreshBoards
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'import' | 'export'>('create')

  // Create Board state
  const [name, setName] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [description, setDescription] = useState('')
  const [defaultWorkdir, setDefaultWorkdir] = useState('')
  const [switchImmediately, setSwitchImmediately] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Import state
  const [importJsonFile, setImportJsonFile] = useState<File | null>(null)
  const [parsedImportData, setParsedImportData] = useState<any | null>(null)
  const [importSlug, setImportSlug] = useState('')
  const [importName, setImportName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  // Export state
  const [exportingSlug, setExportingSlug] = useState<string | null>(null)

  // Keep slug in sync with name unless user manually modified customSlug
  const computedSlug = customSlug || slugify(name)
  const existingSlugs = existingBoards.map(b => b.slug || b.id || '')
  const isSlugDuplicate = existingSlugs.includes(computedSlug)
  const isSlugValid = /^[a-z0-9-]+$/.test(computedSlug)

  useEffect(() => {
    if (!isOpen) {
      setName('')
      setCustomSlug('')
      setDescription('')
      setDefaultWorkdir('')
      setCreateError(null)
      setImportJsonFile(null)
      setParsedImportData(null)
      setImportError(null)
      setImportSuccess(null)
      setActiveTab('create')
    }
  }, [isOpen])

  if (!isOpen) return null

  // Handle Form Submit for Create Board
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !computedSlug || saving) return

    if (!isSlugValid) {
      setCreateError('Board slug can only contain lowercase letters, numbers, and hyphens.')
      return
    }

    setSaving(true)
    setCreateError(null)
    try {
      const ok = await onCreate({
        slug: computedSlug,
        name: name.trim(),
        description: description.trim(),
        default_workdir: defaultWorkdir.trim() || undefined,
        switch: switchImmediately
      })

      if (ok) {
        if (switchImmediately && onSelectBoard) {
          onSelectBoard(computedSlug)
        }
        onClose()
      } else {
        setCreateError('Failed to create board. Check server logs.')
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create board')
    } finally {
      setSaving(false)
    }
  }

  // Handle File Selection for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportJsonFile(file)
    setImportError(null)
    setImportSuccess(null)

    const reader = new FileReader()
    reader.onload = event => {
      try {
        const text = event.target?.result as string
        const parsed = JSON.parse(text)
        setParsedImportData(parsed)
        const initialSlug = parsed.board?.slug || parsed.slug || slugify(file.name.replace('.json', ''))
        const initialName = parsed.board?.name || parsed.name || initialSlug
        setImportSlug(initialSlug)
        setImportName(initialName)
      } catch {
        setImportError('Invalid JSON file. Please select a valid Hermes Kanban backup file.')
        setParsedImportData(null)
      }
    }
    reader.readAsText(file)
  }

  // Handle Board Import Submit
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parsedImportData || !importSlug.trim() || importing) return
    setImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      const tasksToImport = parsedImportData.tasks || []
      const linksToImport = parsedImportData.links || []
      const desc = parsedImportData.board?.description || parsedImportData.description || ''

      const res = await hermesApi.importBoardJson({
        slug: importSlug.trim(),
        name: importName.trim() || importSlug.trim(),
        description: desc,
        tasks: tasksToImport,
        links: linksToImport
      })

      if (res.ok) {
        setImportSuccess(
          `Board "${importSlug}" imported successfully with ${res.imported_tasks || tasksToImport.length} tasks!`
        )
        if (onRefreshBoards) onRefreshBoards()
        if (onSelectBoard) {
          setTimeout(() => {
            onSelectBoard(importSlug.trim())
            onClose()
          }, 800)
        }
      } else {
        setImportError(res.message || 'Failed to import board JSON.')
      }
    } catch (err: any) {
      setImportError(err.message || 'Failed to import board JSON.')
    } finally {
      setImporting(false)
    }
  }

  // Handle JSON export download
  const handleExportJson = async (slug: string) => {
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

  // Handle Archive (.tar.gz) export
  const handleExportArchive = async (slug: string) => {
    setExportingSlug(slug)
    try {
      const res = await hermesApi.exportBoardArchive(slug)
      if (res.ok && res.archive) {
        alert(`Board archive successfully created on host server at:\n${res.archive}`)
      } else {
        alert(res.message || 'Failed to export board archive.')
      }
    } catch (err: any) {
      alert(`Archive export error: ${err.message}`)
    } finally {
      setExportingSlug(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 font-body">
      <div className="w-full max-w-xl rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between bg-slate-50/50 dark:bg-[#14161B]">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white font-display">
            <FolderGit2 className="w-4 h-4 text-[#F97316]" />
            <span>Board & Project Management</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E7E5E4] dark:border-[#2A2524] bg-slate-100/60 dark:bg-[#14161B] text-xs px-3 pt-1.5 gap-1 font-mono">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white dark:bg-[#191C21] text-orange-600 dark:text-[#FB923C] border-t border-x border-[#E7E5E4] dark:border-[#2A2524]'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Board</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white dark:bg-[#191C21] text-orange-600 dark:text-[#FB923C] border-t border-x border-[#E7E5E4] dark:border-[#2A2524]'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import (JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-white dark:bg-[#191C21] text-orange-600 dark:text-[#FB923C] border-t border-x border-[#E7E5E4] dark:border-[#2A2524]'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export & Backup</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* TAB 1: CREATE NEW BOARD */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Board Display Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Infrastructure Migration"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-900 dark:text-white focus:outline-none focus:border-[#F97316] transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 font-mono">
                    Board Slug (Identifier)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">lowercase, digits, hyphens</span>
                </div>
                <input
                  type="text"
                  required
                  value={customSlug || computedSlug}
                  onChange={e => setCustomSlug(slugify(e.target.value))}
                  placeholder="e.g. infra-migration"
                  className={`w-full px-3.5 py-2 text-xs font-mono rounded-lg border bg-slate-50 dark:bg-[#14161B] text-slate-900 dark:text-white focus:outline-none transition-colors ${
                    !isSlugValid && computedSlug
                      ? 'border-rose-500 focus:border-rose-500'
                      : isSlugDuplicate
                      ? 'border-amber-500 focus:border-amber-500'
                      : 'border-[#E7E5E4] dark:border-[#2A2524] focus:border-[#F97316]'
                  }`}
                />
                {isSlugDuplicate ? (
                  <p className="mt-1 text-[11px] text-amber-500 flex items-center gap-1 font-mono">
                    <AlertCircle className="w-3 h-3" />
                    Slug already exists. Submitting will select or update the existing board.
                  </p>
                ) : computedSlug && isSlugValid ? (
                  <p className="mt-1 text-[11px] text-emerald-500 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" />
                    Slug available: <span className="font-mono font-semibold">{computedSlug}</span>
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 font-mono">
                  Default Working Directory <span className="text-slate-400 font-normal">(Optional repository path)</span>
                </label>
                <input
                  type="text"
                  value={defaultWorkdir}
                  onChange={e => setDefaultWorkdir(e.target.value)}
                  placeholder="e.g. /home/sigit/projects/migration-repo"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-900 dark:text-white focus:outline-none focus:border-[#F97316] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1 font-mono">
                  Project Shared Context <span className="text-slate-400 font-normal">(Architecture guidelines for agents)</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Gunakan Terraform AWS Provider v5+, penamaan resource format kpc-prod-*..."
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#F97316] resize-none leading-relaxed transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="switch-immediately"
                  checked={switchImmediately}
                  onChange={e => setSwitchImmediately(e.target.checked)}
                  className="rounded border-[#E7E5E4] dark:border-[#2A2524] text-[#F97316] focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="switch-immediately" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  Switch to this board immediately after creation
                </label>
              </div>

              {createError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5 border border-rose-200 dark:border-rose-900">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

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
                  disabled={saving || !name.trim() || !computedSlug || !isSlugValid}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white shadow-xs shadow-orange-500/20 disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create Board</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: IMPORT BOARD (JSON) */}
          {activeTab === 'import' && (
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                  Select Board Backup JSON File
                </label>
                <div className="border-2 border-dashed border-[#E7E5E4] dark:border-[#2A2524] rounded-2xl p-6 text-center hover:border-[#F97316] transition-colors bg-slate-50/50 dark:bg-[#14161B]/50">
                  <input
                    type="file"
                    id="json-file-input"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="json-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <FileCode className="w-8 h-8 text-[#F97316]" />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {importJsonFile ? importJsonFile.name : 'Choose a JSON file or drag it here'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Accepts backup format exported from Hermes Agentic Hub
                    </span>
                  </label>
                </div>
              </div>

              {parsedImportData && (
                <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Backup Overview</span>
                    <span className="text-[11px] font-mono text-emerald-500">
                      {(parsedImportData.tasks || []).length} tasks ready to import
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Target Board Slug</label>
                      <input
                        type="text"
                        required
                        value={importSlug}
                        onChange={e => setImportSlug(slugify(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#16191E] text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Board Name</label>
                      <input
                        type="text"
                        required
                        value={importName}
                        onChange={e => setImportName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#16191E] text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {parsedImportData.board?.description && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate">
                      Context: {parsedImportData.board.description}
                    </div>
                  )}
                </div>
              )}

              {importError && (
                <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-[#23272F] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || !parsedImportData || !importSlug}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white shadow-xs shadow-orange-500/20 disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Import Board</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: EXPORT & BACKUP */}
          {activeTab === 'export' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-body">
                Download a portable backup file of any existing Kanban board to your computer or trigger an archive snapshot on the host.
              </p>

              <div className="divide-y divide-slate-100 dark:divide-[#2A2524] border border-[#E7E5E4] dark:border-[#2A2524] rounded-xl overflow-hidden">
                {existingBoards.map(b => {
                  const slug = b.slug || b.id || ''
                  const isBusy = exportingSlug === slug

                  return (
                    <div key={slug} className="p-3.5 flex items-center justify-between bg-white dark:bg-[#14161B]">
                      <div>
                        <div className="font-semibold text-xs text-slate-800 dark:text-white flex items-center gap-1.5 font-display">
                          <span>📁</span>
                          <span>{b.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          Slug: {slug}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleExportJson(slug)}
                          disabled={isBusy}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#191C21] hover:bg-orange-500/10 text-slate-700 dark:text-slate-300 hover:text-[#F97316] dark:hover:text-[#FB923C] border border-[#E7E5E4] dark:border-[#2A2524] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                          <span>Export JSON</span>
                        </button>

                        <button
                          onClick={() => handleExportArchive(slug)}
                          disabled={isBusy}
                          title="Generate tar.gz archive on server"
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Archive className="w-3 h-3" />
                          <span>.tar.gz</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
