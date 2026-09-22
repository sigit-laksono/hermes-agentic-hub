/// <reference types="vite/client" />
/**
 * Hermes Agent Live API Client (Facade)
 * Communicates with the local Hermes harness bridge (http://127.0.0.1:9120)
 *
 * NOTE: Refactored in v0.1.1.2 Phase 2 into domain-based modules:
 *   - src/api/kanban/        (board, tasks, ai-actions, links, workers, attachments, channels)
 *   - src/api/agents/        (profiles, skills)
 *   - src/api/boards/        (boards/projects)
 *   - src/api/orchestration/ (orchestration settings, squads, event stream)
 *   - src/api/autopilot/     (cron jobs)
 *   - src/api/chat/          (sessions, SSE/WS streaming)
 *
 * This file delegates all methods to domain modules for 100% backward compatibility.
 */

import { API_BASE } from './client'

// ── Domain Imports ───────────────────────────────────────────────────────────
import {
  getBoard,
  getAssignees,
  getBoardStats,
  getKanbanConfig,
  getHomeChannels,
  subscribeHomeChannel,
  unsubscribeHomeChannel,
  toggleHomeChannel,
  createTask,
  addTaskComment,
  updateTaskStatus,
  updateTask,
  bulkUpdateTasks,
  reassignTask,
  getCanonicalTaskId,
  specifyTask,
  decomposeTask,
  estimateTask,
  getTaskLinks,
  createTaskLink,
  deleteTaskLink,
  getActiveWorkers,
  inspectRun,
  terminateRun,
  reclaimTask,
  getTaskAttachments,
  getAttachmentDownloadUrl,
  getAttachmentContent,
  uploadTaskAttachment,
  deleteAttachment,
  runTask,
  dispatch,
  getTaskLog,
  deleteTask,
  getTaskDetails,
} from './kanban'

import {
  getProfiles,
  getProfileSoul,
  updateProfileSoul,
  updateProfileDescription,
  getModelOptions,
  updateProfileModel,
  createProfile,
  deleteProfile,
  exportProfile,
  importProfile,
  getActiveProfile,
  setActiveProfile,
  autoDescribeProfile,
  getProfileSkills,
  toggleProfileSkill,
  getSkillContent,
  toggleSkill,
  getSkills,
  createSkill,
  updateSkillContent,
} from './agents'

import {
  getBoards,
  createBoard,
  updateBoard,
  switchBoard,
  deleteBoard,
  exportBoardArchive,
  exportBoardJson,
  importBoardJson,
} from './boards'

import {
  getOrchestrationSettings,
  updateOrchestration,
  getOrchestration,
  getSquads,
  connectEvents,
} from './orchestration'

import {
  getCronJobs,
  getCronJobHistory,
  triggerCronJob,
  pauseCronJob,
  resumeCronJob,
  createCronJob,
  updateCronJob,
  deleteCronJob,
} from './autopilot'

import {
  getSessions,
  createSession,
  deleteSession,
  renameSession,
  getSessionMessages,
  cancelChatTurn,
  respondApproval,
  setSessionYolo,
  respondClarify,
  compressSession,
  connectChatStream,
  connectChatWS,
  connectChat,
  ChatSocketHandlers,
  ChatSocketController,
} from './chat'

import {
  getConfig,
  getConfigSchema,
  getConfigDefaults,
  updateConfig,
  getEnvVars,
  updateEnvVar,
  deleteEnvVar,
  revealEnvVar,
  getSystemStatus,
  getSystemStats,
  getMessagingPlatforms,
  getCustomEndpoints,
} from './settings'

// Re-export chat socket types for backward compatibility (e.g. ChatView.tsx)
export type { ChatSocketHandlers, ChatSocketController }

export const hermesApi = {
  // Check health
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/health`)
      return res.ok
    } catch {
      return false
    }
  },

  // 1. Kanban Board & Tasks
  getBoard,
  getAssignees,
  getBoardStats,
  getKanbanConfig,
  getHomeChannels,
  subscribeHomeChannel,
  unsubscribeHomeChannel,
  toggleHomeChannel,
  createTask,
  addTaskComment,
  updateTaskStatus,
  updateTask,
  bulkUpdateTasks,
  reassignTask,
  getCanonicalTaskId,
  specifyTask,
  decomposeTask,
  estimateTask,
  getTaskLinks,
  createTaskLink,
  deleteTaskLink,
  getActiveWorkers,
  inspectRun,
  terminateRun,
  reclaimTask,
  getTaskAttachments,
  getAttachmentDownloadUrl,
  getAttachmentContent,
  uploadTaskAttachment,
  deleteAttachment,
  runTask,
  dispatch,
  getTaskLog,
  deleteTask,
  getTaskDetails,

  // 2. Profiles (Agents & Skills)
  getProfiles,
  getProfileSoul,
  updateProfileSoul,
  updateProfileDescription,
  getModelOptions,
  updateProfileModel,
  createProfile,
  deleteProfile,
  exportProfile,
  importProfile,
  getActiveProfile,
  setActiveProfile,
  autoDescribeProfile,
  getProfileSkills,
  toggleProfileSkill,
  getSkillContent,
  toggleSkill,
  getSkills,
  createSkill,
  updateSkillContent,

  // 3. Autopilot (Hermes Cron Jobs)
  getCronJobs,
  triggerCronJob,
  pauseCronJob,
  resumeCronJob,
  createCronJob,
  updateCronJob,
  deleteCronJob,
  getCronJobHistory,

  // 4. Boards (Projects)
  getBoards,
  createBoard,
  updateBoard,
  switchBoard,
  deleteBoard,
  exportBoardArchive,
  exportBoardJson,
  importBoardJson,

  // 5. Orchestration & Live Events
  getOrchestrationSettings,
  updateOrchestration,
  getOrchestration,
  getSquads,
  connectEvents,

  // 6. Chat & Live Sessions
  getSessions,
  createSession,
  deleteSession,
  renameSession,
  getSessionMessages,
  cancelChatTurn,
  respondApproval,
  setSessionYolo,
  respondClarify,
  compressSession,
  connectChatStream,
  connectChatWS,
  connectChat,

  // 7. Settings & System Config
  getConfig,
  getConfigSchema,
  getConfigDefaults,
  updateConfig,
  getEnvVars,
  updateEnvVar,
  deleteEnvVar,
  revealEnvVar,
  getSystemStatus,
  getSystemStats,
  getMessagingPlatforms,
  getCustomEndpoints,
}
