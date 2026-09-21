import { useState, useEffect, useCallback } from 'react'
import { hermesApi } from '../api/hermesApi'

export const useBackendHealth = (pollIntervalMs = 30000) => {
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false)

  const checkHealth = useCallback(async () => {
    const isHealthy = await hermesApi.checkHealth()
    setIsBackendConnected(isHealthy)
    return isHealthy
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, pollIntervalMs)
    return () => clearInterval(interval)
  }, [checkHealth, pollIntervalMs])

  return {
    isBackendConnected,
    setIsBackendConnected,
    checkHealth
  }
}
