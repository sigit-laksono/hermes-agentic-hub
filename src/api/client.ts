/// <reference types="vite/client" />
/**
 * Shared API client utilities for Hermes Agentic Hub.
 * Domain modules (kanban/, autopilot/, chat/, etc.) import API_BASE from here
 * instead of duplicating the env-var logic.
 */

export const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_HERMES_API_URL) ||
  (typeof process !== 'undefined' && (process.env?.VITE_HERMES_API_URL || process.env?.HERMES_API_URL)) ||
  ''

// "45s" / "12m" / "3h 20m" — used for the oldest-ready age badge (stuck-dispatcher signal).
export function formatAge(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s'
  if (seconds < 60) return `${Math.floor(seconds)}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
}
