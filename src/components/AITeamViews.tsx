import React, { useState, useEffect, useMemo } from 'react'
import {
  Bot,
  Users,
  Wrench,
  Plus,
  Crown,
  X,
  Save,
  Check,
  Copy,
  Sliders,
  FileText,
  Sparkles,
  Cpu,
  Layers,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Folder,
  Shield,
  Zap,
  Filter,
  Trash2,
  Loader2
} from 'lucide-react'
import {
  AIAgent,
  Squad,
  Skill,
  Task,
  OrchestrationSettings,
  ModelOptionsResponse,
  SkillContent,
  CreateProfilePayload
} from '../types'
import { hermesApi } from '../api/hermesApi'
import { MarkdownRenderer } from './MarkdownRenderer'
import { NewSkillModal } from './NewSkillModal'

// Recommended default template for empty/new agent SOUL.md
const RECOMMENDED_SOUL_TEMPLATE = (agentName: string, roleDescription?: string) => `# Agent Persona: ${agentName}

## Role & Responsibilities
${roleDescription || 'Specialist AI Agent in the Hermes Agentic Workspace.'}
You operate as an autonomous technical specialist delivering production-grade outcomes.

## Core Operating Principles
1. **Direct & Action-Oriented**: Be concise and deliver finished technical work. Avoid conversational filler or narrating obvious tool steps.
2. **Verified Deliverables**: Always verify generated code, configs, or diagrams before reporting completion.
3. **Structured Formats**: Prefer declarative formats (Terraform, YAML, Python, Markdown, SVG) aligned with repository standards.
4. **Human-in-the-Loop Alignment**: Highlight critical architectural choices, security considerations, and production impacts for operator review in the Inbox.

## Tool & Execution Guidelines
- Execute bash/shell commands safely within the workspace.
- Write files using atomic writes and verify file existence.
- Keep comments and code documentation clean and aligned with project idioms.

## Diagramming & Architecture Visualizations
- When explaining architectures, workflows, network topologies, or sequence flows, **ALWAYS use Mermaid code blocks** (\`\`\`mermaid ... \`\`\`).
- **NEVER use ASCII art, plain text box drawings, or pseudo-diagrams** (such as \`+----+\` or \`| kubectl | --->\`).
- Use standard Mermaid diagram types: \`flowchart TD\` / \`flowchart LR\` for architecture diagrams, \`sequenceDiagram\` for API/auth workflows, \`classDiagram\` for domain models, or \`stateDiagram-v2\` for lifecycle states.
`

// ============================================================================
// 1. AGENT DETAIL DRAWER (SOUL.md, Model/Provider, Skills, Tasks)
// ============================================================================

interface AgentDetailDrawerProps {
  agent: AIAgent | null
  tasks?: Task[]
  onClose: () => void
  onAgentUpdated?: () => void
  onSelectAgentForChat?: (agentId: string) => void
}

