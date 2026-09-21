import { useState, useCallback } from 'react'
import { ToastItem, ToastKind } from '../components/ToastStack'

export const useToasts = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const pushToast = useCallback((kind: ToastKind, title: string, detail?: string) => {
    setToasts(prev => {
      // Collapse an identical repeat (e.g. dragging the same card twice) instead of stacking.
      if (prev.some(t => t.kind === kind && t.title === title && t.detail === detail)) {
        return prev
      }
      const next = [...prev, { id: Date.now() + Math.random(), kind, title, detail }]
      // Keep the stack bounded so a burst of failures can't cover the board.
      return next.slice(-4)
    })
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return {
    toasts,
    pushToast,
    dismissToast
  }
}
