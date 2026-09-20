import React, { useState, useEffect, useRef } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  X,
  FileImage,
  Sun,
  Moon
} from 'lucide-react'

interface ImageDiagramPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  title?: string
  fileSize?: number
  downloadUrl?: string
}

export const ImageDiagramPreviewModal: React.FC<ImageDiagramPreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Architecture Diagram Preview',
  fileSize,
  downloadUrl
}) => {
  const [zoom, setZoom] = useState<number>(100)
  const [contrastMode, setContrastMode] = useState<'dark' | 'light' | 'checkered'>('dark')
  const [isPanning, setIsPanning] = useState(false)
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset zoom & pan when opening a new image
  useEffect(() => {
    if (isOpen) {
      setZoom(100)
      setPanPosition({ x: 0, y: 0 })
    }
  }, [isOpen, imageUrl])

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      } else if (e.key === '+' || e.key === '=') {
        setZoom(prev => Math.min(prev + 25, 400))
      } else if (e.key === '-') {
        setZoom(prev => Math.max(prev - 25, 25))
      } else if (e.key === '0') {
        setZoom(100)
        setPanPosition({ x: 0, y: 0 })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 400))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25))
  const handleResetZoom = () => {
    setZoom(100)
    setPanPosition({ x: 0, y: 0 })
  }

  // Pan / drag mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 100) return
    setIsPanning(true)
    startPanRef.current = {
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    setPanPosition({
      x: e.clientX - startPanRef.current.x,
      y: e.clientY - startPanRef.current.y
    })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      if (e.deltaY < 0) {
        handleZoomIn()
      } else {
        handleZoomOut()
      }
    }
  }

  const isSvg = title.toLowerCase().endsWith('.svg') || imageUrl.toLowerCase().includes('.svg')

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-5xl h-[88vh] flex flex-col rounded-2xl border border-slate-700/80 bg-[#12151B] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header Controls */}
        <div className="px-4 py-3 border-b border-[#23272F] flex items-center justify-between bg-[#161920] select-none">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileImage className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-xs text-white truncate max-w-md" title={title}>
                  {title}
                </h3>
                {isSvg && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                    VECTOR SVG
                  </span>
                )}
              </div>
              {fileSize !== undefined && fileSize > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {(fileSize / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          </div>

          {/* Center Toolbar: Zoom, Contrast, Reset */}
          <div className="flex items-center gap-1.5 bg-[#0E1116] border border-[#23272F] p-1 rounded-xl shadow-xs">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 25}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-mono font-semibold text-slate-200 px-2 min-w-[50px] text-center select-none">
              {zoom}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={zoom >= 400}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-0.5" />

            <button
              onClick={handleResetZoom}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              title="Reset Zoom (0)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Fit</span>
            </button>

            <div className="h-4 w-px bg-slate-800 mx-0.5" />

            {/* Contrast Mode for transparent SVGs */}
            <button
              onClick={() => {
                if (contrastMode === 'dark') setContrastMode('light')
                else if (contrastMode === 'light') setContrastMode('checkered')
                else setContrastMode('dark')
              }}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              title={`Background Canvas: ${contrastMode.toUpperCase()}`}
            >
              {contrastMode === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-blue-400" />
              ) : contrastMode === 'light' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <div className="w-3.5 h-3.5 border border-slate-500 bg-[linear-gradient(45deg,#333_25%,transparent_25%),linear-gradient(-45deg,#333_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#333_75%),linear-gradient(-45deg,transparent_75%,#333_75%)] bg-[size:6px_6px] rounded-xs" />
              )}
            </button>
          </div>

          {/* Right Action: Download & Close */}
          <div className="flex items-center gap-2">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={title}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1E232E] hover:bg-[#282F3E] text-slate-200 hover:text-white border border-[#2D3443] transition-colors cursor-pointer"
                title="Download architecture file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image / Diagram Canvas Workspace */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`flex-1 overflow-auto flex items-center justify-center p-6 select-none relative ${
            contrastMode === 'dark'
              ? 'bg-[#08090C]'
              : contrastMode === 'light'
              ? 'bg-[#F8FAFC]'
              : 'bg-[#15181E] bg-[radial-gradient(#2A303C_1px,transparent_1px)] bg-[size:16px_16px]'
          } ${zoom > 100 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        >
          <div
            style={{
              transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom / 100})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.15s ease-out'
            }}
            className="flex items-center justify-center max-w-full max-h-full"
          >
            <img
              src={imageUrl}
              alt={title}
              draggable={false}
              className={`rounded-lg shadow-2xl transition-all max-h-[75vh] max-w-[85vw] object-contain ${
                contrastMode === 'light'
                  ? 'border border-slate-300 bg-white p-4'
                  : 'border border-slate-800/80 bg-[#0F1218]/90 p-3'
              }`}
            />
          </div>

          {/* Canvas Bottom Floating Hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-xs border border-white/10 text-[11px] text-slate-400 select-none pointer-events-none flex items-center gap-2">
            <span>Scroll or +/- to Zoom</span>
            <span>•</span>
            <span>Drag to Pan</span>
            <span>•</span>
            <kbd className="px-1 py-0.2 rounded bg-white/10 font-mono text-[10px]">Esc</kbd>
            <span>to Close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
