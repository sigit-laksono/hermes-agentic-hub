import React, { useState, useEffect } from 'react'
import { X, Zap, Loader2 } from 'lucide-react'
import { AutopilotJob, AIAgent } from '../types'

interface NewAutopilotModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (params: { name: string; schedule: string; prompt: string; profile: string }) => Promise<boolean> | boolean
  onUpdate?: (jobId: string, params: { name: string; schedule: string; prompt: string; profile: string }) => Promise<boolean> | boolean
  editJob?: AutopilotJob | null
  availableProfiles?: AIAgent[]
}

// A few common cron presets so users don't have to know cron syntax.
const SCHEDULE_PRESETS: { label: string; value: string }[] = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 2 hours', value: '0 */2 * * *' },
  { label: 'Daily at 09:00', value: '0 9 * * *' },
  { label: 'Weekdays at 18:00', value: '0 18 * * 1-5' },
  { label: 'Weekly (Fri 18:00)', value: '0 18 * * 5' }
]

export const NewAutopilotModal: React.FC<NewAutopilotModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  editJob,
  availableProfiles = []
}) => {
  const [name, setName] = useState('')
  const [schedule, setSchedule] = useState(SCHEDULE_PRESETS[1].value)
  const [prompt, setPrompt] = useState('')
  const [profile, setProfile] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = Boolean(editJob)

  // Set default profile from available profiles
  useEffect(() => {
    if (availableProfiles.length > 0 && !profile) {
      setProfile(availableProfiles[0].id)
    }
  }, [availableProfiles, profile])

  // Pre-fill form when editing
  useEffect(() => {
    if (editJob) {
      setName(editJob.name)
      // Extract cron expression from trigger string like "Schedule (Every 2 hours)"
      const cronMatch = editJob.trigger.match(/\((.*?)\)/)
      if (cronMatch) {
        // Try to match against presets
        const matchingPreset = SCHEDULE_PRESETS.find(p => editJob.trigger.includes(p.label))
        setSchedule(matchingPreset?.value || SCHEDULE_PRESETS[1].value)
      }
      // Note: prompt is not available in AutopilotJob type, would need to fetch from backend
      setPrompt('')
      setProfile(editJob.assignee || (availableProfiles.length > 0 ? availableProfiles[0].id : ''))
    }
  }, [editJob, availableProfiles])

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

    // Validate required fields
    if (!name.trim() || !schedule.trim() || saving) return

    // Prompt is required for creation but optional for update (backend limitation)
    if (!isEditMode && !prompt.trim()) return

    setSaving(true)
    setError(null)
    try {
      const params = {
        name: name.trim(),
        schedule: schedule.trim(),
        prompt: prompt.trim() || undefined,  // Send undefined if empty in edit mode
        profile
      }

      const ok = isEditMode && editJob && onUpdate
        ? await onUpdate(editJob.id, params as any)
        : await onCreate(params as any)

      if (ok) {
        reset()
        onClose()
      } else {
        setError(`Failed to ${isEditMode ? 'update' : 'create'} autopilot. Check the schedule/cron expression.`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 font-body">
      <div className="w-full max-w-lg rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="p-4 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between bg-slate-50/50 dark:bg-[#14161B]">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 text-sm font-display">
            <Zap className="w-4 h-4 text-[#F97316]" /> {isEditMode ? 'Edit Autopilot' : 'New Autopilot'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1 font-mono">Name</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Daily Cost Monitoring"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-900 dark:text-white focus:outline-none focus:border-[#F97316] transition-colors"
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
                disabled={availableProfiles.length === 0}
              >
                {availableProfiles.length === 0 ? (
                  <option value="">No profiles available</option>
                ) : (
                  availableProfiles.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.avatar} {agent.displayName || agent.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1 font-mono">
              Cron expression <span className="font-mono text-slate-400">({schedule})</span>
            </label>
            <input
              type="text"
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
              placeholder="0 */2 * * *"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#F97316] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1 font-mono">
              Prompt / Task instruction
              {isEditMode && <span className="text-amber-600 ml-2">(⚠️ Not available in edit mode - backend limitation)</span>}
            </label>
            <textarea
              rows={4}
              required={!isEditMode}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={isEditMode ? "Prompt not available - leave empty or enter new prompt" : "Describe what the agent should do on each run..."}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161B] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#F97316] resize-none transition-colors"
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
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white shadow-xs shadow-orange-500/20 disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>{isEditMode ? 'Update Autopilot' : 'Create Autopilot'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
