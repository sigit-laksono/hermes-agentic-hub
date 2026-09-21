import React, { useState, useRef, useEffect } from 'react'
import {
  Sun,
  Moon,
  Filter,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  FolderGit2,
  ChevronDown,
  Check,
  Plus,
  Clock
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { ViewTab, Board, BoardStats } from '../types'

interface HeaderProps {
  activeTab: ViewTab
  viewMode: 'board' | 'list'
  onToggleViewMode: (mode: 'board' | 'list') => void
  activeWorkersCount: number
  boards?: Board[]
  activeBoard?: string
  boardStats?: BoardStats
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
  boardStats,
  onSelectBoard,
  onNewBoard
}) => {
  const { isDark, toggleTheme } = useTheme()
  const [isBoardDropdownOpen, setIsBoardDropdownOpen] = useState(false)
  const boardDropdownRef = useRef<HTMLDivElement>(null)

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
    <header className="h-12 border-b border-[#E7E5E4] dark:border-[#2A2524] bg-white/90 dark:bg-[#14171D]/90 backdrop-blur-md px-4 flex items-center justify-between select-none font-body">
      {/* Breadcrumb / Title & Board Switcher */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 dark:text-slate-500 font-medium">Aura</span>
        <span className="text-slate-300 dark:text-slate-600">/</span>

        {/* Global Board Switcher Dropdown */}
        <div className="relative" ref={boardDropdownRef}>
          <button
            onClick={() => setIsBoardDropdownOpen(!isBoardDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-[#191C21] hover:bg-slate-100 dark:hover:bg-[#22262E] text-slate-800 dark:text-white border border-[#E7E5E4] dark:border-[#2A2524] hover:border-orange-500/40 transition-all cursor-pointer shadow-2xs group"
            title="Switch Active Kanban Board"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
            <span className="max-w-[150px] truncate">{currentBoard.name}</span>
            {currentBoard.total !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold">
                {currentBoard.total}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isBoardDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isBoardDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#191C21] shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between font-mono">
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
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderGit2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#F97316]' : 'text-slate-400'}`} />
                        <div className="truncate">
                          <div className="truncate font-medium">{b.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{b.slug}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {b.total !== undefined && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-[#2A2524] text-slate-500">
                            {b.total}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#F97316]" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              {onNewBoard && (
                <div className="pt-1 mt-1 border-t border-[#E7E5E4] dark:border-[#2A2524] px-1">
                  <button
                    onClick={() => {
                      setIsBoardDropdownOpen(false)
                      onNewBoard()
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
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
        <h1 className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5 font-display text-sm">
          {tabTitles[activeTab]}
        </h1>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-3">
        {/* Live Active Agents Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524] text-slate-700 dark:text-slate-300 shadow-2xs">
          <span className={`w-2 h-2 rounded-full ${activeWorkersCount > 0 ? 'bg-[#F97316] animate-pulse shadow-xs shadow-orange-500/50' : 'bg-slate-400 dark:bg-slate-500'}`} />
          <Sparkles className="w-3 h-3 text-[#F97316]" />
          <span className="font-medium">{activeWorkersCount} agents working</span>
        </div>

        {/* Board Stats Oldest Ready Age / Stuck Detector (Fase 2: TASK-2.3) */}
        {boardStats &&
          (activeTab === 'my_issues' || activeTab === 'issues') &&
          boardStats.oldestReadyAgeSeconds !== undefined && (
            <div
              className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${
                boardStats.oldestReadyAgeSeconds > 900
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-green-500/10 border-green-500/20 text-green-400'
              }`}
              title="Oldest waiting ready task age (dispatcher monitor)"
            >
              <Clock className="w-3 h-3" />
              <span>Ready age: {boardStats.oldestReadyAgeFormatted}</span>
            </div>
          )}

        <div className="h-4 w-px bg-slate-200 dark:bg-[#2A2524]" />

        {/* Filter Button */}
        <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter</span>
        </button>

        {/* Display Config */}
        <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Display</span>
        </button>

        {/* View Mode Toggle (Board / List) with B / T shortcuts (Fase 5: TASK-5.3) */}
        {(activeTab === 'issues' || activeTab === 'my_issues') && (
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#191C21] border border-[#E7E5E4] dark:border-[#2A2524]">
            <button
              onClick={() => onToggleViewMode('board')}
              title="Kanban Board view (Shortcut: B)"
              className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-[#2A2524] text-orange-600 dark:text-orange-400 shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <kbd className="text-[9px] px-1 rounded bg-slate-200/70 dark:bg-[#14171D] font-mono text-slate-500 dark:text-slate-400">
                B
              </kbd>
            </button>
            <button
              onClick={() => onToggleViewMode('list')}
              title="Table List view (Shortcut: T)"
              className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#2A2524] text-orange-600 dark:text-orange-400 shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <kbd className="text-[9px] px-1 rounded bg-slate-200/70 dark:bg-[#14171D] font-mono text-slate-500 dark:text-slate-400">
                T
              </kbd>
            </button>
          </div>
        )}

        <div className="h-4 w-px bg-slate-200 dark:bg-[#2A2524]" />

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          title={`Currently in ${isDark ? 'Dark' : 'Light'} Mode (Click to switch)`}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs cursor-pointer font-mono"
        >
          {isDark ? (
            <>
              <Moon className="w-3.5 h-3.5 text-[#FB923C]" />
              <span className="capitalize text-[11px] font-medium hidden sm:inline">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-[#F97316]" />
              <span className="capitalize text-[11px] font-medium hidden sm:inline">Light</span>
            </>
          )}
        </button>
      </div>
    </header>
  )
}
