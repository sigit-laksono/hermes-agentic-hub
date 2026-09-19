import React, { useState } from 'react'
import { X, FolderGit2, Loader2 } from 'lucide-react'

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (params: { slug: string; name: string; description: string }) => Promise<boolean> | boolean
}

// Turn a display name into a url-safe board slug.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const slug = slugify(name)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug || saving) return
    setSaving(true)
    setError(null)
    try {
      const ok = await onCreate({ slug, name: name.trim(), description: description.trim() })
      if (ok) {
        setName('')
        setDescription('')
        onClose()
      } else {
        setError('Failed to create project.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-[#282D37] bg-white dark:bg-[#16191E] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="p-3.5 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
            <FolderGit2 className="w-4 h-4 text-blue-500" /> New Project
          </h3>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Project name</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. TLI-Cloud-Managed Services"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            {slug && (
              <p className="mt-1 text-[11px] text-slate-400">
                Board slug: <span className="font-mono text-slate-500 dark:text-slate-300">{slug}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">
              Description <span className="text-slate-400">(shared context for agents)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="This description is injected as shared context for every agent run in this project..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-[11px] text-rose-500">{error}</p>}

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
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderGit2 className="w-3.5 h-3.5" />}
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
