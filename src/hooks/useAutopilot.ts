import { useState, useCallback } from 'react'
import { AutopilotJob } from '../types'
import { hermesApi } from '../api/hermesApi'
import { ToastKind } from '../components/ToastStack'

interface UseAutopilotProps {
  activeBoard: string
  loadLiveData: (board?: string) => Promise<void>
  pushToast: (kind: ToastKind, title: string, detail?: string) => void
}

export const useAutopilot = ({
  activeBoard,
  loadLiveData,
  pushToast
}: UseAutopilotProps) => {
  const [autopilots, setAutopilots] = useState<AutopilotJob[]>([])
  const [isNewAutopilotOpen, setIsNewAutopilotOpen] = useState(false)
  const [editingAutopilot, setEditingAutopilot] = useState<AutopilotJob | null>(null)
  const [historyJobId, setHistoryJobId] = useState<string | null>(null)

  const handleRunAutopilot = useCallback(async (jobId: string) => {
    const ok = await hermesApi.triggerCronJob(jobId)
    if (ok) {
      // Refresh so last_run/next_run reflect the manual trigger.
      loadLiveData()
    } else {
      console.warn('Failed to trigger cron job:', jobId)
      pushToast('error', 'Could not run autopilot', `Job ${jobId} failed to trigger.`)
    }
  }, [loadLiveData, pushToast])

  const handleToggleAutopilot = useCallback(async (jobId: string, current: 'active' | 'paused') => {
    // Optimistic flip
    setAutopilots(prev =>
      prev.map(j => (j.id === jobId ? { ...j, status: current === 'active' ? 'paused' : 'active' } : j))
    )
    const ok =
      current === 'active'
        ? await hermesApi.pauseCronJob(jobId)
        : await hermesApi.resumeCronJob(jobId)
    if (!ok) {
      // Revert on failure
      setAutopilots(prev =>
        prev.map(j => (j.id === jobId ? { ...j, status: current } : j))
      )
    } else {
      loadLiveData()
    }
  }, [loadLiveData])

  const handleEditAutopilot = useCallback((job: AutopilotJob) => {
    setEditingAutopilot(job)
    setIsNewAutopilotOpen(true)
  }, [])

  const handleUpdateAutopilot = useCallback(async (jobId: string, params: {
    name: string
    schedule: string
    prompt?: string
    profile: string
  }) => {
    const updatePayload: any = {
      name: params.name,
      schedule: params.schedule,
      profile: params.profile
    }

    if (params.prompt && params.prompt.trim()) {
      updatePayload.prompt = params.prompt
    }

    const ok = await hermesApi.updateCronJob(jobId, updatePayload)
    if (ok) {
      pushToast('success', 'Autopilot updated', `Job "${params.name}" has been updated successfully.`)
      loadLiveData()
      return true
    } else {
      pushToast('error', 'Update failed', 'Could not update autopilot job.')
      return false
    }
  }, [loadLiveData, pushToast])

  const handleDeleteAutopilot = useCallback(async (jobId: string) => {
    const ok = await hermesApi.deleteCronJob(jobId)
    if (ok) {
      pushToast('success', 'Autopilot deleted', 'Job has been removed from scheduler.')
      loadLiveData()
    } else {
      pushToast('error', 'Delete failed', 'Could not delete autopilot job.')
    }
  }, [loadLiveData, pushToast])

  const handleViewHistory = useCallback((jobId: string) => {
    setHistoryJobId(jobId)
  }, [])

  const handleCreateAutopilot = useCallback(async (params: {
    name: string
    schedule: string
    prompt: string
    profile: string
  }): Promise<boolean> => {
    const ok = await hermesApi.createCronJob(params)
    if (ok) loadLiveData(activeBoard)
    return ok
  }, [activeBoard, loadLiveData])

  return {
    autopilots,
    setAutopilots,
    isNewAutopilotOpen,
    setIsNewAutopilotOpen,
    editingAutopilot,
    setEditingAutopilot,
    historyJobId,
    setHistoryJobId,
    handleRunAutopilot,
    handleToggleAutopilot,
    handleEditAutopilot,
    handleUpdateAutopilot,
    handleDeleteAutopilot,
    handleViewHistory,
    handleCreateAutopilot
  }
}
