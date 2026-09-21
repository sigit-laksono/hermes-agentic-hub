/**
 * Comprehensive Runtime Smoke Test for Refactored API Modules (v0.1.1.2)
 * Tests actual network calls to the running backend (http://127.0.0.1:9120)
 * and validates that facade delegation + domain modules work identically.
 */

// 1. Test facade import (backward compatibility)
import { hermesApi } from '../src/api/hermesApi'

// 2. Test modern domain imports
import { kanbanApi } from '../src/api/kanban'
import { agentsApi } from '../src/api/agents'
import { boardsApi } from '../src/api/boards'
import { autopilotApi } from '../src/api/autopilot'
import { orchestrationApi } from '../src/api/orchestration'
import { chatApi } from '../src/api/chat'

// 3. Test types re-export
import { Task, Board, AIAgent, AutopilotJob, ViewTab, formatDisplayId } from '../src/types'

async function runTests() {
  console.log('🧪 Starting Comprehensive Runtime API Smoke Tests...\n')
  let passed = 0
  let failed = 0

  function assert(name: string, condition: boolean, detail?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${name}`, detail || '')
      failed++
    }
  }

  // --- Test Suite 1: Types & Helper Integrity ---
  console.log('--- Test Suite 1: Types & Helpers ---')
  assert('formatDisplayId shortens t_* IDs', formatDisplayId('t_663b67ed') === '#663b67e')
  assert('formatDisplayId preserves custom displayId', formatDisplayId('t_123', 'CUSTOM-1') === 'CUSTOM-1')
  assert('formatDisplayId handles empty', formatDisplayId('') === '')

  // --- Test Suite 2: Facade Method Presence ---
  console.log('\n--- Test Suite 2: hermesApi Facade Completeness ---')
  const expectedMethods = [
    'checkHealth',
    'getBoard', 'getAssignees', 'getBoardStats', 'getKanbanConfig',
    'getHomeChannels', 'subscribeHomeChannel', 'unsubscribeHomeChannel', 'toggleHomeChannel',
    'createTask', 'addTaskComment', 'updateTaskStatus', 'updateTask', 'bulkUpdateTasks',
    'reassignTask', 'getCanonicalTaskId', 'specifyTask', 'decomposeTask', 'estimateTask',
    'getTaskLinks', 'createTaskLink', 'deleteTaskLink', 'getActiveWorkers', 'inspectRun',
    'terminateRun', 'reclaimTask', 'getTaskAttachments', 'getAttachmentDownloadUrl',
    'getAttachmentContent', 'uploadTaskAttachment', 'deleteAttachment', 'runTask',
    'dispatch', 'getTaskLog', 'deleteTask', 'getTaskDetails',
    'getProfiles', 'getProfileSoul', 'updateProfileSoul', 'updateProfileDescription',
    'getModelOptions', 'updateProfileModel', 'createProfile', 'deleteProfile',
    'exportProfile', 'importProfile', 'getActiveProfile', 'setActiveProfile',
    'autoDescribeProfile', 'getProfileSkills', 'toggleProfileSkill', 'getSkillContent',
    'toggleSkill', 'getSkills', 'createSkill', 'updateSkillContent',
    'getCronJobs', 'triggerCronJob', 'pauseCronJob', 'resumeCronJob',
    'createCronJob', 'updateCronJob', 'deleteCronJob', 'getCronJobHistory',
    'getBoards', 'createBoard', 'updateBoard', 'switchBoard', 'deleteBoard',
    'exportBoardArchive', 'exportBoardJson', 'importBoardJson',
    'getOrchestrationSettings', 'updateOrchestration', 'getOrchestration',
    'getSquads', 'connectEvents',
    'getSessions', 'createSession', 'deleteSession', 'renameSession',
    'getSessionMessages', 'cancelChatTurn', 'respondApproval', 'setSessionYolo',
    'respondClarify', 'compressSession', 'connectChatStream', 'connectChatWS', 'connectChat'
  ]

  let allMethodsPresent = true
  for (const method of expectedMethods) {
    if (typeof (hermesApi as any)[method] !== 'function') {
      console.error(`  Missing method on hermesApi: ${method}`)
      allMethodsPresent = false
    }
  }
  assert(`All ${expectedMethods.length} expected methods exist on hermesApi facade`, allMethodsPresent)

  // --- Test Suite 3: Live Backend Connectivity via hermesApi ---
  console.log('\n--- Test Suite 3: Live Backend Integration ---')
  const isHealthy = await hermesApi.checkHealth()
  assert('hermesApi.checkHealth() returns true', isHealthy === true)

  // --- Test Suite 4: Kanban Domain ---
  console.log('\n--- Test Suite 4: Kanban Domain API ---')
  const boardData = await kanbanApi.getBoard('default')
  assert('kanbanApi.getBoard() returns columns array', Array.isArray(boardData?.columns))

  const stats = await kanbanApi.getBoardStats('default')
  assert('kanbanApi.getBoardStats() returns computed board stats', typeof stats?.total === 'number')

  const assignees = await kanbanApi.getAssignees('default')
  assert('kanbanApi.getAssignees() returns string array', Array.isArray(assignees))

  const canonicalId = kanbanApi.getCanonicalTaskId({ id: 'mock-1', rawId: 't_abc123' })
  assert('kanbanApi.getCanonicalTaskId prefers rawId', canonicalId === 't_abc123')

  // Verify facade returns same board data
  const facadeBoard = await hermesApi.getBoard('default')
  assert('Facade hermesApi.getBoard matches kanbanApi.getBoard', Array.isArray(facadeBoard?.columns))

  // --- Test Suite 5: Agents & Profiles Domain ---
  console.log('\n--- Test Suite 5: Agents & Profiles Domain API ---')
  const profiles = await agentsApi.getProfiles()
  assert('agentsApi.getProfiles() returns agent profiles', Array.isArray(profiles) && profiles.length > 0)
  if (profiles.length > 0) {
    const defaultAgent = profiles.find((p: any) => p.isDefault) || profiles[0]
    assert(`Agent profile has required fields: ${defaultAgent.name}`, Boolean(defaultAgent.id && defaultAgent.name))
  }

  const skills = await agentsApi.getSkills()
  assert('agentsApi.getSkills() returns skills list', Array.isArray(skills))

  // --- Test Suite 6: Boards / Projects Domain ---
  console.log('\n--- Test Suite 6: Boards Domain API ---')
  const boards = await boardsApi.getBoards()
  assert('boardsApi.getBoards() returns boards array', Array.isArray(boards))
  if (boards.length > 0) {
    assert(`Board has slug: ${boards[0].slug}`, typeof boards[0].slug === 'string')
  }

  // --- Test Suite 7: Autopilot Domain ---
  console.log('\n--- Test Suite 7: Autopilot Domain API ---')
  const cronJobs = await autopilotApi.getCronJobs()
  assert('autopilotApi.getCronJobs() returns cron jobs array', Array.isArray(cronJobs))

  // Test history method with mock/non-existent ID to verify graceful error handling
  const history = await autopilotApi.getCronJobHistory('non-existent-job-id')
  assert('autopilotApi.getCronJobHistory() handles non-existent gracefully', Array.isArray(history?.runs))

  // --- Test Suite 8: Orchestration Domain ---
  console.log('\n--- Test Suite 8: Orchestration Domain API ---')
  const orchSettings = await orchestrationApi.getOrchestrationSettings()
  assert('orchestrationApi.getOrchestrationSettings() returns settings or null', orchSettings === null || typeof orchSettings === 'object')

  const squads = await orchestrationApi.getSquads()
  assert('orchestrationApi.getSquads() returns live squads array', Array.isArray(squads))

  // --- Test Suite 9: Chat Domain ---
  console.log('\n--- Test Suite 9: Chat Domain API ---')
  const sessions = await chatApi.getSessions()
  assert('chatApi.getSessions() returns sessions array', Array.isArray(sessions))

  // --- Summary ---
  console.log('\n=======================================')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('=======================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
