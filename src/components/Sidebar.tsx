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
  unreadInboxCount: number
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewIssue,
  unreadInboxCount
}) => {
  const navItemClass = (tab: ViewTab) =>
    `flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
      activeTab === tab
        ? 'bg-slate-200 dark:bg-slate-800/80 text-slate-900 dark:text-white font-semibold'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
    }`

  return (
    <aside className="w-56 h-screen flex flex-col border-r border-slate-200 dark:border-[#23272F] bg-slate-50 dark:bg-[#111317] select-none text-slate-700 dark:text-slate-300">
      {/* Workspace Header */}
      <div className="p-3 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            D
          </div>
          <span className="font-semibold text-xs tracking-tight text-slate-900 dark:text-white">
            DikstraCloud
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200" />
      </div>

      {/* Quick Actions */}
      <div className="p-2 space-y-1">
        <button
          onClick={() => {}}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs bg-slate-200/60 dark:bg-[#181B21] text-slate-500 dark:text-slate-400 border border-slate-300/60 dark:border-[#282C36] hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search...</span>
          </div>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-300/60 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400">
            Ctrl K
          </kbd>
        </button>

        <button
          onClick={onOpenNewIssue}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/40 font-medium transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            <span>New Issue</span>
          </div>
          <kbd className="text-[10px] px-1 rounded bg-blue-200/60 dark:bg-blue-900 font-mono">C</kbd>
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
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500 text-white font-semibold">
                {unreadInboxCount}
              </span>
            )}
          </div>

          <div
            onClick={() => onSelectTab('my_issues')}
            className={navItemClass('my_issues')}
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>My Issues</span>
            </div>
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
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Autopilot</span>
            </div>
          </div>
        </div>

        {/* AI Team */}
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-[#23272F] flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-medium text-[11px] text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Hermes Agentic Hub</span>
        </div>
        <HelpCircle className="w-3.5 h-3.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200" />
      </div>
    </aside>
  )
}
