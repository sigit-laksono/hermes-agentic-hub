/**
 * Kanban Domain Barrel Export — Hermes Agentic Hub
 */

export * from './board.api'
export * from './tasks.api'
export * from './ai-actions.api'
export * from './links.api'
export * from './workers.api'
export * from './attachments.api'
export * from './channels.api'

import * as boardOps from './board.api'
import * as taskOps from './tasks.api'
import * as aiOps from './ai-actions.api'
import * as linkOps from './links.api'
import * as workerOps from './workers.api'
import * as attachOps from './attachments.api'
import * as channelOps from './channels.api'

export const kanbanApi = {
  ...boardOps,
  ...taskOps,
  ...aiOps,
  ...linkOps,
  ...workerOps,
  ...attachOps,
  ...channelOps
}
