import React, { useState } from 'react'
import { X, Wrench, Loader2 } from 'lucide-react'

interface NewSkillModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (params: { name: string; description?: string; category?: string; content: string }) => Promise<{ ok: boolean; message?: string }>
}

const SKILL_TEMPLATE = (name: string) => `# Skill: ${name}

## Purpose
Describe what this skill enables the agent to do.

## When to Use
Specify the conditions or scenarios when this skill should be invoked.

## Instructions
Provide step-by-step instructions or guidelines for the agent to follow.

## Examples
\`\`\`
Example usage or output
\`\`\`

## Notes
Any additional considerations, limitations, or best practices.
`

const CATEGORIES = ['automation', 'analysis', 'deployment', 'monitoring', 'documentation', 'testing', 'security', 'infrastructure', 'custom']

export const NewSkillModal: React.FC<NewSkillModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('custom')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const reset = () => {
    setName('')
    setDescription('')
    setCategory('custom')
    setContent('')
    setError(null)
  }

  const handleGenerateTemplate = () => {
    if (name.trim()) {
      setContent(SKILL_TEMPLATE(name.trim()))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !content.trim() || saving) return

    setSaving(true)
    setError(null)
    try {
      const result = await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || 'custom',
        content: content.trim()
      })

      if (result.ok) {
        reset()
        onClose()
      } else {
        setError(result.message || 'Failed to create skill. Check if the skill name already exists.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 font-body">
      <div className="w-full max-w-3xl rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between bg-slate-50/50 dark:bg-[#14161B]">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 text-sm font-display">
            <Wrench className="w-4 h-4 text-blue-500" /> New Custom Skill
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-mono">Skill Name *</label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. deploy-aws-lambda"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-900 dark:text-white focus:outline-none focus:border-[#F97316] transition-colors font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Use kebab-case (e.g., my-skill-name)</p>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-mono">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-900 dark:text-white focus:outline-none focus:border-[#F97316] transition-colors"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] text-slate-500 font-mono">Description</label>
              <span className={`text-[10px] font-mono ${description.length > 60 ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>
                {description.length}/60
              </span>
            </div>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of what this skill does"
              maxLength={60}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-900 dark:text-white focus:outline-none focus:border-[#F97316] transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] text-slate-500 font-mono">SKILL.md Content *</label>
              {!content && (
                <button
                  type="button"
                  onClick={handleGenerateTemplate}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-mono"
                >
                  Generate template
                </button>
              )}
            </div>
            <textarea
              rows={14}
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="# Skill instructions in Markdown format..."
              className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#F97316] resize-none transition-colors"
            />
          </div>

          {error && <p className="text-[11px] text-rose-500 font-mono">{error}</p>}

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
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
              <span>Create Skill</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
