import React, { useEffect } from 'react'
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

export type ToastKind = 'error' | 'success' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  /** Short headline, e.g. "Cannot move to Ready". */
  title: string
  /** Optional detail — typically the backend's `detail` message. */
  detail?: string
}

interface ToastStackProps {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

// Errors stay until dismissed: a refused transition names the blocking parent, and that
// text is the whole point of showing it. Success/info self-dismiss.
const AUTO_DISMISS_MS: Record<ToastKind, number | null> = {
  error: null,
  success: 4000,
  info: 6000
}

const Toast: React.FC<{ toast: ToastItem; onDismiss: (id: number) => void }> = ({
  toast,
  onDismiss
}) => {
  useEffect(() => {
    const ms = AUTO_DISMISS_MS[toast.kind]
    if (ms === null) return
    const timer = setTimeout(() => onDismiss(toast.id), ms)
    return () => clearTimeout(timer)
  }, [toast.id, toast.kind, onDismiss])

  const accent =
    toast.kind === 'error'
      ? 'border-rose-500/30 bg-rose-50 dark:bg-[#251A1D]'
      : toast.kind === 'success'
      ? 'border-emerald-500/30 bg-emerald-50 dark:bg-[#16251D]'
      : 'border-orange-500/30 bg-orange-50 dark:bg-[#1F1813]'

  const Icon =
    toast.kind === 'error' ? AlertTriangle : toast.kind === 'success' ? CheckCircle2 : Info

  const iconColor =
    toast.kind === 'error'
      ? 'text-rose-500 dark:text-rose-400'
      : toast.kind === 'success'
      ? 'text-emerald-500 dark:text-emerald-400'
      : 'text-[#F97316] dark:text-[#FB923C]'

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto w-full rounded-2xl border shadow-2xl px-4 py-3 flex items-start gap-2.5 text-xs animate-in slide-in-from-right-4 font-body ${accent}`}
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 dark:text-slate-100">{toast.title}</div>
        {toast.detail && (
          <div className="mt-0.5 text-slate-600 dark:text-slate-400 break-words max-h-32 overflow-y-auto">
            {toast.detail}
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))] pointer-events-none">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
