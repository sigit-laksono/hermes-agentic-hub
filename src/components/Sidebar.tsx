import React from 'react'
import {
  Inbox,
  CheckSquare,
  MessageSquare,
  Layers,
  FolderGit2,
  Zap,
  Bot,
  Users,
  Wrench,
  Settings,
  Search,
  Plus,
  HelpCircle,
  ChevronDown
} from 'lucide-react'
import { ViewTab } from '../types'

interface SidebarProps {
  activeTab: ViewTab
  onSelectTab: (tab: ViewTab) => void
  onOpenNewIssue: () => void
  onOpenSearch: () => void
  unreadInboxCount: number
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewIssue,
  onOpenSearch,
  unreadInboxCount
}) => {
  const navItemClass = (tab: ViewTab) =>
    `flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
      activeTab === tab
        ? 'bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/25 font-semibold shadow-2xs'
        : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
    }`

  return (
    <aside className="w-56 h-screen flex flex-col border-r border-[#E7E5E4] dark:border-[#2A2524] bg-[#FAF9F9] dark:bg-[#14161B] select-none text-slate-700 dark:text-slate-300 font-body">
      {/* Workspace Header */}
      <div className="p-3 border-b border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#F97316] flex items-center justify-center text-white font-bold text-xs shadow-xs">
            A
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-xs tracking-tight text-slate-900 dark:text-white font-display">
              Aura Hub
            </span>
            <span className="text-[10px] text-slate-400 font-mono -mt-0.5">
              DikstraCloud
            </span>
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200" />
      </div>

      {/* Quick Actions */}
      <div className="p-2 space-y-1.5">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#191C21] text-slate-500 dark:text-slate-400 border border-[#E7E5E4] dark:border-[#2A2524] hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-colors shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search...</span>
          </div>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#2A2524] font-mono text-slate-600 dark:text-slate-400">
            Ctrl K
          </kbd>
        </button>

        <button
          onClick={onOpenNewIssue}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 font-medium transition-all shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            <span>New Issue</span>
          </div>
          <kbd className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 font-mono">C</kbd>
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
        {/* Personal */}
        <div className="space-y-0.5">
          <div
            onClick={() => onSelectTab('inbox')}
            className={navItemClass('inbox')}
          >
            <div className="flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5 text-slate-500" />
              <span>Inbox</span>
            </div>
            {unreadInboxCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#F97316] text-white font-semibold">
                {unreadInboxCount}
              </span>
            )}
          </div>

          <div
            onClick={() => onSelectTab('my_issues')}
            className={navItemClass('my_issues')}
            title="My Issues (Press B for Board, T for Table)"
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>My Issues</span>
            </div>
            <kbd className="text-[9px] px-1 rounded bg-slate-200/70 dark:bg-[#2A2524] font-mono text-slate-400">
              B
            </kbd>
          </div>

          <div
            onClick={() => onSelectTab('chat')}
            className={navItemClass('chat')}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>Chat</span>
            </div>
          </div>
        </div>

        {/* Work */}
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
            Work
          </div>
          <div
            onClick={() => onSelectTab('issues')}
            className={navItemClass('issues')}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Issues</span>
            </div>
          </div>

          <div
            onClick={() => onSelectTab('projects')}
            className={navItemClass('projects')}
          >
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Projects</span>
            </div>
          </div>

          <div
            onClick={() => onSelectTab('autopilot')}
            className={navItemClass('autopilot')}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Autopilot</span>
            </div>
          </div>
        </div>

        {/* AI Team */}
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
            AI Team
          </div>
          <div
            onClick={() => onSelectTab('agents')}
            className={navItemClass('agents')}
          >
            <div className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>Agents</span>
            </div>
          </div>

          <div
            onClick={() => onSelectTab('squads')}
            className={navItemClass('squads')}
          >
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Squads</span>
            </div>
          </div>

          <div
            onClick={() => onSelectTab('skills')}
            className={navItemClass('skills')}
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-slate-400" />
              <span>Skills</span>
            </div>
          </div>

          <div
            onClick={() => onSelectTab('settings')}
            className={navItemClass('settings')}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint Bar */}
      <div className="px-3 py-2 border-t border-[#E7E5E4] dark:border-[#2A2524] text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between select-none font-mono">
        <span className="flex items-center gap-1 text-[10px]">
          <kbd className="px-1 py-0.2 rounded bg-slate-200/70 dark:bg-[#2A2524] text-slate-600 dark:text-slate-300">B</kbd> Board
          <span>•</span>
          <kbd className="px-1 py-0.2 rounded bg-slate-200/70 dark:bg-[#2A2524] text-slate-600 dark:text-slate-300">T</kbd> Table
        </span>
        <span className="flex items-center gap-1 text-[10px]">
          <kbd className="px-1 py-0.2 rounded bg-slate-200/70 dark:bg-[#2A2524] text-slate-600 dark:text-slate-300">Esc</kbd> Close
        </span>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#E7E5E4] dark:border-[#2A2524] flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-medium text-[11px] text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-[#F97316] shadow-xs shadow-orange-500/50 animate-pulse" />
          <span>Aura Assistant</span>
        </div>
        <HelpCircle className="w-3.5 h-3.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200" />
      </div>
    </aside>
  )
}
