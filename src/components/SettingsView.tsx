import React, { useState, useEffect, useCallback } from 'react'
import {
  Settings,
  FileKey,
  Cpu,
  Radio,
  KeyRound,
  Brain,
  Stethoscope,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Code2,
  ToggleLeft,
  ToggleRight,
  Search,
  X
} from 'lucide-react'
import { API_BASE } from '../api/client'
import type { SettingsSection } from '../types'
import type { ToastKind } from './ToastStack'

// ── Types ────────────────────────────────────────────────────────────────────

interface SettingsViewProps {
  pushToast: (kind: ToastKind, title: string, detail?: string) => void
}

interface NavItem {
  id: SettingsSection
  label: string
  icon: React.ReactNode
  description: string
}

// ── Settings API helpers (inline, lightweight) ───────────────────────────────

async function fetchJSON(url: string, opts?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, opts)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// ── Navigation Items ─────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: 'general',     label: 'General',       icon: <Settings className="w-3.5 h-3.5" />,     description: 'Core configuration' },
  { id: 'env',         label: 'Environment',   icon: <FileKey className="w-3.5 h-3.5" />,      description: 'Environment variables' },
  { id: 'models',      label: 'Models',        icon: <Cpu className="w-3.5 h-3.5" />,          description: 'LLM providers & models' },
  { id: 'gateway',     label: 'Gateway',       icon: <Radio className="w-3.5 h-3.5" />,        description: 'Messaging daemon' },
  { id: 'credentials', label: 'Credentials',   icon: <KeyRound className="w-3.5 h-3.5" />,     description: 'API key pool' },
  { id: 'memory',      label: 'Memory',        icon: <Brain className="w-3.5 h-3.5" />,        description: 'Persistent memory' },
  { id: 'doctor',      label: 'Doctor',        icon: <Stethoscope className="w-3.5 h-3.5" />,  description: 'System diagnostics' },
]

// ── Credential Providers (known API key env var patterns) ────────────────────

