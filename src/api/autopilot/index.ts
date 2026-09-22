/**
 * Autopilot domain barrel export.
 *
 * Usage (modern pattern):
 *   import { autopilotApi } from '../api/autopilot'
 *   const jobs = await autopilotApi.getCronJobs()
 *
 * Or direct import for best tree-shaking:
 *   import { getCronJobs } from '../api/autopilot/cron.api'
 */

export {
  getCronJobs,
  getCronJobHistory,
  triggerCronJob,
  pauseCronJob,
  resumeCronJob,
  createCronJob,
  updateCronJob,
  deleteCronJob,
} from './cron.api'

import * as cron from './cron.api'

export const autopilotApi = {
  ...cron
}
