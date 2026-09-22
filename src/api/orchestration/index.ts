/**
 * Orchestration & Squad domain barrel export.
 *
 * Usage:
 *   import { orchestrationApi } from '../api/orchestration'
 *   const squads = await orchestrationApi.getSquads()
 */

export {
  getOrchestrationSettings,
  updateOrchestration,
  getOrchestration,
  getSquads,
  connectEvents,
} from './orchestration.api'

import * as orchestration from './orchestration.api'

export const orchestrationApi = {
  ...orchestration
}
