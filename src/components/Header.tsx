import React, { useState, useRef, useEffect } from 'react'
import {
  Sun,
  Moon,
  Monitor,
  Filter,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  FolderGit2,
  ChevronDown,
  Check,
  Plus
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { ViewTab, Board } from '../types'

interface HeaderProps {
  activeTab: ViewTab
  viewMode: 'board' | 'list'
  onToggleViewMode: (mode: 'board' | 'list') => void
  activeWorkersCount: number
  boards?: Board[]
  activeBoard?: string
  onSelectBoard?: (slug: string) => void
  onNewBoard?: () => void
}

const tabTitles: Record<ViewTab, string> = {
  my_issues: 'My Issues',
  inbox: 'Inbox',
  chat: 'Chat',
  issues: 'Issues',
  projects: 'Projects',
  autopilot: 'Autopilot',
  agents: 'Agents',
  squads: 'Squads',
  skills: 'Skills',
  settings: 'Settings'
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  viewMode,
  onToggleViewMode,
  activeWorkersCount,
  boards = [],
  activeBoard = 'default',
  onSelectBoard,
  onNewBoard
}) => {
  const { theme, setTheme } = useTheme()
  const [isBoardDropdownOpen, setIsBoardDropdownOpen] = useState(false)
  const boardDropdownRef = useRef<HTMLDivElement>(null)

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light')
    else if (theme === 'light') setTheme('system')
    else setTheme('dark')
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (boardDropdownRef.current && !boardDropdownRef.current.contains(event.target as Node)) {
        setIsBoardDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentBoard = boards.find(b => b.slug === activeBoard) || {
    slug: activeBoard,
    name: activeBoard === 'default' ? 'Default Board' : activeBoard,
    total: 0
  }

  return (
    <header className="h-12 border-b border-slate-200 dark:border-[#23272F] bg-white dark:bg-[#14171D] px-4 flex items-center justify-between select-none">
      {/* Breadcrumb / Title & Board Switcher */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 dark:text-slate-500 font-medium">DikstraCloud</span>
        <span className="text-slate-300 dark:text-slate-600">/</span>

        {/* Global Board Switcher Dropdown */}
        <div className="relative" ref={boardDropdownRef}>
          <button
            onClick={() => setIsBoardDropdownOpen(!isBoardDropdownOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-[#1A1D24] hover:bg-slate-200/80 dark:hover:bg-[#222630] text-slate-800 dark:text-white border border-slate-200 dark:border-[#282D37] transition-all cursor-pointer shadow-2xs group"
            title="Switch Active Kanban Board"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="max-w-[150px] truncate">{currentBoard.name}</span>
            {currentBoard.total !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 font-semibold">
                {currentBoard.total}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isBoardDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isBoardDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-[#282D37] bg-white dark:bg-[#16191E] shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-[#20242D] flex items-center justify-between">
                <span>Kanban Boards</span>
                <span className="font-mono font-normal">{boards.length} total</span>
              </div>

              <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-100/60 dark:divide-[#20242D]/60">
                {boards.map(b => {
                  const isSelected = b.slug === activeBoard
                  return (
                    <button
                      key={b.slug}
                      onClick={() => {
                        if (onSelectBoard) onSelectBoard(b.slug)
                        setIsBoardDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#1C2028] transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderGit2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                        <div className="truncate">
                          <div className="truncate font-medium">{b.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{b.slug}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {b.total !== undefined && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {b.total}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-500" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              {onNewBoard && (
                <div className="pt-1 mt-1 border-t border-slate-100 dark:border-[#20242D] px-1">
                  <button
                    onClick={() => {
                      setIsBoardDropdownOpen(false)
                      onNewBoard()
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Board</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <span className="text-slate-300 dark:text-slate-600">/</span>
        <h1 className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
          {tabTitles[activeTab]}
        </h1>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-3">
        {/* Live Active Agents Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-[#282D37] text-slate-700 dark:text-slate-300">
          <span className={`w-2 h-2 rounded-full ${activeWorkersCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`} />
          <Sparkles className="w-3 h-3 text-blue-500" />
          <span className="font-medium">{activeWorkersCount} agents working</span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Filter Button */}
        <button className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter</span>
        </button>

        {/* Display Config */}
        <button className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Display</span>
        </button>

        {/* View Mode Toggle (Board / List) with B / T shortcuts (Fase 5: TASK-5.3) */}
        {(activeTab === 'issues' || activeTab === 'my_issues') && (
          <div className="flex items-center p-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => onToggleViewMode('board')}
              title="Kanban Board view (Shortcut: B)"
              className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <kbd className="text-[9px] px-1 rounded bg-slate-200/70 dark:bg-slate-800 font-mono text-slate-500 dark:text-slate-400">
                B
              </kbd>
            </button>
            <button
              onClick={() => onToggleViewMode('list')}
              title="Table List view (Shortcut: T)"
              className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <kbd className="text-[9px] px-1 rounded bg-slate-200/70 dark:bg-slate-800 font-mono text-slate-500 dark:text-slate-400">
                T
              </kbd>
            </button>
          </div>
        )}

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Theme Switcher Button */}
        <button
          onClick={cycleTheme}
          title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
          className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs"
        >
          {theme === 'dark' && <Moon className="w-3.5 h-3.5 text-blue-400" />}
          {theme === 'light' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
          {theme === 'system' && <Monitor className="w-3.5 h-3.5 text-purple-400" />}
          <span className="capitalize text-[11px] font-medium hidden sm:inline">{theme}</span>
        </button>
      </div>
    </header>
  )
}
