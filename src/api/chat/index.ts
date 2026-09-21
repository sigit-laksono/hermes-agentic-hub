/**
 * Chat Domain Barrel Export — Hermes Agentic Hub
 */

export * from './sessions.api'
export * from './streaming.api'

import * as sessionOps from './sessions.api'
import * as streamingOps from './streaming.api'

export const chatApi = {
  ...sessionOps,
  ...streamingOps
}
