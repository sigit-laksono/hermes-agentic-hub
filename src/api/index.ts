/**
 * Root API Client Entrypoint — Hermes Agentic Hub
 *
 * Exposes both modern domain-specific API clients and a backward-compatible
 * hermesApi facade.
 */

export * from './client'
export * from './kanban'
export * from './agents'
export * from './boards'
export * from './orchestration'
export * from './autopilot'
export * from './chat'

export { hermesApi } from './hermesApi'
