/**
 * Kanban Home Channel Notifications API — Hermes Agentic Hub
 * Subscriptions for external messaging platforms (Discord, Slack, Telegram, etc.)
 */

import { API_BASE } from '../client'
import { HomeChannel } from '../../types'
import { getCanonicalTaskId } from './tasks.api'

// 1f. Home Channel Notifications (Fase 2: TASK-2.6)
//
// GET /home-channels returns { home_channels: [{ platform, chat_id, thread_id, name,
// subscribed }] } — the list key is `home_channels` (not `channels`) and the label field
// is `name`. Only platforms that actually have a home channel configured are listed, so
// an empty array means "nothing configured", not "request failed": inventing a default
// Telegram/WhatsApp/Discord/Slack list advertised platforms that cannot be subscribed to.
export async function getHomeChannels(taskId?: string, board?: string): Promise<HomeChannel[]> {
  const params = new URLSearchParams()
  if (taskId) params.append('task_id', getCanonicalTaskId(taskId))
  if (board) params.append('board', board)
  const queryString = params.toString() ? `?${params.toString()}` : ''

  try {
    const res = await fetch(`${API_BASE}/api/plugins/kanban/home-channels${queryString}`)
    if (!res.ok) return []
    const data = await res.json()
    const list = Array.isArray(data) ? data : data?.home_channels || []
    return list.map((c: any) => ({
      platform: String(c?.platform || ''),
      label: c?.name || c?.label || String(c?.platform || ''),
      // Listed at all => a home channel is configured for this platform.
      enabled: true,
      subscribed: Boolean(c?.subscribed)
    })).filter((c: HomeChannel) => c.platform)
  } catch (err) {
    console.warn('Failed to fetch home channels:', err)
    return []
  }
}

// Both toggles previously ended with `return { success: true }` even on a 404 ("No home
// channel configured for platform X"), so the switch flipped on while nothing was
// subscribed. Report the real outcome and let the caller revert.
export async function subscribeHomeChannel(
  taskId: string,
  platform: string,
  board?: string
): Promise<{ success: boolean; message?: string }> {
  return toggleHomeChannel(taskId, platform, 'POST', board)
}

export async function unsubscribeHomeChannel(
  taskId: string,
  platform: string,
  board?: string
): Promise<{ success: boolean; message?: string }> {
  return toggleHomeChannel(taskId, platform, 'DELETE', board)
}

export async function toggleHomeChannel(
  taskId: string,
  platform: string,
  method: 'POST' | 'DELETE',
  board?: string
): Promise<{ success: boolean; message?: string }> {
  const canonicalId = getCanonicalTaskId(taskId)
  const query = board ? `?board=${encodeURIComponent(board)}` : ''
  const verb = method === 'POST' ? 'subscribe to' : 'unsubscribe from'
  try {
    const res = await fetch(
      `${API_BASE}/api/plugins/kanban/tasks/${canonicalId}/home-subscribe/${encodeURIComponent(platform)}${query}`,
      { method }
    )
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: data?.ok !== false, message: data?.message }
    }
    const err = await res.json().catch(() => ({} as any))
    return {
      success: false,
      message: err?.detail || `Failed to ${verb} ${platform}: ${res.statusText}`
    }
  } catch (err: any) {
    console.warn(`Failed to ${verb} ${platform}:`, err)
    return { success: false, message: err?.message || `Failed to ${verb} ${platform}` }
  }
}
