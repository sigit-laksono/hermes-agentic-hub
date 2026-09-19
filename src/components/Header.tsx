import React from 'react'
import {
  Sun,
  Moon,
  Monitor,
  Filter,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { ViewTab } from '../types'

interface HeaderProps {
  activeTab: ViewTab
  viewMode: 'board' | 'list'
  onToggleViewMode: (mode: 'board' | 'list') => void
  activeWorkersCount: number
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
  activeWorkersCount
}) => {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light')
    else if (theme === 'light') setTheme('system')
    else setTheme('dark')
  }

  return (
    <header className="h-12 border-b border-slate-200 dark:border-[#23272F] bg-white dark:bg-[#14171D] px-4 flex items-center justify-between select-none">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 dark:text-slate-500">DikstraCloud</span>
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

        {/* View Mode Toggle (Board / List) */}
        {(activeTab === 'issues' || activeTab === 'my_issues') && (
          <div className="flex items-center p-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => onToggleViewMode('board')}
              title="Kanban Board"
              className={`p-1 rounded text-xs ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onToggleViewMode('list')}
              title="Table List"
              className={`p-1 rounded text-xs ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
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
