import React, { useState } from 'react'
import { X, Zap, Loader2 } from 'lucide-react'

interface NewAutopilotModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (params: { name: string; schedule: string; prompt: string; profile: string }) => Promise<boolean> | boolean
}

// A few common cron presets so users don't have to know cron syntax.
const SCHEDULE_PRESETS: { label: string; value: string }[] = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 2 hours', value: '0 */2 * * *' },
  { label: 'Daily at 09:00', value: '0 9 * * *' },
  { label: 'Weekdays at 18:00', value: '0 18 * * 1-5' },
  { label: 'Weekly (Fri 18:00)', value: '0 18 * * 5' }
]

const PROFILES = ['sa-aws', 'sa-microsoft', 'technical-writer', 'database-engineer', 'default']

export const NewAutopilotModal: React.FC<NewAutopilotModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('')
  const [schedule, setSchedule] = useState(SCHEDULE_PRESETS[1].value)
  const [prompt, setPrompt] = useState('')
  const [profile, setProfile] = useState('sa-aws')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const reset = () => {
    setName('')
    setSchedule(SCHEDULE_PRESETS[1].value)
    setPrompt('')
    setProfile('sa-aws')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !schedule.trim() || !prompt.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const ok = await onCreate({
        name: name.trim(),
        schedule: schedule.trim(),
        prompt: prompt.trim(),
        profile
      })
      if (ok) {
        reset()
        onClose()
      } else {
        setError('Failed to create autopilot. Check the schedule/cron expression.')
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
            <Zap className="w-4 h-4 text-amber-500" /> New Autopilot
          </h3>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Name</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Daily Cost Monitoring"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Schedule</label>
              <select
                value={schedule}
                onChange={e => setSchedule(e.target.value)}
                className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200"
              >
                {SCHEDULE_PRESETS.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Assign to Agent</label>
              <select
                value={profile}
                onChange={e => setProfile(e.target.value)}
                className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200"
              >
                {PROFILES.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">
              Cron expression <span className="font-mono text-slate-400">({schedule})</span>
            </label>
            <input
              type="text"
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
              placeholder="0 */2 * * *"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Prompt / Task instruction</label>
            <textarea
              rows={4}
              required
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe what the agent should do on each run..."
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-xs disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Create Autopilot</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
