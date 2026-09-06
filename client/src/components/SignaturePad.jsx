import React, { useCallback, useEffect, useRef, useState } from 'react'

const applyStrokeStyle = (ctx) => {
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#161210'
}

/**
 * Wipe every device pixel, then restore the CSS-pixel drawing transform.
 * Must not clear using CSS size while a DPR scale transform is active — that
 * leaves ink artifacts (especially along the bottom edge on high-DPI screens).
 */
const wipeBackingStore = (ctx, dpr) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  applyStrokeStyle(ctx)
  ctx.beginPath()
}

/**
 * Lightweight browser signature pad — no external dependency.
 * Optional `value` (data URL) restores a previously captured signature (draft recovery).
 */
const SignaturePad = ({ onChange, value = '', className = '', disabled = false }) => {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const lastPoint = useRef(null)
  const dprRef = useRef(1)
  const layoutRef = useRef({ width: 0, height: 0, dpr: 0 })
  const hasInkRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const externalValueRef = useRef('')
  const [hasInk, setHasInk] = useState(false)
  const [canvasReady, setCanvasReady] = useState(0)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    hasInkRef.current = hasInk
  }, [hasInk])

  const paintDataUrl = useCallback((dataUrl) => {
    const canvas = canvasRef.current
    if (!canvas || !dataUrl?.startsWith?.('data:image')) return false
    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    const img = new Image()
    img.onload = () => {
      const dpr = dprRef.current || window.devicePixelRatio || 1
      wipeBackingStore(ctx, dpr)
      const { width, height } = layoutRef.current
      ctx.drawImage(img, 0, 0, width || canvas.clientWidth, height || 160)
      hasInkRef.current = true
      setHasInk(true)
      externalValueRef.current = dataUrl
    }
    img.src = dataUrl
    return true
  }, [])

  const setupCanvas = useCallback(({ force = false } = {}) => {
    const canvas = canvasRef.current
    if (!canvas) return false
    const parent = canvas.parentElement
    const ratio = window.devicePixelRatio || 1
    const width = Math.max(1, Math.floor(parent?.clientWidth || 320))
    const height = 160
    const prev = layoutRef.current
    if (
      !force
      && prev.width === width
      && prev.height === height
      && prev.dpr === ratio
    ) {
      return false
    }

    dprRef.current = ratio
    layoutRef.current = { width, height, dpr: ratio }

    // Re-allocating the buffer resets context state and clears all pixels.
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    wipeBackingStore(ctx, ratio)
    return true
  }, [])

  const resetSignatureState = useCallback(() => {
    drawing.current = false
    lastPoint.current = null
    hasInkRef.current = false
    setHasInk(false)
    externalValueRef.current = ''
    onChangeRef.current?.('')
  }, [])

  useEffect(() => {
    setupCanvas({ force: true })
    setCanvasReady((n) => n + 1)

    let frame = 0
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const hadInk = hasInkRef.current
        const saved = externalValueRef.current || (hadInk ? canvasRef.current?.toDataURL?.('image/png') : '')
        const changed = setupCanvas()
        if (!changed) return
        if (saved?.startsWith?.('data:image')) {
          paintDataUrl(saved)
        } else if (hadInk) {
          resetSignatureState()
        } else {
          drawing.current = false
          lastPoint.current = null
        }
      })
    }

    const parent = canvasRef.current?.parentElement
    window.addEventListener('resize', onResize)
    const ro = parent && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(onResize)
      : null
    if (parent && ro) ro.observe(parent)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
    }
  }, [setupCanvas, resetSignatureState, paintDataUrl])

  useEffect(() => {
    if (!value) {
      if (externalValueRef.current && !hasInkRef.current) {
        externalValueRef.current = ''
      }
      return
    }
    if (value === externalValueRef.current) return
    paintDataUrl(value)
  }, [value, canvasReady, paintDataUrl])

  const pos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const src = e.touches?.[0] || e.changedTouches?.[0] || e
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top,
    }
  }

  const start = (e) => {
    if (disabled) return
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    applyStrokeStyle(ctx)
    const point = pos(e)
    lastPoint.current = point
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }

  const move = (e) => {
    if (!drawing.current || disabled) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const point = pos(e)
    const prev = lastPoint.current
    if (prev) {
      // Segmented strokes avoid an ever-growing path that can re-ink after a partial clear.
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }
    lastPoint.current = point
    if (!hasInkRef.current) {
      hasInkRef.current = true
      setHasInk(true)
    }
  }

  const end = (e) => {
    if (!drawing.current) return
    if (e) e.preventDefault?.()
    drawing.current = false
    lastPoint.current = null
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    ctx?.beginPath()
    if (canvas && hasInkRef.current) {
      const dataUrl = canvas.toDataURL('image/png')
      externalValueRef.current = dataUrl
      onChangeRef.current?.(dataUrl)
    }
  }

  const clear = () => {
    drawing.current = false
    lastPoint.current = null

    const canvas = canvasRef.current
    if (canvas) {
      // Force a full backing-store reset (most reliable across DPR / browsers).
      const prevW = canvas.width
      const prevH = canvas.height
      canvas.width = prevW
      canvas.height = prevH
      const ctx = canvas.getContext('2d')
      if (ctx) wipeBackingStore(ctx, dprRef.current || window.devicePixelRatio || 1)
    } else {
      setupCanvas({ force: true })
    }

    hasInkRef.current = false
    setHasInk(false)
    externalValueRef.current = ''
    onChangeRef.current?.('')
  }

  return (
    <div className={className}>
      <div className="relative rounded-xl border border-borderColor bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          onTouchCancel={end}
        />
        {/* Decorative guide only — excluded from canvas bitmap / export */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-[12%] border-b border-[#E2D9D6]"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted">
          {hasInk ? 'Signature captured' : 'Sign above using your mouse or finger'}
        </p>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !hasInk}
          className="text-xs text-primary hover:underline cursor-pointer disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

export default SignaturePad
