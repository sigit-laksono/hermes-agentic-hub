/**
 * Agents domain barrel export (Profiles + Skills).
 *
 * Usage (modern pattern):
 *   import { agentsApi } from '../api/agents'
 *   const agents = await agentsApi.getProfiles()
 *
 * Or direct import for best tree-shaking:
 *   import { getProfiles } from '../api/agents/profiles.api'
 */

// Profiles
export {
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
} from './profiles.api'

// Skills
export {
  getProfileSkills,
  toggleProfileSkill,
  getSkillContent,
  toggleSkill,
  getSkills,
  createSkill,
  updateSkillContent,
} from './skills.api'

import * as profiles from './profiles.api'
import * as skills from './skills.api'

export const agentsApi = {
  ...profiles,
  ...skills
}
