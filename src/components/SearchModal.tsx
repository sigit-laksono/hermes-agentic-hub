import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, CheckSquare, FolderGit2, Bot, Wrench, CornerDownLeft } from 'lucide-react'
import { Task, Project, AIAgent, Skill, ViewTab } from '../types'

interface SearchResult {
  key: string
  label: string
  sublabel?: string
  icon: React.ReactNode
  tab: ViewTab
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  tasks: Task[]
  projects: Project[]
  agents: AIAgent[]
  skills: Skill[]
  onNavigate: (tab: ViewTab) => void
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  agents,
  skills,
  onNavigate
}) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state whenever the modal opens.
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      // Focus after paint.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const out: SearchResult[] = []

    tasks
      .filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.displayId && t.displayId.toLowerCase().includes(q))
      )
      .slice(0, 6)
      .forEach(t =>
        out.push({
          key: `task-${t.id}`,
          label: t.title,
          sublabel: `${t.displayId || t.id} · ${t.projectName}`,
          icon: <CheckSquare className="w-3.5 h-3.5 text-slate-400" />,
          tab: 'issues'
        })
      )

    projects
      .filter(p => p.name.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(p =>
        out.push({
          key: `proj-${p.id}`,
          label: p.name,
          sublabel: `Project · ${p.status}`,
          icon: <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />,
          tab: 'projects'
        })
      )

    agents
      .filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(a =>
        out.push({
          key: `agent-${a.id}`,
          label: a.name,
          sublabel: `Agent · ${a.runtime}`,
          icon: <Bot className="w-3.5 h-3.5 text-purple-400" />,
          tab: 'agents'
        })
      )

    skills
      .filter(s => s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(s =>
        out.push({
          key: `skill-${s.id}`,
          label: s.name,
          sublabel: s.description ? s.description.slice(0, 60) : 'Skill',
          icon: <Wrench className="w-3.5 h-3.5 text-slate-400" />,
          tab: 'skills'
        })
      )

    return out
  }, [query, tasks, projects, agents, skills])

  // Keep the active index within bounds when results change.
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!isOpen) return null

  const choose = (r: SearchResult) => {
    onNavigate(r.tab)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[activeIndex]
      if (r) choose(r)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-xs p-4 pt-[12vh] font-body"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[#E7E5E4] dark:border-[#2A2524]">
          <Search className="w-4 h-4 text-[#F97316]" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search issues, projects, agents, skills..."
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#2A2524] font-mono text-slate-500">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {query.trim() === '' ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400 font-body">
              Type to search across your workspace
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400 font-body">
              No results for “{query}”
            </div>
          ) : (
            results.map((r, idx) => (
              <button
                key={r.key}
                onClick={() => choose(r)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                  idx === activeIndex
                    ? 'bg-orange-500/10 dark:bg-orange-950/30 border-l-2 border-[#F97316]'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 border-l-2 border-transparent'
                }`}
              >
                <span className="shrink-0">{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                    {r.label}
                  </div>
                  {r.sublabel && (
                    <div className="text-[11px] text-slate-400 truncate font-mono">{r.sublabel}</div>
                  )}
                </div>
                {idx === activeIndex && (
                  <CornerDownLeft className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
