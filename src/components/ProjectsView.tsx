import React from 'react'
import { FolderGit2, Plus, Search, Filter } from 'lucide-react'
import { Project } from '../types'

interface ProjectsViewProps {
  projects: Project[]
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ projects }) => {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-white dark:bg-[#0D0F12]">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-blue-500" />
            Projects
            <span className="text-xs font-normal text-slate-400">({projects.length})</span>
          </h2>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs">
          <Plus className="w-3.5 h-3.5" />
          <span>New project</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between text-xs bg-slate-50/50 dark:bg-[#111317]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              className="pl-8 pr-3 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#16191E] text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
            <Filter className="w-3 h-3" />
            Filter
          </button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#23272F] bg-slate-50 dark:bg-[#14171D] text-slate-500">
              <th className="py-2.5 px-4 font-medium">Name</th>
              <th className="py-2.5 px-4 font-medium">Status</th>
              <th className="py-2.5 px-4 font-medium">Priority</th>
              <th className="py-2.5 px-4 font-medium">Progress</th>
              <th className="py-2.5 px-4 font-medium">Lead</th>
              <th className="py-2.5 px-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-[#1F232B]">
            {projects.map(proj => (
              <tr
                key={proj.id}
                className="hover:bg-slate-50 dark:hover:bg-[#16191E] transition-colors cursor-pointer"
              >
                <td className="py-3 px-4 font-medium text-slate-900 dark:text-white flex items-center gap-2.5">
                  <span className="text-amber-500">📁</span>
                  <span>{proj.name}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium capitalize bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {proj.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {proj.priority === 'none' ? '— No priority' : proj.priority}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${
                            proj.progressTotal > 0
                              ? (proj.progressDone / proj.progressTotal) * 100
                              : 0
                          }%`
                        }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {proj.progressDone}/{proj.progressTotal}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span>{proj.leadAvatar || '👤'}</span>
                    <span>{proj.lead}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                  {proj.createdAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
