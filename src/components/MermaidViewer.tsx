import React, { useEffect, useState, useRef } from 'react'
import mermaid from 'mermaid'
import {
  Workflow,
  Code2,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  AlertCircle,
  Download
} from 'lucide-react'

interface MermaidViewerProps {
  code: string
  className?: string
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({
  code,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'diagram' | 'code'>('diagram')
  const [svgHtml, setSvgHtml] = useState<string>('')
  const [renderError, setRenderError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect dark theme
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  useEffect(() => {
    let isMounted = true

    const renderDiagram = async () => {
      const cleanCode = (code || '').trim()
      if (!cleanCode) {
        setSvgHtml('')
        setRenderError(null)
        return
      }

      // Generate a fresh unique DOM ID for this render to avoid clashes between multiple diagrams
      const renderId = 'mm_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36)

      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          suppressErrorRendering: true,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          theme: isDark ? 'dark' : 'neutral',
          themeVariables: isDark
            ? {
                darkMode: true,
                background: '#14161C',
                primaryColor: '#1E232B',
                primaryTextColor: '#F3F4F6',
                primaryBorderColor: '#F97316',
                lineColor: '#FB923C',
                secondaryColor: '#2A2524',
                tertiaryColor: '#14161C',
                mainBkg: '#191C21',
                nodeBorder: '#F97316',
                clusterBkg: '#14161C',
                clusterBorder: '#2A2524',
                titleColor: '#F3F4F6',
                edgeLabelBackground: '#191C21',
                actorBkg: '#1E232B',
                actorBorder: '#F97316',
                actorTextColor: '#F3F4F6',
                actorLineColor: '#FB923C',
                signalColor: '#FB923C',
                signalTextColor: '#F3F4F6',
                labelBoxBkgColor: '#191C21',
                labelBoxBorderColor: '#F97316',
                labelTextColor: '#F3F4F6',
                loopTextColor: '#F3F4F6',
                noteBorderColor: '#F97316',
                noteBkgColor: '#1E232B',
                noteTextColor: '#F3F4F6'
              }
            : {
                darkMode: false,
                background: '#FFFFFF',
                primaryColor: '#FFF7ED',
                primaryTextColor: '#111827',
                primaryBorderColor: '#F97316',
                lineColor: '#F97316',
                mainBkg: '#FFF7ED',
                nodeBorder: '#F97316'
              }
        })

        // Check if syntax parses cleanly before attempting to render
        try {
          const isValid = await mermaid.parse(cleanCode, { suppressErrors: true })
          if (isValid === false) {
            return
          }
        } catch {
          // Partial/incomplete code while LLM is still streaming
          return
        }

        const { svg } = await mermaid.render(renderId, cleanCode)

        if (isMounted) {
          setSvgHtml(svg)
          setRenderError(null)
          setViewMode('diagram')
        }
      } catch (err: any) {
        if (isMounted) {
          // Clean up this specific render element if left in DOM
          if (typeof document !== 'undefined') {
            document.getElementById(renderId)?.remove()
            document.getElementById(`d${renderId}`)?.remove()
          }
          setRenderError(err?.message || 'Invalid Mermaid syntax')
          // Auto switch to code view if diagram fails
          setViewMode('code')
        }
      }
    }

    renderDiagram()

    return () => {
      isMounted = false
    }
  }, [code, isDark])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadSvg = () => {
    if (!svgHtml) return
    const blob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diagram-${Date.now()}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.2, 2.5))
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.2, 0.4))
  const handleResetZoom = () => setZoomLevel(1)

  return (
    <div
      className={`my-3 rounded-2xl border border-[#E7E5E4] dark:border-[#2A2524] bg-white dark:bg-[#14161C] overflow-hidden shadow-xs font-body ${
        isFullscreen ? 'fixed inset-4 z-50 flex flex-col shadow-2xl bg-white dark:bg-[#0F1115]' : ''
      } ${className}`}
    >
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-[#191C21] border-b border-[#E7E5E4] dark:border-[#2A2524] select-none text-xs">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-[#F97316]" />
          <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-[11px] tracking-wide">
            Mermaid Diagram
          </span>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-200/80 dark:bg-black/40 p-0.5 rounded-lg ml-2 border border-[#E7E5E4]/80 dark:border-[#2A2524]">
            <button
              onClick={() => setViewMode('diagram')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                viewMode === 'diagram'
                  ? 'bg-white dark:bg-[#191C21] text-orange-600 dark:text-[#FB923C] shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Preview</span>
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                viewMode === 'code'
                  ? 'bg-white dark:bg-[#191C21] text-orange-600 dark:text-[#FB923C] shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3 h-3" />
              <span>Code</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls when in diagram mode */}
          {viewMode === 'diagram' && svgHtml && (
            <div className="hidden sm:flex items-center gap-1 mr-1 text-slate-500">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 rounded cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono w-8 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 rounded cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {zoomLevel !== 1 && (
                <button
                  onClick={handleResetZoom}
                  className="p-1 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 rounded cursor-pointer"
                  title="Reset zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Download SVG */}
          {svgHtml && viewMode === 'diagram' && (
            <button
              onClick={handleDownloadSvg}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
              title="Download SVG Diagram"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit fullscreen' : 'Expand diagram'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Copy Mermaid Code */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
            title="Copy Mermaid Code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className={`overflow-auto ${isFullscreen ? 'flex-1 p-6' : 'p-4 max-h-[550px]'}`}>
        {viewMode === 'diagram' ? (
          renderError ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Could not render visual diagram (syntax may be incomplete while streaming).</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {renderError}
              </p>
              <div className="mt-2 text-[11px] text-slate-400">
                Click <strong>Code</strong> tab to inspect the Mermaid source text.
              </div>
            </div>
          ) : svgHtml ? (
            <div
              ref={containerRef}
              className="flex items-center justify-center min-h-[160px] transition-transform duration-150 origin-center"
              style={{ transform: `scale(${zoomLevel})` }}
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Workflow className="w-4 h-4 animate-pulse text-[#F97316]" />
              <span>Generating diagram preview...</span>
            </div>
          )
        ) : (
          /* Code View */
          <div className="relative font-mono text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0F1115] p-3 rounded-xl border border-[#E7E5E4] dark:border-[#2A2524] overflow-x-auto">
            <pre className="whitespace-pre leading-relaxed">{code}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
