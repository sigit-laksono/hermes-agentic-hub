/**
 * Settings domain barrel export.
 *
 * Usage (modern pattern):
 *   import { settingsApi } from '../api/settings'
 *   const config = await settingsApi.getConfig()
 *
 * Or direct import for best tree-shaking:
 *   import { getConfig } from '../api/settings/settings.api'
 */

export {
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
} from './settings.api'

import * as settings from './settings.api'

export const settingsApi = {
  ...settings
}