export const AgentDetailDrawer: React.FC<AgentDetailDrawerProps> = ({
  agent,
  tasks = [],
  onClose,
  onAgentUpdated,
  onSelectAgentForChat
}) => {
  const [activeTab, setActiveTab] = useState<'soul' | 'model' | 'skills' | 'tasks'>('soul')

  // SOUL.md State
  const [soulContent, setSoulContent] = useState<string>('')
  const [savedSoulContent, setSavedSoulContent] = useState<string>('')
  const [isLoadingSoul, setIsLoadingSoul] = useState<boolean>(false)
  const [isSavingSoul, setIsSavingSoul] = useState<boolean>(false)
  const [soulFeedback, setSoulFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Role description state
  const [description, setDescription] = useState<string>('')
  const [isSavingDesc, setIsSavingDesc] = useState<boolean>(false)

  // Model & Provider State
  const [modelOptions, setModelOptions] = useState<ModelOptionsResponse>({ providers: [] })
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [customModel, setCustomModel] = useState<string>('')
  const [isCustomModelMode, setIsCustomModelMode] = useState<boolean>(false)
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false)
  const [isSavingModel, setIsSavingModel] = useState<boolean>(false)
  const [modelFeedback, setModelFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Per-Profile Skills State
  const [profileSkills, setProfileSkills] = useState<Skill[]>([])
  const [skillFilter, setSkillFilter] = useState<string>('')
  const [isLoadingSkills, setIsLoadingSkills] = useState<boolean>(false)
  const [togglingSkill, setTogglingSkill] = useState<string | null>(null)

  // Profile Lifecycle State (TASK-1.5 & TASK-1.6)
  const [isAutoDescribing, setIsAutoDescribing] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false)

  // Keyboard shortcut: Escape to close drawer
  useEffect(() => {
    if (!agent) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [agent, onClose])

  // Load data when agent changes
  useEffect(() => {
    if (!agent) return
    setActiveTab('soul')
    setDescription(agent.description || '')
    setSoulFeedback(null)
    setModelFeedback(null)

    // Load SOUL.md
    setIsLoadingSoul(true)
    hermesApi.getProfileSoul(agent.id)
      .then(res => {
        setSoulContent(res.content || '')
        setSavedSoulContent(res.content || '')
      })
      .finally(() => setIsLoadingSoul(false))

    // Load Model Options & initialize
    setIsLoadingModels(true)
    hermesApi.getModelOptions()
      .then(opts => {
        setModelOptions(opts)
        const currentProvider = agent.provider || (opts.providers[0]?.slug || 'custom')
        setSelectedProvider(currentProvider)
        const providerObj = opts.providers.find(p => p.slug === currentProvider)
        const currentModel = agent.model || (providerObj?.models[0] || 'hermes-agent')

        if (providerObj && providerObj.models.includes(currentModel)) {
          setSelectedModel(currentModel)
          setIsCustomModelMode(false)
        } else {
          setSelectedModel('custom')
          setCustomModel(currentModel)
          setIsCustomModelMode(true)
        }
      })
      .finally(() => setIsLoadingModels(false))

    // Load Profile Skills
    setIsLoadingSkills(true)
    hermesApi.getProfileSkills(agent.id)
      .then(skills => setProfileSkills(skills))
      .finally(() => setIsLoadingSkills(false))

  }, [agent])

  if (!agent) return null

  // Filter completed tasks for this agent
  const completedTasks = tasks.filter(t => {
    if (t.status !== 'done') return false
    const matchProfile = t.assigneeProfile === agent.id
    const matchName = t.assigneeName === agent.name || t.assigneeName === agent.displayName
    const isDefaultMatch = agent.isDefault && (!t.assigneeProfile || t.assigneeProfile === 'default')
    return matchProfile || matchName || isDefaultMatch
  })

  // Filter profile skills
  const filteredSkills = profileSkills.filter(s =>
    s.name.toLowerCase().includes(skillFilter.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(skillFilter.toLowerCase())) ||
    (s.category && s.category.toLowerCase().includes(skillFilter.toLowerCase()))
  )

  // Handle Save SOUL.md
  const handleSaveSoul = async () => {
    setIsSavingSoul(true)
    setSoulFeedback(null)
    try {
      const ok = await hermesApi.updateProfileSoul(agent.id, soulContent)
      if (ok) {
        setSavedSoulContent(soulContent)
        setSoulFeedback({ type: 'success', message: 'SOUL.md successfully saved.' })
        onAgentUpdated?.()
      } else {
        setSoulFeedback({ type: 'error', message: 'Failed to save SOUL.md' })
      }
    } catch (e: any) {
      setSoulFeedback({ type: 'error', message: e.message || 'Error saving SOUL.md' })
    } finally {
      setIsSavingSoul(false)
    }
  }

  // Handle Save Role Description
  const handleSaveDescription = async () => {
    setIsSavingDesc(true)
    try {
      const ok = await hermesApi.updateProfileDescription(agent.id, description)
      if (ok) {
        onAgentUpdated?.()
      }
    } finally {
      setIsSavingDesc(false)
    }
  }

  // Handle Save Model Configuration
  const handleSaveModel = async () => {
    const finalModel = isCustomModelMode ? customModel.trim() : selectedModel
    if (!selectedProvider || !finalModel) {
      setModelFeedback({ type: 'error', message: 'Provider and model cannot be empty.' })
      return
    }

    setIsSavingModel(true)
    setModelFeedback(null)
    try {
      const ok = await hermesApi.updateProfileModel(agent.id, selectedProvider, finalModel)
      if (ok) {
        setModelFeedback({ type: 'success', message: `Model updated to ${finalModel} (${selectedProvider}).` })
        onAgentUpdated?.()
      } else {
        setModelFeedback({ type: 'error', message: 'Failed to update profile model.' })
      }
    } catch (e: any) {
      setModelFeedback({ type: 'error', message: e.message || 'Error updating profile model.' })
    } finally {
      setIsSavingModel(false)
    }
  }

  // Handle Toggle Skill
  const handleToggleSkill = async (skillName: string, currentEnabled: boolean) => {
    setTogglingSkill(skillName)
    const newEnabled = !currentEnabled

    // Optimistic update
    setProfileSkills(prev =>
      prev.map(s => (s.name === skillName ? { ...s, enabled: newEnabled } : s))
    )

    try {
      const ok = await hermesApi.toggleProfileSkill(agent.id, skillName, newEnabled)
      if (!ok) {
        // Revert on failure
        setProfileSkills(prev =>
          prev.map(s => (s.name === skillName ? { ...s, enabled: currentEnabled } : s))
        )
      } else {
        onAgentUpdated?.()
      }
    } catch {
      setProfileSkills(prev =>
        prev.map(s => (s.name === skillName ? { ...s, enabled: currentEnabled } : s))
      )
    } finally {
      setTogglingSkill(null)
    }
  }

  // TASK-1.6: AI Auto-Describe Profile
  const handleAutoDescribe = async () => {
    setIsAutoDescribing(true)
    try {
      const result = await hermesApi.autoDescribeProfile(agent.id)
      if (result.ok && result.description) {
        setDescription(result.description)
        await hermesApi.updateProfileDescription(agent.id, result.description)
        onAgentUpdated?.()
      } else {
        alert(result.message || 'Failed to auto-describe profile')
      }
    } finally {
      setIsAutoDescribing(false)
    }
  }

  // TASK-1.5: Delete Profile
  const handleDeleteProfile = async () => {
    if (agent.isDefault) {
      alert('Cannot delete the default profile')
      return
    }
    setIsDeleting(true)
    try {
      const result = await hermesApi.deleteProfile(agent.id)
      if (result.ok) {
        onAgentUpdated?.()
        onClose()
      } else {
        alert(result.message || 'Failed to delete profile')
      }
    } finally {
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }

  // TASK-1.5: Export Profile
  const handleExportProfile = async () => {
    setIsExporting(true)
    try {
      const result = await hermesApi.exportProfile(agent.id)
      if (result.ok && result.data) {
        const dataStr = JSON.stringify(result.data, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${agent.id}-profile-export.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        alert(result.message || 'Failed to export profile')
      }
    } finally {
      setIsExporting(false)
    }
  }

  const isSoulDirty = soulContent !== savedSoulContent

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#111317] border-l border-slate-200 dark:border-[#23272F] shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-[#23272F] bg-slate-50/70 dark:bg-[#15181F]/70 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-3xl p-2 rounded-xl bg-white dark:bg-[#1E222B] border border-slate-200 dark:border-[#2A2E39] shadow-xs flex items-center justify-center">
                {agent.avatar || '🤖'}
              </span>
              <span
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#111317] ${
                  agent.status === 'online'
                    ? 'bg-emerald-500'
                    : agent.status === 'busy'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {agent.displayName || agent.name}
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-200 dark:bg-[#23272F] text-slate-700 dark:text-slate-300">
                  {agent.id}
                </span>
                {agent.isDefault ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                    Core Default
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                    Specialist Agent
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Folder className="w-3 h-3 text-slate-400" />
                  {agent.path ? (agent.path.includes('.hermes') ? '~' + agent.path.slice(agent.path.indexOf('.hermes') - 1) : agent.path) : `~/.hermes/profiles/${agent.id}`}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-purple-400" />
                  {agent.model || 'hermes-agent'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSelectAgentForChat && (
              <button
                onClick={() => {
                  onSelectAgentForChat(agent.id)
                  onClose()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                title="Start live interactive chat with this agent"
              >
                <Zap className="w-3.5 h-3.5" />
                Chat
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E222B]"
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TASK-1.5: Profile Lifecycle Actions */}
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/30 flex items-center justify-between">
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
            Profile Management
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportProfile}
              disabled={isExporting}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer disabled:opacity-50"
              title="TASK-1.5: Export profile configuration"
            >
              {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
              Export
            </button>
            {!agent.isDefault && (
              confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDeleteProfile}
                    disabled={isDeleting}
                    className="px-2 py-1 rounded text-[11px] bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm Delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 rounded text-[11px] bg-slate-200 dark:bg-[#2A2524] hover:bg-slate-300 dark:hover:bg-[#34383F] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer"
                  title="TASK-1.5: Delete this profile"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete Profile
                </button>
              )
            )}
          </div>
        </div>

        {/* Drawer Tabs */}
        <div className="px-4 border-b border-slate-200 dark:border-[#23272F] bg-white dark:bg-[#111317] flex items-center gap-6">
          <button
            onClick={() => setActiveTab('soul')}
            className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'soul'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            SOUL.md
            {isSoulDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
          </button>
          <button
            onClick={() => setActiveTab('model')}
            className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'model'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Model & Provider
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'skills'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Allowed Skills
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-[#1E222B] text-slate-500 font-mono">
              {profileSkills.filter(s => s.enabled).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'tasks'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed Tasks
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-[#1E222B] text-slate-500 font-mono">
              {completedTasks.length}
            </span>
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: SOUL.MD PERSONA */}
          {activeTab === 'soul' && (
            <div className="space-y-4 flex flex-col h-full">
              {/* Role description bar */}
              <div className="bg-slate-50 dark:bg-[#15181F] p-3 rounded-lg border border-slate-200 dark:border-[#23272F]">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Agent Role Description (Kanban Auto-Routing Signal)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g. Senior Cloud Architect specializing in AWS VPC, IAM, and Terraform..."
                    className="flex-1 px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12] text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleAutoDescribe}
                    disabled={isAutoDescribing}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium transition-colors shadow-xs disabled:opacity-50"
                    title="TASK-1.6: Generate description from SOUL.md using LLM"
                  >
                    {isAutoDescribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isAutoDescribing ? 'Analyzing...' : 'Auto Describe'}
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    disabled={isSavingDesc}
                    className="px-3 py-1.5 text-xs rounded bg-slate-200 hover:bg-slate-300 dark:bg-[#23272F] dark:hover:bg-[#2F3440] text-slate-700 dark:text-slate-200 font-medium transition-colors"
                  >
                    {isSavingDesc ? 'Saving...' : 'Update Role'}
                  </button>
                </div>
              </div>

              {/* Persona SOUL.md editor */}
              <div className="flex-1 flex flex-col border border-slate-200 dark:border-[#23272F] rounded-lg overflow-hidden bg-white dark:bg-[#0D0F12]">
                <div className="px-3 py-2 bg-slate-50 dark:bg-[#15181F] border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      SOUL.md
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (System Instructions & Persona)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSoulContent(RECOMMENDED_SOUL_TEMPLATE(agent.displayName || agent.name, agent.description))}
                      className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 hover:underline px-2 py-0.5 rounded hover:bg-purple-50 dark:hover:bg-purple-950/40"
                      title="Populate with structured recommended template"
                    >
                      <Sparkles className="w-3 h-3" />
                      Insert Template
                    </button>
                    <button
                      onClick={handleSaveSoul}
                      disabled={isSavingSoul || !isSoulDirty}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium shadow-xs transition-colors ${
                        isSoulDirty
                          ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                          : 'bg-slate-100 dark:bg-[#1F232B] text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingSoul ? 'Saving...' : 'Save SOUL.md'}
                    </button>
                  </div>
                </div>

                {soulFeedback && (
                  <div className={`px-3 py-1.5 text-xs flex items-center gap-1.5 ${
                    soulFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  }`}>
                    {soulFeedback.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {soulFeedback.message}
                  </div>
                )}

                <div className="flex-1 relative">
                  {isLoadingSoul ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading persona file...</div>
                  ) : (
                    <textarea
                      value={soulContent}
                      onChange={e => setSoulContent(e.target.value)}
                      placeholder="Write system instructions, operational philosophy, and tool guidelines for this agent..."
                      rows={16}
                      className="w-full h-full min-h-[350px] p-3 text-xs font-mono text-slate-900 dark:text-slate-100 bg-transparent resize-y focus:outline-hidden leading-relaxed"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MODEL & PROVIDER */}
          {activeTab === 'model' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-[#15181F] p-4 rounded-lg border border-slate-200 dark:border-[#23272F]">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-500" />
                  Active LLM Engine Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure the primary LLM model and API provider for this agent profile. Settings are saved persistently to <code className="text-purple-600 dark:text-purple-400 font-mono">config.yaml</code>.
                </p>

                {modelFeedback && (
                  <div className={`mt-3 px-3 py-2 rounded text-xs flex items-center gap-1.5 ${
                    modelFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  }`}>
                    {modelFeedback.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {modelFeedback.message}
                  </div>
                )}

                {isLoadingModels ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading model options...</div>
                ) : (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Provider
                    </label>
                    <select
                      value={selectedProvider}
                      onChange={e => {
                        const newProvider = e.target.value
                        setSelectedProvider(newProvider)
                        const prov = modelOptions.providers.find(p => p.slug === newProvider)
                        if (prov && prov.models.length > 0) {
                          setSelectedModel(prov.models[0])
                          setIsCustomModelMode(false)
                        } else {
                          setSelectedModel('custom')
                          setIsCustomModelMode(true)
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12] text-slate-900 dark:text-white"
                    >
                      {modelOptions.providers.map(p => (
                        <option key={p.slug} value={p.slug}>
                          {p.label || p.slug}
                        </option>
                      ))}
                      {!modelOptions.providers.some(p => p.slug === 'custom') && (
                        <option value="custom">custom (Local / Router / Ollama)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Model
                    </label>
                    {!isCustomModelMode ? (
                      <div className="space-y-2">
                        <select
                          value={selectedModel}
                          onChange={e => {
                            if (e.target.value === 'custom') {
                              setIsCustomModelMode(true)
                            } else {
                              setSelectedModel(e.target.value)
                            }
                          }}
                          className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12] text-slate-900 dark:text-white"
                        >
                          {(modelOptions.providers.find(p => p.slug === selectedProvider)?.models || []).map(m => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                          <option value="custom">-- Enter custom model string --</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsCustomModelMode(true)}
                          className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          Type custom model manually
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={customModel}
                          onChange={e => setCustomModel(e.target.value)}
                          placeholder="e.g. claude-3-7-sonnet-latest, hermes-agent, deepseek-r1..."
                          className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12] text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setIsCustomModelMode(false)}
                          className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          Pick from standard provider catalog
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveModel}
                      disabled={isSavingModel}
                      className="px-4 py-2 rounded text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white shadow-xs flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingModel ? 'Saving...' : 'Apply Model Changes'}
                    </button>
                  </div>
                </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ALLOWED SKILLS */}
          {activeTab === 'skills' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={skillFilter}
                    onChange={e => setSkillFilter(e.target.value)}
                    placeholder="Search profile skills..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12] text-slate-900 dark:text-white"
                  />
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {filteredSkills.length} skills
                </span>
              </div>

              {isLoadingSkills ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading profile skills...</div>
              ) : filteredSkills.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No matching skills found.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-[#1E222B] border border-slate-200 dark:border-[#23272F] rounded-lg overflow-hidden bg-white dark:bg-[#0D0F12]">
                  {filteredSkills.map(sk => (
                    <div key={sk.name} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#15181F]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                            {sk.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-[#1F232B] text-slate-500 font-medium">
                            {sk.category}
                          </span>
                          {sk.provenance && (
                            <span className="text-[10px] text-slate-400 capitalize">
                              ({sk.provenance})
                            </span>
                          )}
                        </div>
                        {sk.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {sk.description}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleSkill(sk.name, sk.enabled ?? true)}
                        disabled={togglingSkill === sk.name}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          sk.enabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-[#2A2E39]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            sk.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COMPLETED TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {completedTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-[#23272F] rounded-lg">
                  No completed tasks recorded for this agent yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {completedTasks.map(t => (
                    <div
                      key={t.id}
                      className="p-3 bg-white dark:bg-[#15181F] border border-slate-200 dark:border-[#23272F] rounded-lg shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-purple-600 dark:text-purple-400">
                            {t.id}
                          </span>
                          <span className="text-xs font-medium text-slate-900 dark:text-white">
                            {t.title}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          Done
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                          {t.description}
                        </p>
                      )}
                      {t.reviewReport && (
                        <div className="mt-2 p-2 bg-slate-50 dark:bg-[#0D0F12] rounded text-[11px] text-slate-600 dark:text-slate-300 font-mono line-clamp-2">
                          {t.reviewReport}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 2. CREATE NEW AGENT MODAL
// ============================================================================

interface NewAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onAgentCreated: (agentName: string) => void
  existingAgents: AIAgent[]
}

export const NewAgentModal: React.FC<NewAgentModalProps> = ({
  isOpen,
  onClose,
  onAgentCreated,
  existingAgents
}) => {
  const [slug, setSlug] = useState<string>('')
  const [displayName, setDisplayName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [cloneFrom, setCloneFrom] = useState<string>('default')
  const [cloneFromDefault, setCloneFromDefault] = useState<boolean>(true)
  const [provider, setProvider] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [modelOptions, setModelOptions] = useState<ModelOptionsResponse>({ providers: [] })
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setSlug('')
      setDisplayName('')
      setDescription('')
      setErrorMsg(null)
      hermesApi.getModelOptions().then(opts => {
        setModelOptions(opts)
        if (opts.providers.length > 0) {
          setProvider(opts.providers[0].slug)
          setModel(opts.providers[0].models[0] || 'hermes-agent')
        }
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug.trim()) {
      setErrorMsg('Agent identifier slug is required.')
      return
    }

    if (existingAgents.some(a => a.id.toLowerCase() === slug.toLowerCase())) {
      setErrorMsg(`An agent with identifier "${slug}" already exists.`)
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const payload: CreateProfilePayload = {
        name: slug.trim().toLowerCase(),
        display_name: displayName.trim() || undefined,
        description: description.trim() || undefined,
        clone_from: cloneFromDefault ? 'default' : (cloneFrom || undefined),
        clone_from_default: cloneFromDefault,
        provider: provider || undefined,
        model: model || undefined
      }

      const res = await hermesApi.createProfile(payload)
      if (res.ok) {
        onAgentCreated(res.name || slug)
        onClose()
      } else {
        setErrorMsg(res.message || 'Failed to create agent profile.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating agent profile.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-[#111317] border border-slate-200 dark:border-[#23272F] rounded-xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between bg-slate-50 dark:bg-[#15181F]">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Create New Agent Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Agent Identifier (Slug) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={handleSlugChange}
              placeholder="e.g. sa-aws, security-auditor, devops-sre"
              required
              className="w-full px-3 py-2 rounded font-mono border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12] text-slate-900 dark:text-white"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Lowercase letters, numbers, and hyphens only.
            </p>
          </div>

          <div>
            <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. AWS Solution Architect"
              className="w-full px-3 py-2 rounded border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12] text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Role Description (Kanban Routing Instructions)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe this agent's specialty, e.g. Terraform architecture design, multi-cloud networking, and cost optimization..."
              rows={3}
              className="w-full px-3 py-2 rounded border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12] text-slate-900 dark:text-white"
            />
          </div>

          <div className="bg-slate-50 dark:bg-[#15181F] p-3 rounded border border-slate-200 dark:border-[#23272F] space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="clone_default"
                checked={cloneFromDefault}
                onChange={e => setCloneFromDefault(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="clone_default" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Clone configuration & bundled skills from Default Profile
              </label>
            </div>

            {!cloneFromDefault && (
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Clone from existing profile:</label>
                <select
                  value={cloneFrom}
                  onChange={e => setCloneFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12]"
                >
                  {existingAgents.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Provider</label>
              <select
                value={provider}
                onChange={e => {
                  setProvider(e.target.value)
                  const prov = modelOptions.providers.find(p => p.slug === e.target.value)
                  if (prov && prov.models[0]) setModel(prov.models[0])
                }}
                className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12]"
              >
                {modelOptions.providers.map(p => (
                  <option key={p.slug} value={p.slug}>{p.label || p.slug}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">Model</label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. hermes-agent"
                className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-[#23272F] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E222B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded font-medium bg-purple-600 hover:bg-purple-700 text-white shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {isSubmitting ? 'Creating Profile...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// 3. AGENTS VIEW (MAIN AGENT FLEET TABLE)
// ============================================================================

export const AgentsView: React.FC<{
  agents: AIAgent[]
  tasks?: Task[]
  onRefreshAgents?: () => void
  onSelectAgentForChat?: (agentId: string) => void
}> = ({ agents, tasks = [], onRefreshAgents, onSelectAgentForChat }) => {
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null)
  const [isNewAgentOpen, setIsNewAgentOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const filteredAgents = useMemo(() => {
    return agents.filter(a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [agents, searchQuery])

  const handleAgentCreated = (newAgentName: string) => {
    onRefreshAgents?.()
    setTimeout(() => {
      const match = agents.find(a => a.id === newAgentName)
      if (match) setSelectedAgent(match)
    }, 400)
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-white dark:bg-[#0D0F12]">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-500" />
            Agent Fleet & Profiles
            <span className="text-xs font-normal text-slate-400">({agents.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AI specialist teammates backed by isolated Hermes profiles and individual <code className="font-mono text-purple-600 dark:text-purple-400">SOUL.md</code> personas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-[#2A2E39] bg-slate-50 dark:bg-[#14171D] text-slate-900 dark:text-white"
            />
          </div>

          <button
            onClick={() => onRefreshAgents?.()}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E222B]"
            title="Refresh Agents"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsNewAgentOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New agent
          </button>
        </div>
      </div>

      {/* Agents Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#23272F] bg-slate-50 dark:bg-[#14171D] text-slate-500">
              <th className="py-2.5 px-4 font-medium">Agent</th>
              <th className="py-2.5 px-4 font-medium">Status</th>
              <th className="py-2.5 px-4 font-medium">Profile Type</th>
              <th className="py-2.5 px-4 font-medium">Runtime & Model</th>
              <th className="py-2.5 px-4 font-medium">Allowed Skills</th>
              <th className="py-2.5 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-[#1F232B]">
            {filteredAgents.map(a => (
              <tr
                key={a.id}
                onClick={() => setSelectedAgent(a)}
                className="hover:bg-slate-50 dark:hover:bg-[#16191E] cursor-pointer transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{a.avatar || '🤖'}</span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {a.displayName || a.name}
                        <span className="text-[10px] font-mono text-slate-400 font-normal">
                          ({a.id})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 max-w-sm">
                        {a.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {(() => {
                    const statusStyle: Record<AIAgent['status'], { dot: string; text: string; label: string }> = {
                      online: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Online' },
                      busy: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'Busy' },
                      offline: { dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400', label: 'Offline' }
                    }
                    const s = statusStyle[a.status] ?? statusStyle.offline
                    return (
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${a.status === 'busy' ? 'animate-pulse' : ''}`} /> {s.label}
                      </span>
                    )
                  })()}
                </td>
                <td className="py-3 px-4">
                  {a.isDefault ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/60 font-medium">
                      Core Default
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 font-medium">
                      Specialist
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {a.model || 'hermes-agent'}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({a.provider || 'custom'})
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-[#1E222B] text-slate-600 dark:text-slate-400 font-mono">
                    {a.skillCount ?? 0} skills
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedAgent(a)
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded transition-colors"
                  >
                    Inspect Profile →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inspector Drawer */}
      <AgentDetailDrawer
        agent={selectedAgent}
        tasks={tasks}
        onClose={() => setSelectedAgent(null)}
        onAgentUpdated={() => onRefreshAgents?.()}
        onSelectAgentForChat={onSelectAgentForChat}
      />

      {/* New Agent Modal */}
      <NewAgentModal
        isOpen={isNewAgentOpen}
        onClose={() => setIsNewAgentOpen(false)}
        onAgentCreated={handleAgentCreated}
        existingAgents={agents}
      />
    </div>
  )
}

// ============================================================================
// 4. SQUADS VIEW (ORCHESTRATOR COCKPIT - PIPELINE & KNOBS)
// ============================================================================

export const SquadsView: React.FC<{
  squads: Squad[]
  agents?: AIAgent[]
  onRefresh?: () => void
}> = ({ squads, agents = [], onRefresh }) => {
  const [orchestration, setOrchestration] = useState<OrchestrationSettings | null>(null)
  const [leadProfile, setLeadProfile] = useState<string>('default')
  const [defaultAssignee, setDefaultAssignee] = useState<string>('default')
  const [autoDecompose, setAutoDecompose] = useState<boolean>(true)
  const [autoPromoteChildren, setAutoPromoteChildren] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load orchestration configuration
  useEffect(() => {
    setIsLoading(true)
    hermesApi.getOrchestrationSettings()
      .then(res => {
        if (res) {
          setOrchestration(res)
          setLeadProfile(res.orchestrator_profile || res.resolved_orchestrator_profile || 'default')
          setDefaultAssignee(res.default_assignee || res.resolved_default_assignee || 'default')
          setAutoDecompose(res.auto_decompose ?? true)
          setAutoPromoteChildren(res.auto_promote_children ?? true)
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  // Handle Save Knobs
  const handleSaveKnobs = async () => {
    setIsSaving(true)
    setFeedbackMsg(null)
    try {
      const ok = await hermesApi.updateOrchestration({
        orchestrator_profile: leadProfile,
        default_assignee: defaultAssignee,
        auto_decompose: autoDecompose,
        auto_promote_children: autoPromoteChildren
      })

      if (ok) {
        setFeedbackMsg({ type: 'success', text: 'Orchestration knobs saved to Hermes config.' })
        onRefresh?.()
      } else {
        setFeedbackMsg({ type: 'error', text: 'Failed to update orchestration settings.' })
      }
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message || 'Error saving settings.' })
    } finally {
      setIsSaving(false)
    }
  }

  const activeLeaderAgent = agents.find(a => a.id === leadProfile) || agents[0]
  const specialistWorkers = agents.filter(a => a.id !== leadProfile)

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-white dark:bg-[#0D0F12]">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            Squad Orchestrator Cockpit
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-mono font-normal">
              Autonomous Multi-Agent Engine
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Orchestration pipeline visualizer and autonomous delegation controller powered by Hermes Kanban Dispatcher.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isLoading && <span className="text-xs text-slate-400">Loading settings...</span>}
          {orchestration?.active_profile && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 font-mono">
              Active: <span className="text-purple-600 dark:text-purple-400 font-medium">{orchestration.active_profile}</span>
            </span>
          )}
          <button
            onClick={handleSaveKnobs}
            disabled={isSaving || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Apply Knobs'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {feedbackMsg && (
          <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
              : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60'
          }`}>
            {feedbackMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* SECTION 1: PIPELINE VISUALIZER */}
        <div className="bg-slate-50 dark:bg-[#14171D] p-5 rounded-xl border border-slate-200 dark:border-[#23272F]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                Autonomous Orchestration Pipeline
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                End-to-end task decomposition, specialist execution, and human verification loop.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
              {autoDecompose ? '⚡ Auto-Decompose Enabled' : '⏸ Manual Decompose'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Stage 1: Lead Orchestrator */}
            <div className="p-4 rounded-lg bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-[#2A2E39] shadow-2xs relative">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-500" /> Lead Orchestrator
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Stage 1</span>
              </div>
              <div className="flex items-center gap-3 my-2">
                <span className="text-2xl p-1.5 rounded-lg bg-slate-100 dark:bg-[#23272F]">
                  {activeLeaderAgent?.avatar || '👑'}
                </span>
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">
                    {activeLeaderAgent?.displayName || activeLeaderAgent?.name || leadProfile}
                  </div>
                  <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400">
                    {leadProfile}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Scans <code className="font-mono text-purple-500">triage</code> tasks, executes AI specification, and decomposes complex issues into specialist sub-tasks.
              </p>
            </div>

            {/* Stage 2: Specialist Fleet */}
            <div className="p-4 rounded-lg bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-[#2A2E39] shadow-2xs relative">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 flex items-center gap-1">
                  <Bot className="w-3 h-3 text-blue-500" /> Specialist Fleet
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Stage 2</span>
              </div>
              <div className="flex items-center gap-2 my-2 overflow-hidden">
                <div className="flex -space-x-2">
                  {specialistWorkers.slice(0, 4).map(w => (
                    <span
                      key={w.id}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#23272F] border-2 border-white dark:border-[#1A1D24] flex items-center justify-center text-sm shadow-xs"
                      title={w.name}
                    >
                      {w.avatar || '🤖'}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  +{specialistWorkers.length || 1} workers
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Parallel worker execution: generates Terraform, shell scripts, cloud configs, and runs terminal commands.
              </p>
            </div>

            {/* Stage 3: Human Verification */}
            <div className="p-4 rounded-lg bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-[#2A2E39] shadow-2xs relative">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/60 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-purple-500" /> Human-in-the-Loop
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Stage 3</span>
              </div>
              <div className="flex items-center gap-3 my-2">
                <span className="text-2xl p-1.5 rounded-lg bg-slate-100 dark:bg-[#23272F]">
                  👤
                </span>
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">
                    HITL Verification Inbox
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    Review & Production Gate
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Operator inspects code diffs and executive summaries. Choose <code className="text-emerald-500">Approve & Done</code> or request revisions.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: ORCHESTRATION KNOBS FORM */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-xl border border-slate-200 dark:border-[#23272F] space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-500" />
            Dispatcher Knobs & Routing Policies
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Knob 1: Lead Orchestrator */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Lead Orchestrator Profile
              </label>
              <p className="text-[11px] text-slate-500">
                The agent responsible for decomposing high-level issues into sub-tasks.
              </p>
              <select
                value={leadProfile}
                onChange={e => setLeadProfile(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12] text-slate-900 dark:text-white"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.id}) {a.isDefault ? '• Core Default' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Knob 2: Default Assignee */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Default Assignee Profile
              </label>
              <p className="text-[11px] text-slate-500">
                Fallback profile assigned to newly created tasks when no assignee is chosen.
              </p>
              <select
                value={defaultAssignee}
                onChange={e => setDefaultAssignee(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-[#2A2E39] bg-white dark:bg-[#0D0F12] text-slate-900 dark:text-white"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Knob 3: Auto Decompose Switch */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-[#2A2E39] bg-slate-50/50 dark:bg-[#191D24]/50 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Auto Decompose on Triage
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Automatically invoke LLM decomposition when tasks enter Backlog / Triage.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoDecompose(!autoDecompose)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  autoDecompose ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-[#2A2E39]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    autoDecompose ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Knob 4: Auto Promote Children Switch */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-[#2A2E39] bg-slate-50/50 dark:bg-[#191D24]/50 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Auto Promote Children
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Automatically move dependent child tasks to Todo/Ready once parent tasks finish.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoPromoteChildren(!autoPromoteChildren)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  autoPromoteChildren ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-[#2A2E39]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    autoPromoteChildren ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: SQUADS ROSTER */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-xl border border-slate-200 dark:border-[#23272F] space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            Configured Multi-Agent Squads
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {squads.map(s => (
              <div key={s.id} className="p-4 rounded-lg border border-slate-200 dark:border-[#23272F] bg-slate-50/60 dark:bg-[#191D24]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <span>👥</span> {s.name}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 font-medium flex items-center gap-1">
                    <Crown className="w-3 h-3" /> {s.leader}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {s.description}
                </p>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-[#23272F]">
                  <span className="text-[11px] text-slate-400">Squad Members:</span>
                  <div className="flex flex-wrap gap-1">
                    {s.members.map(m => (
                      <span key={m} className="px-2 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-[#111317] border border-slate-200 dark:border-[#2A2E39] text-slate-700 dark:text-slate-300">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 5. SKILL DETAIL DRAWER & SKILLS VIEW
// ============================================================================

interface SkillDetailDrawerProps {
  skill: Skill | null
  onClose: () => void
  onToggleSkill: (skillName: string, enabled: boolean) => void
}

export const SkillDetailDrawer: React.FC<SkillDetailDrawerProps> = ({
  skill,
  onClose,
  onToggleSkill
}) => {
  const [content, setContent] = useState<SkillContent | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editedContent, setEditedContent] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!skill) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [skill, onClose])

  useEffect(() => {
    if (!skill) return
    setIsLoading(true)
    setIsEditing(false)
    setSaveFeedback(null)
    hermesApi.getSkillContent(skill.name)
      .then(res => {
        setContent(res)
        setEditedContent(res?.content || '')
      })
      .finally(() => setIsLoading(false))
  }, [skill])

  if (!skill) return null

  const handleCopy = () => {
    if (!content?.content) return
    navigator.clipboard.writeText(content.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveContent = async () => {
    if (!skill || !editedContent.trim()) return
    setIsSaving(true)
    setSaveFeedback(null)
    try {
      const ok = await hermesApi.updateSkillContent(skill.name, editedContent.trim())
      if (ok) {
        setContent(prev => prev ? { ...prev, content: editedContent.trim() } : null)
        setIsEditing(false)
        setSaveFeedback({ type: 'success', message: 'SKILL.md saved successfully' })
        setTimeout(() => setSaveFeedback(null), 3000)
      } else {
        setSaveFeedback({ type: 'error', message: 'Failed to save SKILL.md' })
      }
    } catch (e: any) {
      setSaveFeedback({ type: 'error', message: e.message || 'Error saving content' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditedContent(content?.content || '')
    setIsEditing(false)
    setSaveFeedback(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#111317] border-l border-slate-200 dark:border-[#23272F] shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-[#23272F] bg-slate-50 dark:bg-[#15181F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Wrench className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold font-mono text-slate-900 dark:text-white">
                  {skill.name}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-[#23272F] text-slate-700 dark:text-slate-300 capitalize">
                  {skill.category || 'uncategorized'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 capitalize">
                  {skill.provenance || 'agent'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                {content?.path || `~/.hermes/skills/.../SKILL.md`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSkill(skill.name, !(skill.enabled ?? true))}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                skill.enabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-[#23272F] dark:text-slate-400'
              }`}
            >
              {skill.enabled ? 'Enabled' : 'Disabled'}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div className="px-4 py-2 bg-slate-50/50 dark:bg-[#14171D] border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between text-xs text-slate-500">
          <span>Usage: <strong className="text-slate-700 dark:text-slate-300">{skill.usage ?? 0}×</strong></span>
          <div className="flex items-center gap-2">
            {saveFeedback && (
              <span className={`text-[11px] font-medium ${saveFeedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {saveFeedback.message}
              </span>
            )}
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={!content?.content}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#23272F] rounded cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!content?.content}
                  className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#23272F] rounded cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveContent}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content viewer/editor */}
        <div className="flex-1 overflow-y-auto p-4 select-text">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading SKILL.md instructions...</div>
          ) : content?.content ? (
            isEditing ? (
              <textarea
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                className="w-full h-full min-h-[500px] p-4 rounded-lg bg-slate-50 dark:bg-[#0D0F12] border border-slate-200 dark:border-[#23272F] text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Enter skill instructions in Markdown format..."
              />
            ) : (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0D0F12] border border-slate-200 dark:border-[#23272F] text-xs">
                <MarkdownRenderer content={content.content} />
              </div>
            )
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-[#23272F] rounded-lg">
              No SKILL.md content found for this skill.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const SkillsView: React.FC<{
  skills: Skill[]
  onRefreshSkills?: () => void
}> = ({ skills, onRefreshSkills }) => {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [search, setSearch] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showNewSkillModal, setShowNewSkillModal] = useState(false)

  const categories = useMemo(() => {
    const set = new Set<string>()
    skills.forEach(s => {
      if (s.category) set.add(s.category)
    })
    return ['all', ...Array.from(set)]
  }, [skills])

  const filteredSkills = useMemo(() => {
    return skills.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
      const matchCategory = categoryFilter === 'all' || s.category === categoryFilter
      return matchSearch && matchCategory
    })
  }, [skills, search, categoryFilter])

  const handleToggle = async (skillName: string, enabled: boolean) => {
    await hermesApi.toggleSkill(skillName, enabled)
    onRefreshSkills?.()
    if (selectedSkill && selectedSkill.name === skillName) {
      setSelectedSkill({ ...selectedSkill, enabled })
    }
  }

  const handleCreateSkill = async (params: { name: string; description?: string; category?: string; content: string }) => {
    const result = await hermesApi.createSkill(params)
    if (result.ok) {
      onRefreshSkills?.()
    }
    return result
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-white dark:bg-[#0D0F12]">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-500" />
            Skills Catalog & Tool Capabilities
            <span className="text-xs font-normal text-slate-400">({skills.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Native Hermes tool modules and instructions from <code className="font-mono text-blue-600 dark:text-blue-400">~/.hermes/skills/</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-[#2A2E39] bg-slate-50 dark:bg-[#14171D] text-slate-900 dark:text-white"
            />
          </div>

          <button
            onClick={() => setShowNewSkillModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs shadow-blue-500/20 active:scale-95 cursor-pointer"
            title="Create new custom skill"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Skill</span>
          </button>

          <button
            onClick={() => onRefreshSkills?.()}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E222B]"
            title="Refresh Skills"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="px-4 py-2 border-b border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50/50 dark:bg-[#14161D] flex items-center gap-2 overflow-x-auto font-mono">
        <Filter className="w-3 h-3 text-slate-400 shrink-0" />
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap capitalize transition-colors cursor-pointer ${
              categoryFilter === cat
                ? 'bg-[#F97316] text-white shadow-2xs font-semibold'
                : 'bg-white dark:bg-[#191C21] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#23272F]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#191C21] text-slate-500 font-mono text-[11px] uppercase">
              <th className="py-2.5 px-4 font-medium">Skill</th>
              <th className="py-2.5 px-4 font-medium">Category</th>
              <th className="py-2.5 px-4 font-medium">Master Switch</th>
              <th className="py-2.5 px-4 font-medium">Usage</th>
              <th className="py-2.5 px-4 font-medium">Source</th>
              <th className="py-2.5 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5E4] dark:divide-[#2A2524]">
            {filteredSkills.map(sk => (
              <tr
                key={sk.id || sk.name}
                onClick={() => setSelectedSkill(sk)}
                className="hover:bg-black/5 dark:hover:bg-white/5 align-top cursor-pointer transition-colors"
              >
                <td className="py-2.5 px-4">
                  <div className="font-mono font-medium text-[#F97316] hover:underline">
                    {sk.name}
                  </div>
                  {sk.description && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 max-w-md">
                      {sk.description}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-4">
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-[#14161B] text-slate-600 dark:text-slate-400 capitalize font-mono">
                    {sk.category || 'uncategorized'}
                  </span>
                </td>
                <td className="py-2.5 px-4" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggle(sk.name, !(sk.enabled ?? true))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      sk.enabled ? 'bg-[#F97316]' : 'bg-slate-300 dark:bg-[#2A2E39]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        sk.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </td>
                <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {sk.usage ?? 0}×
                </td>
                <td className="py-2.5 px-4">
                  <span className="text-[11px] text-slate-500 capitalize">{sk.provenance || 'agent'}</span>
                </td>
                <td className="py-2.5 px-4 text-right">
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    Inspect SKILL.md →
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <SkillDetailDrawer
        skill={selectedSkill}
        onClose={() => setSelectedSkill(null)}
        onToggleSkill={handleToggle}
      />

      {/* New Skill Modal */}
      <NewSkillModal
        isOpen={showNewSkillModal}
        onClose={() => setShowNewSkillModal(false)}
        onCreate={handleCreateSkill}
      />
    </div>
  )
}
