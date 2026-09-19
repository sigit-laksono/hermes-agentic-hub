import React from 'react'
import { Bot, Users, Wrench, Plus, Crown } from 'lucide-react'
import { AIAgent, Squad, Skill } from '../types'

export const AgentsView: React.FC<{ agents: AIAgent[] }> = ({ agents }) => {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-white dark:bg-[#0D0F12]">
      <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-500" />
            Agents
            <span className="text-xs font-normal text-slate-400">({agents.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AI teammates backed by isolated Hermes profiles.
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white shadow-xs">
          <Plus className="w-3.5 h-3.5" /> New agent
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#23272F] bg-slate-50 dark:bg-[#14171D] text-slate-500">
              <th className="py-2.5 px-4 font-medium">Agent</th>
              <th className="py-2.5 px-4 font-medium">Status</th>
              <th className="py-2.5 px-4 font-medium">Owner</th>
              <th className="py-2.5 px-4 font-medium">Runtime</th>
              <th className="py-2.5 px-4 font-medium">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-[#1F232B]">
            {agents.map(a => (
              <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-[#16191E]">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{a.avatar || '🤖'}</span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{a.name}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{a.description}</div>
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
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${a.status === 'busy' ? 'animate-pulse' : ''}`} /> {s.label}
                      </span>
                    )
                  })()}
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{a.owner}</td>
                <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{a.runtime}</td>
                <td className="py-3 px-4 text-slate-400">{a.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const SquadsView: React.FC<{ squads: Squad[] }> = ({ squads }) => {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-white dark:bg-[#0D0F12]">
      <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            Squads
            <span className="text-xs font-normal text-slate-400">({squads.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-agent orchestrators: Lead decomposes and routes to specialist members.
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
          <Plus className="w-3.5 h-3.5" /> New Squad
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#23272F] bg-slate-50 dark:bg-[#14171D] text-slate-500">
              <th className="py-2.5 px-4 font-medium">Squad</th>
              <th className="py-2.5 px-4 font-medium">Leader</th>
              <th className="py-2.5 px-4 font-medium">Members</th>
              <th className="py-2.5 px-4 font-medium">Created By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-[#1F232B]">
            {squads.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#16191E]">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>👥</span> {s.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{s.description}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 font-medium">
                    <Crown className="w-3 h-3 text-amber-500" /> {s.leader}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {s.members.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center ring-2 ring-white dark:ring-[#14171D]">
                          🤖
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium font-mono">+{s.memberCount}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{s.createdBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const SkillsView: React.FC<{ skills: Skill[] }> = ({ skills }) => {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-white dark:bg-[#0D0F12]">
      <div className="p-4 border-b border-slate-200 dark:border-[#23272F] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-500" />
            Skills
            <span className="text-xs font-normal text-slate-400">({skills.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Instructions and capabilities any agent in this workspace can use.
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
          <Plus className="w-3.5 h-3.5" /> New skill
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#23272F] bg-slate-50 dark:bg-[#14171D] text-slate-500">
              <th className="py-2.5 px-4 font-medium">Skill</th>
              <th className="py-2.5 px-4 font-medium">Category</th>
              <th className="py-2.5 px-4 font-medium">Status</th>
              <th className="py-2.5 px-4 font-medium">Usage</th>
              <th className="py-2.5 px-4 font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-[#1F232B]">
            {skills.map(sk => (
              <tr key={sk.id} className="hover:bg-slate-50 dark:hover:bg-[#16191E] align-top">
                <td className="py-2.5 px-4">
                  <div className="font-mono font-medium text-blue-600 dark:text-blue-400">{sk.name}</div>
                  {sk.description && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 max-w-md">
                      {sk.description}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-4">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                    {sk.category || 'uncategorized'}
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  {sk.enabled ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Disabled
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {sk.usage ?? 0}×
                </td>
                <td className="py-2.5 px-4">
                  <span className="text-[11px] text-slate-500 capitalize">{sk.provenance || 'agent'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