const CREDENTIAL_PROVIDERS = [
  { provider: 'Anthropic',  envKey: 'ANTHROPIC_API_KEY',  icon: '🟠' },
  { provider: 'OpenAI',     envKey: 'OPENAI_API_KEY',     icon: '🟢' },
  { provider: 'DeepSeek',   envKey: 'DEEPSEEK_API_KEY',   icon: '🔵' },
  { provider: 'Google',     envKey: 'GOOGLE_API_KEY',     icon: '🔴' },
  { provider: 'Groq',       envKey: 'GROQ_API_KEY',       icon: '⚡' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// SettingsView — Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export const SettingsView: React.FC<SettingsViewProps> = ({ pushToast }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-[#FAF9F9] dark:bg-[#0F1115] font-body">
      {/* Header */}
      <div className="p-4 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between bg-white dark:bg-[#14161C]">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 font-display">
            <Settings className="w-4 h-4 text-[#F97316]" />
            Settings Hub
          </h2>
          <span className="text-xs text-slate-500">
            System configuration & diagnostics
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sub-Navigation Sidebar */}
        <nav className="w-44 border-r border-[#E7E5E4] dark:border-[#2A2524] bg-white/50 dark:bg-[#14161C]/50 overflow-y-auto py-2 px-2 space-y-0.5 shrink-0">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all text-left ${
                activeSection === item.id
                  ? 'bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/25 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
              }`}
            >
              <span className={activeSection === item.id ? 'text-[#F97316]' : 'text-slate-400'}>{item.icon}</span>
              <div className="flex flex-col min-w-0">
                <span className="truncate">{item.label}</span>
                <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 truncate">{item.description}</span>
              </div>
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'general'     && <GeneralSection pushToast={pushToast} />}
          {activeSection === 'env'         && <EnvSection pushToast={pushToast} />}
          {activeSection === 'models'      && <ModelsSection />}
          {activeSection === 'gateway'     && <GatewaySection />}
          {activeSection === 'credentials' && <CredentialsSection pushToast={pushToast} />}
          {activeSection === 'memory'      && <MemorySection />}
          {activeSection === 'doctor'      && <DoctorSection pushToast={pushToast} />}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: General Config
// ═══════════════════════════════════════════════════════════════════════════════

const GeneralSection: React.FC<{ pushToast: SettingsViewProps['pushToast'] }> = ({ pushToast }) => {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [schema, setSchema] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rawMode, setRawMode] = useState(false)
  const [rawText, setRawText] = useState('')
  const [dirty, setDirty] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [cfgData, schemaData] = await Promise.all([
      fetchJSON(`${API_BASE}/api/config`),
      fetchJSON(`${API_BASE}/api/config/schema`),
    ])
    if (cfgData) {
      setConfig(cfgData)
      setRawText(JSON.stringify(cfgData, null, 2))
    }
    if (schemaData) setSchema(schemaData)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    setSaving(true)
    try {
      const dataToSave = rawMode ? JSON.parse(rawText) : config
      const res = await fetch(`${API_BASE}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      })
      if (res.ok) {
        pushToast('success', 'Configuration saved', 'Settings updated successfully')
        setDirty(false)
        loadData()
      } else {
        const err = await res.json().catch(() => ({}))
        pushToast('error', 'Save failed', err.detail || 'Could not save configuration')
      }
    } catch (e: any) {
      pushToast('error', 'Save failed', e.message || 'Invalid JSON or network error')
    }
    setSaving(false)
  }

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  // Group config keys by category from schema
  const groupedConfig = React.useMemo(() => {
    const groups: Record<string, { key: string; value: any; meta?: any }[]> = {}
    const schemaFields = schema?.fields || schema?.properties || schema || {}

    for (const [key, value] of Object.entries(config)) {
      if (key.startsWith('_')) continue
      const fieldMeta = schemaFields[key]
      const category = fieldMeta?.category || fieldMeta?.group || 'general'
      if (!groups[category]) groups[category] = []

      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchKey = key.toLowerCase().includes(term)
        const matchCat = category.toLowerCase().includes(term)
        const matchVal = String(value).toLowerCase().includes(term)
        if (!matchKey && !matchCat && !matchVal) continue
      }

      groups[category] = groups[category] || []
      groups[category].push({ key, value, meta: fieldMeta })
    }
    return groups
  }, [config, schema, searchTerm])

  if (loading) return <SectionLoader label="Loading configuration..." />

  return (
    <div className="space-y-4 max-w-3xl">
      <SectionHeader
        title="General Configuration"
        description="Core Hermes settings from config.yaml"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRawMode(!rawMode)
                if (!rawMode) setRawText(JSON.stringify(config, null, 2))
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E7E5E4] dark:border-[#2A2524] text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              {rawMode ? 'Form Mode' : 'Raw JSON'}
            </button>
            {dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white transition-all shadow-xs shadow-orange-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            )}
          </div>
        }
      />

      {rawMode ? (
        <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] overflow-hidden">
          <textarea
            value={rawText}
            onChange={e => { setRawText(e.target.value); setDirty(true) }}
            className="w-full h-[500px] p-4 text-xs font-mono bg-transparent text-slate-800 dark:text-slate-200 resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search settings..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-orange-500/50"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Grouped Config Fields */}
          {Object.entries(groupedConfig).sort(([a], [b]) => a.localeCompare(b)).map(([category, fields]) => (
            <div key={category} className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161C]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                  {category}
                </span>
              </div>
              <div className="divide-y divide-[#E7E5E4] dark:divide-[#2A2524]">
                {fields.map(({ key, value, meta }) => (
                  <div key={key} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 font-mono truncate">{key}</div>
                      {meta?.description && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">{meta.description}</div>
                      )}
                    </div>
                    <div className="shrink-0">
                      {typeof value === 'boolean' ? (
                        <button
                          onClick={() => handleConfigChange(key, !value)}
                          className="cursor-pointer text-slate-500 hover:text-[#F97316] transition-colors"
                        >
                          {value ? <ToggleRight className="w-5 h-5 text-[#F97316]" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                      ) : (
                        <input
                          type="text"
                          value={typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
                          onChange={e => handleConfigChange(key, e.target.value)}
                          className="w-48 px-2.5 py-1 text-xs rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#0F1115] text-slate-700 dark:text-slate-300 font-mono focus:outline-none focus:border-orange-500/50"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedConfig).length === 0 && (
            <EmptyState message={searchTerm ? 'No settings match your search' : 'No configuration loaded'} />
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Environment Variables
// ═══════════════════════════════════════════════════════════════════════════════

const EnvSection: React.FC<{ pushToast: SettingsViewProps['pushToast'] }> = ({ pushToast }) => {
  const [envVars, setEnvVars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({})
  const [revealingKey, setRevealingKey] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const loadEnvVars = useCallback(async () => {
    setLoading(true)
    const data = await fetchJSON(`${API_BASE}/api/env`)
    if (data) {
      // The backend returns env vars in various formats — normalize
      const vars = Array.isArray(data) ? data
        : data?.vars ? data.vars
        : data?.env ? Object.entries(data.env).map(([k, v]: any) => ({ key: k, value: v, is_secret: true }))
        : Object.entries(data).filter(([k]) => !k.startsWith('_')).map(([k, v]: any) => ({ key: k, value: typeof v === 'string' ? v : v?.value || '••••••••', is_secret: v?.is_secret ?? true }))
      setEnvVars(vars)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadEnvVars() }, [loadEnvVars])

  const handleReveal = async (key: string) => {
    if (revealedKeys[key]) {
      setRevealedKeys(prev => { const n = { ...prev }; delete n[key]; return n })
      return
    }
    setRevealingKey(key)
    try {
      const res = await fetch(`${API_BASE}/api/env/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      if (res.ok) {
        const data = await res.json()
        const revealed = data?.value || data?.revealed || data?.[key] || ''
        setRevealedKeys(prev => ({ ...prev, [key]: revealed }))
      } else {
        pushToast('error', 'Reveal failed', 'Could not reveal this variable')
      }
    } catch {
      pushToast('error', 'Reveal failed', 'Network error')
    }
    setRevealingKey(null)
  }

  const handleSaveVar = async (key: string, value: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/env`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        pushToast('success', 'Variable saved', `${key} updated successfully`)
        loadEnvVars()
      } else {
        const err = await res.json().catch(() => ({}))
        pushToast('error', 'Save failed', err.detail || 'Could not update variable')
      }
    } catch {
      pushToast('error', 'Save failed', 'Network error')
    }
  }

  const handleDelete = async (key: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/env`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      if (res.ok) {
        pushToast('success', 'Variable removed', `${key} deleted`)
        loadEnvVars()
      } else {
        pushToast('error', 'Delete failed', 'Could not remove variable')
      }
    } catch {
      pushToast('error', 'Delete failed', 'Network error')
    }
  }

  const handleAddNew = async () => {
    if (!newKey.trim()) return
    await handleSaveVar(newKey.trim(), newValue)
    setNewKey('')
    setNewValue('')
    setShowAddForm(false)
  }

  if (loading) return <SectionLoader label="Loading environment variables..." />

  return (
    <div className="space-y-4 max-w-3xl">
      <SectionHeader
        title="Environment Variables"
        description="Manage .env secrets and configuration values"
        actions={
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white transition-all shadow-xs shadow-orange-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Variable
          </button>
        }
      />

      {/* Add New Variable Form */}
      {showAddForm && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 dark:bg-orange-500/10 p-4 space-y-3">
          <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 font-display">New Environment Variable</div>
          <div className="flex gap-3">
            <input
              type="text"
              value={newKey}
              onChange={e => setNewKey(e.target.value.toUpperCase())}
              placeholder="VARIABLE_NAME"
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] text-slate-800 dark:text-slate-200 font-mono placeholder:text-slate-400 focus:outline-none focus:border-orange-500/50"
            />
            <input
              type="text"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="Value"
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] text-slate-800 dark:text-slate-200 font-mono placeholder:text-slate-400 focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setNewKey(''); setNewValue('') }}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNew}
              disabled={!newKey.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </div>
      )}

      {/* Env Variables List */}
      <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] overflow-hidden">
        <div className="divide-y divide-[#E7E5E4] dark:divide-[#2A2524]">
          {envVars.map((v: any) => {
            const key = v.key || v.name || ''
            const displayValue = revealedKeys[key] || v.value || '••••••••'
            const isRevealed = !!revealedKeys[key]

            return (
              <div key={key} className="px-4 py-3 flex items-center gap-4 hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">{key}</div>
                </div>
                <div className="flex items-center gap-2">
                  <code className={`text-xs font-mono px-2.5 py-1 rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#0F1115] ${
                    isRevealed ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 tracking-wider'
                  }`}>
                    {isRevealed ? displayValue : '••••••••••••'}
                  </code>
                  <button
                    onClick={() => handleReveal(key)}
                    disabled={revealingKey === key}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    title={isRevealed ? 'Hide' : 'Reveal'}
                  >
                    {revealingKey === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(key)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Delete variable"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {envVars.length === 0 && (
          <EmptyState message="No environment variables found" />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Models & Providers
// ═══════════════════════════════════════════════════════════════════════════════

const ModelsSection: React.FC = () => {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [endpoints, setEndpoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [cfgData, epData] = await Promise.all([
        fetchJSON(`${API_BASE}/api/config`),
        fetchJSON(`${API_BASE}/api/providers/custom-endpoints`),
      ])
      if (cfgData) setConfig(cfgData)
      if (epData) setEndpoints(Array.isArray(epData) ? epData : epData?.endpoints || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <SectionLoader label="Loading model configuration..." />

  const mainModel = config?.main_model || config?.model || 'Not configured'
  const provider = config?.provider || 'anthropic'

  return (
    <div className="space-y-4 max-w-3xl">
      <SectionHeader
        title="Models & Providers"
        description="LLM provider configuration and custom endpoints"
      />

      {/* Current Model Card */}
      <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] p-4 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Active Model</div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F97316] to-[#FB923C] flex items-center justify-center text-white shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white font-display">{String(mainModel)}</div>
            <div className="text-[11px] text-slate-500 font-mono">Provider: {String(provider)}</div>
          </div>
        </div>
      </div>

      {/* Custom Endpoints */}
      <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161C]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
            Custom Endpoints ({endpoints.length})
          </span>
        </div>
        <div className="divide-y divide-[#E7E5E4] dark:divide-[#2A2524]">
          {endpoints.map((ep: any, i: number) => (
            <div key={ep.id || i} className="px-4 py-3 flex items-center justify-between hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors">
              <div>
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200 font-display">{ep.name || ep.id || `Endpoint ${i + 1}`}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{ep.base_url || ep.url || 'No URL configured'}</div>
              </div>
              <StatusBadge status={ep.active ? 'active' : 'inactive'} />
            </div>
          ))}
          {endpoints.length === 0 && (
            <EmptyState message="No custom endpoints configured" />
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Gateway Controller
// ═══════════════════════════════════════════════════════════════════════════════

const GatewaySection: React.FC = () => {
  const [status, setStatus] = useState<any>(null)
  const [platforms, setPlatforms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadStatus = useCallback(async () => {
    const [statusData, platformData] = await Promise.all([
      fetchJSON(`${API_BASE}/api/status`),
      fetchJSON(`${API_BASE}/api/messaging/platforms`),
    ])
    if (statusData) setStatus(statusData)
    if (platformData) setPlatforms(Array.isArray(platformData) ? platformData : platformData?.platforms || [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleRefresh = () => {
    setRefreshing(true)
    loadStatus()
  }

  if (loading) return <SectionLoader label="Loading gateway status..." />

  const isRunning = status?.gateway?.running ?? status?.running ?? status?.pid != null
  const pid = status?.gateway?.pid ?? status?.pid
  const uptime = status?.gateway?.uptime ?? status?.uptime
  const version = status?.version ?? status?.hermes_version

  return (
    <div className="space-y-4 max-w-3xl">
      <SectionHeader
        title="Gateway Daemon"
        description="Messaging gateway status and connected platforms"
        actions={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E7E5E4] dark:border-[#2A2524] text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* Gateway Status Card */}
      <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
              isRunning
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
            }`}>
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white font-display flex items-center gap-2">
                Gateway Daemon
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                  isRunning
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {isRunning ? 'Online' : 'Offline'}
                </span>
              </div>
              {version && <div className="text-[11px] text-slate-500 font-mono">v{version}</div>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <InfoTile label="PID" value={pid ? String(pid) : '—'} />
          <InfoTile label="Uptime" value={uptime || '—'} />
          <InfoTile label="Platforms" value={String(platforms.length)} />
        </div>
      </div>

      {/* Connected Platforms */}
      <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161C]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
            Connected Platforms
          </span>
        </div>
        <div className="divide-y divide-[#E7E5E4] dark:divide-[#2A2524]">
          {platforms.map((p: any, i: number) => (
            <div key={p.id || i} className="px-4 py-3 flex items-center justify-between hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">{p.type === 'whatsapp' ? '📱' : p.type === 'telegram' ? '✈️' : p.type === 'discord' ? '🎮' : '📡'}</span>
                <div>
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200 font-display">{p.name || p.type || `Platform ${i + 1}`}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{p.type}</div>
                </div>
              </div>
              <StatusBadge status={p.status || (p.connected ? 'connected' : 'disconnected')} />
            </div>
          ))}
          {platforms.length === 0 && (
            <EmptyState message="No messaging platforms connected" />
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Credentials Pool
// ═══════════════════════════════════════════════════════════════════════════════

const CredentialsSection: React.FC<{ pushToast: SettingsViewProps['pushToast'] }> = ({ pushToast }) => {
  const [envVars, setEnvVars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({})
  const [revealingKey, setRevealingKey] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProvider, setNewProvider] = useState(CREDENTIAL_PROVIDERS[0].envKey)
  const [newValue, setNewValue] = useState('')

  const loadCredentials = useCallback(async () => {
    setLoading(true)
    const data = await fetchJSON(`${API_BASE}/api/env`)
    if (data) {
      const vars = Array.isArray(data) ? data
        : data?.vars ? data.vars
        : data?.env ? Object.entries(data.env).map(([k, v]: any) => ({ key: k, value: v, is_secret: true }))
        : Object.entries(data).filter(([k]) => !k.startsWith('_')).map(([k, v]: any) => ({ key: k, value: typeof v === 'string' ? v : v?.value || '••••••••', is_secret: true }))

      // Filter to only known credential keys
      const credKeys = new Set(CREDENTIAL_PROVIDERS.map(p => p.envKey))
      const credVars = vars.filter((v: any) => {
        const key = v.key || v.name || ''
        return credKeys.has(key) || key.includes('API_KEY') || key.includes('SECRET')
      })
      setEnvVars(credVars)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadCredentials() }, [loadCredentials])

  const handleReveal = async (key: string) => {
    if (revealedKeys[key]) {
      setRevealedKeys(prev => { const n = { ...prev }; delete n[key]; return n })
      return
    }
    setRevealingKey(key)
    try {
      const res = await fetch(`${API_BASE}/api/env/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      if (res.ok) {
        const data = await res.json()
        setRevealedKeys(prev => ({ ...prev, [key]: data?.value || data?.revealed || '' }))
      }
    } catch {
      pushToast('error', 'Reveal failed', 'Network error')
    }
    setRevealingKey(null)
  }

  const handleAddCredential = async () => {
    if (!newValue.trim()) return
    try {
      const res = await fetch(`${API_BASE}/api/env`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newProvider, value: newValue }),
      })
      if (res.ok) {
        pushToast('success', 'Credential saved', `${newProvider} updated`)
        setNewValue('')
        setShowAddForm(false)
        loadCredentials()
      } else {
        pushToast('error', 'Save failed', 'Could not save credential')
      }
    } catch {
      pushToast('error', 'Save failed', 'Network error')
    }
  }

  if (loading) return <SectionLoader label="Loading credentials..." />

  return (
    <div className="space-y-4 max-w-3xl">
      <SectionHeader
        title="Credentials & API Keys"
        description="Manage API keys for LLM providers and external services"
        actions={
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white transition-all shadow-xs shadow-orange-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Key
          </button>
        }
      />

      {/* Add Credential Form */}
      {showAddForm && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 dark:bg-orange-500/10 p-4 space-y-3">
          <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 font-display">Add API Key</div>
          <div className="flex gap-3">
            <select
              value={newProvider}
              onChange={e => setNewProvider(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-orange-500/50"
            >
              {CREDENTIAL_PROVIDERS.map(p => (
                <option key={p.envKey} value={p.envKey}>{p.icon} {p.provider}</option>
              ))}
            </select>
            <input
              type="password"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] text-slate-800 dark:text-slate-200 font-mono placeholder:text-slate-400 focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">Cancel</button>
            <button onClick={handleAddCredential} disabled={!newValue.trim()} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white transition-all cursor-pointer disabled:opacity-50">
              <Save className="w-3.5 h-3.5" />
              Save Key
            </button>
          </div>
        </div>
      )}

      {/* Credentials Table */}
      <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] overflow-hidden">
        <div className="divide-y divide-[#E7E5E4] dark:divide-[#2A2524]">
          {CREDENTIAL_PROVIDERS.map(prov => {
            const envVar = envVars.find((v: any) => (v.key || v.name) === prov.envKey)
            const isSet = !!envVar
            const isRevealed = !!revealedKeys[prov.envKey]
            const displayValue = isRevealed ? revealedKeys[prov.envKey] : isSet ? '••••••••••••' : 'Not configured'

            return (
              <div key={prov.envKey} className="px-4 py-3.5 flex items-center gap-4 hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors">
                <span className="text-lg">{prov.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-display">{prov.provider}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{prov.envKey}</div>
                </div>
                <code className={`text-xs font-mono px-2.5 py-1 rounded-lg border border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#0F1115] ${
                  isSet ? (isRevealed ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 tracking-wider') : 'text-slate-300 dark:text-slate-600 italic'
                }`}>
                  {displayValue}
                </code>
                {isSet && (
                  <button
                    onClick={() => handleReveal(prov.envKey)}
                    disabled={revealingKey === prov.envKey}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {revealingKey === prov.envKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
                <StatusBadge status={isSet ? 'active' : 'missing'} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Additional API Keys */}
      {envVars.filter(v => !CREDENTIAL_PROVIDERS.some(p => p.envKey === (v.key || v.name))).length > 0 && (
        <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161C]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Other API Keys
            </span>
          </div>
          <div className="divide-y divide-[#E7E5E4] dark:divide-[#2A2524]">
            {envVars.filter(v => !CREDENTIAL_PROVIDERS.some(p => p.envKey === (v.key || v.name))).map((v: any) => {
              const key = v.key || v.name
              return (
                <div key={key} className="px-4 py-3 flex items-center gap-4 hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors">
                  <span className="text-lg">🔑</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">{key}</div>
                  </div>
                  <StatusBadge status="active" />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Memory Management
// ═══════════════════════════════════════════════════════════════════════════════

const MemorySection: React.FC = () => {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const cfgData = await fetchJSON(`${API_BASE}/api/config`)
      if (cfgData) setConfig(cfgData)
      setLoading(false)
    })()
  }, [])

  if (loading) return <SectionLoader label="Loading memory settings..." />

  const memoryProvider = config?.memory_provider || config?.memory?.provider || 'none'
  const memoryEnabled = config?.memory_enabled ?? config?.memory?.enabled ?? false

  return (
    <div className="space-y-4 max-w-3xl">
      <SectionHeader
        title="Memory Management"
        description="Persistent memory provider configuration"
      />

      {/* Memory Provider Card */}
      <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
            memoryEnabled
              ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
          }`}>
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white font-display flex items-center gap-2">
              Memory Provider
              <StatusBadge status={memoryEnabled ? 'active' : 'inactive'} />
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {String(memoryProvider)} {memoryEnabled ? '(enabled)' : '(disabled)'}
            </div>
          </div>
        </div>

        {/* Memory Config Details */}
        <div className="grid grid-cols-2 gap-3">
          <InfoTile label="Provider" value={String(memoryProvider)} />
          <InfoTile label="Status" value={memoryEnabled ? 'Enabled' : 'Disabled'} />
        </div>
      </div>

      {/* Memory-related config keys */}
      <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161C]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
            Memory Configuration
          </span>
        </div>
        <div className="divide-y divide-[#E7E5E4] dark:divide-[#2A2524]">
          {Object.entries(config)
            .filter(([key]) => key.toLowerCase().includes('memory') || key.toLowerCase().includes('learning') || key.toLowerCase().includes('curator'))
            .map(([key, value]) => (
              <div key={key} className="px-4 py-3 flex items-center justify-between hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors">
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200 font-mono">{key}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {typeof value === 'boolean' ? (value ? '✓ enabled' : '✗ disabled') : String(value ?? '—')}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: System Doctor
// ═══════════════════════════════════════════════════════════════════════════════

const DoctorSection: React.FC<{ pushToast: SettingsViewProps['pushToast'] }> = ({ pushToast }) => {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const runDoctor = async () => {
    setLoading(true)
    setResults(null)

    const [statusData, statsData] = await Promise.all([
      fetchJSON(`${API_BASE}/api/status`),
      fetchJSON(`${API_BASE}/api/system/stats`),
    ])

    if (statsData) setStats(statsData)

    // Derive health checks from status data
    const checks: { name: string; status: 'ok' | 'warning' | 'error'; detail: string }[] = []

    // Backend connectivity
    checks.push({
      name: 'Backend API',
      status: statusData ? 'ok' : 'error',
      detail: statusData ? 'Connected to Hermes backend' : 'Cannot reach backend API',
    })

    // Python runtime
    if (statusData?.python_version || statsData?.python_version) {
      checks.push({ name: 'Python Runtime', status: 'ok', detail: `Python ${statusData?.python_version || statsData?.python_version}` })
    }

    // Hermes version
    if (statusData?.version) {
      checks.push({ name: 'Hermes Version', status: 'ok', detail: `v${statusData.version}` })
    }

    // Gateway
    const gwRunning = statusData?.gateway?.running ?? statusData?.running ?? false
    checks.push({
      name: 'Gateway Daemon',
      status: gwRunning ? 'ok' : 'warning',
      detail: gwRunning ? 'Gateway is running' : 'Gateway is not running',
    })

    // Database
    if (statusData?.db_size || statsData?.db_size) {
      checks.push({ name: 'Database', status: 'ok', detail: `State DB available (${statusData?.db_size || statsData?.db_size})` })
    } else {
      checks.push({ name: 'Database', status: 'ok', detail: 'State DB available' })
    }

    // Active sessions
    if (statusData?.active_sessions != null) {
      checks.push({ name: 'Active Sessions', status: 'ok', detail: `${statusData.active_sessions} active session(s)` })
    }

    // Memory provider
    if (statusData?.memory_provider) {
      checks.push({ name: 'Memory Provider', status: 'ok', detail: `Provider: ${statusData.memory_provider}` })
    }

    // Disk space (from stats)
    if (statsData?.disk_free_gb != null) {
      const freeGb = Number(statsData.disk_free_gb)
      checks.push({
        name: 'Disk Space',
        status: freeGb < 1 ? 'error' : freeGb < 5 ? 'warning' : 'ok',
        detail: `${freeGb.toFixed(1)} GB free`,
      })
    }

    setResults({
      checks,
      overall: checks.some(c => c.status === 'error') ? 'critical'
        : checks.some(c => c.status === 'warning') ? 'warning' : 'healthy',
      timestamp: new Date().toLocaleString(),
    })
    setLoading(false)
    pushToast('info', 'Health check complete', `${checks.length} checks performed`)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <SectionHeader
        title="System Doctor"
        description="Run diagnostics and health checks on Hermes components"
        actions={
          <button
            onClick={runDoctor}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white transition-all shadow-xs shadow-orange-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stethoscope className="w-3.5 h-3.5" />}
            Run Health Check
          </button>
        }
      />

      {!results && !loading && (
        <div className="rounded-2xl border border-dashed border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] p-8 text-center">
          <Stethoscope className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400 font-display">Ready to Diagnose</div>
          <div className="text-xs text-slate-400 mt-1">Click "Run Health Check" to scan all system components</div>
        </div>
      )}

      {loading && <SectionLoader label="Running health checks..." />}

      {results && (
        <>
          {/* Overall Status */}
          <div className={`rounded-2xl border p-5 flex items-center gap-4 ${
            results.overall === 'healthy'
              ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
              : results.overall === 'warning'
              ? 'border-yellow-500/30 bg-yellow-500/5 dark:bg-yellow-500/10'
              : 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10'
          }`}>
            {results.overall === 'healthy' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              : results.overall === 'warning' ? <AlertTriangle className="w-6 h-6 text-yellow-500" />
              : <XCircle className="w-6 h-6 text-rose-500" />}
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white font-display capitalize">{results.overall}</div>
              <div className="text-[11px] text-slate-500">{results.checks.length} checks · {results.timestamp}</div>
            </div>
          </div>

          {/* Check Results */}
          <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] overflow-hidden">
            <div className="divide-y divide-[#E7E5E4] dark:divide-[#2A2524]">
              {results.checks.map((check: any, i: number) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors">
                  {check.status === 'ok' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : check.status === 'warning' ? <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-display">{check.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{check.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Stats */}
          {stats && (
            <div className="rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E7E5E4] dark:border-[#2A2524] bg-slate-50 dark:bg-[#14161C]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                  System Stats
                </span>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(stats).slice(0, 9).map(([key, value]) => (
                  <InfoTile key={key} label={key.replace(/_/g, ' ')} value={String(value ?? '—')} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared UI Components
// ═══════════════════════════════════════════════════════════════════════════════

const SectionHeader: React.FC<{
  title: string
  description: string
  actions?: React.ReactNode
}> = ({ title, description, actions }) => (
  <div className="flex items-center justify-between mb-1">
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-display">{title}</h3>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    {actions && <div className="shrink-0">{actions}</div>}
  </div>
)

const SectionLoader: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Loader2 className="w-6 h-6 text-[#F97316] animate-spin mb-3" />
    <span className="text-xs text-slate-500">{label}</span>
  </div>
)

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="px-4 py-8 text-center">
    <span className="text-xs text-slate-400">{message}</span>
  </div>
)

const InfoTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 dark:bg-[#0F1115] border border-[#E7E5E4] dark:border-[#2A2524] px-3 py-2.5">
    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono mb-1">{label}</div>
    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono truncate">{value}</div>
  </div>
)

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    connected: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    ok: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    disconnected: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    missing: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    error: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono border ${
      styles[status] || styles.inactive
    }`}>
      {status}
    </span>
  )
}
