/**
 * Kanban Task Attachments API — Hermes Agentic Hub
 * Upload, preview, download, and remove task deliverables.
 */

import { API_BASE } from '../client'
import { TaskAttachment } from '../../types'

// Get deliverables / attachments for a specific task
export async function getTaskAttachments(taskId: string, board?: string): Promise<TaskAttachment[]> {
  try {
    const query = board ? `?board=${encodeURIComponent(board)}` : ''
    const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}/attachments${query}`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.attachments || []
  } catch {
    return []
  }
}

// Get direct download URL for an attachment
export function getAttachmentDownloadUrl(attachmentId: number, board?: string): string {
  const query = board ? `?board=${encodeURIComponent(board)}` : ''
  return `${API_BASE}/api/plugins/kanban/attachments/${attachmentId}${query}`
}

// Fetch raw text content of an attachment (for inline code/spec preview)
export async function getAttachmentContent(attachmentId: number, board?: string): Promise<string> {
  try {
    const url = getAttachmentDownloadUrl(attachmentId, board)
    const res = await fetch(url)
    if (!res.ok) return ''
    return res.text()
  } catch {
    return ''
  }
}

// Upload an attachment to a task
export async function uploadTaskAttachment(
  taskId: string,
  file: File,
  uploadedBy = 'user',
  board?: string
): Promise<{ ok: boolean; attachment?: TaskAttachment; message?: string }> {
  try {
    const params = new URLSearchParams()
    if (uploadedBy) params.set('uploaded_by', uploadedBy)
    if (board) params.set('board', board)
    const query = params.toString() ? `?${params.toString()}` : ''

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_BASE}/api/plugins/kanban/tasks/${taskId}/attachments${query}`, {
      method: 'POST',
      body: formData
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, message: err.detail || res.statusText }
    }
    const data = await res.json()
    return { ok: true, attachment: data.attachment || data }
  } catch (err: any) {
    return { ok: false, message: err.message || 'Failed to upload attachment' }
  }
}

// Delete an attachment
export async function deleteAttachment(attachmentId: number, board?: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const query = board ? `?board=${encodeURIComponent(board)}` : ''
    const res = await fetch(`${API_BASE}/api/plugins/kanban/attachments/${attachmentId}${query}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, message: err.detail || res.statusText }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, message: err.message || 'Failed to delete attachment' }
  }
}
