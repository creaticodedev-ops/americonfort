import { useCallback, useRef, useState } from 'react'

/**
 * Tracks a real document/PDF generation request (not a fake timer).
 * status: idle | running | success | error
 */
export function useDocumentPdfJob() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const inFlightRef = useRef(false)
  const lastJobRef = useRef(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setResult(null)
    lastJobRef.current = null
  }, [])

  const run = useCallback(async (jobFn) => {
    if (typeof jobFn !== 'function') {
      return { ok: false, duplicate: false, error: new Error('Invalid job') }
    }
    if (inFlightRef.current) {
      return { ok: false, duplicate: true }
    }

    lastJobRef.current = jobFn
    inFlightRef.current = true
    setStatus('running')
    setError(null)

    try {
      const data = await jobFn()
      setResult(data)
      setStatus('success')
      return { ok: true, data }
    } catch (err) {
      setError(err)
      setStatus('error')
      return { ok: false, error: err, duplicate: false }
    } finally {
      inFlightRef.current = false
    }
  }, [])

  const retry = useCallback(() => {
    if (!lastJobRef.current) {
      return Promise.resolve({ ok: false, duplicate: false })
    }
    return run(lastJobRef.current)
  }, [run])

  return {
    status,
    error,
    result,
    isRunning: status === 'running',
    isActive: status === 'running' || status === 'success' || status === 'error',
    run,
    retry,
    reset,
  }
}

export default useDocumentPdfJob
