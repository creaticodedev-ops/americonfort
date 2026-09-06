import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearWalkInDraft,
  draftHasContent,
  loadWalkInDraftFiles,
  readWalkInDraftMeta,
  saveWalkInDraftFiles,
  writeWalkInDraftMeta,
} from '../utils/walkInDraft'

const SAVE_DEBOUNCE_MS = 400

/**
 * Persist Walk-in form + pending docs across refresh.
 * Hydrates once on mount; never overwrites newer live input with a stale draft.
 */
export function useWalkInDraft({
  form,
  setForm,
  clientSignature,
  setClientSignature,
  secondDriverSignature,
  setSecondDriverSignature,
  docItems,
  setDocItems,
  useExistingDoc,
  setUseExistingDoc,
  enabled = true,
}) {
  const [hydrated, setHydrated] = useState(false)
  const [draftBanner, setDraftBanner] = useState(null)
  const hydratedRef = useRef(false)
  const skipNextSaveRef = useRef(false)
  const saveTimerRef = useRef(null)
  const latestRef = useRef({})

  latestRef.current = {
    form,
    clientSignature,
    secondDriverSignature,
    docItems,
    useExistingDoc,
  }

  useEffect(() => {
    if (!enabled || hydratedRef.current) return
    let cancelled = false

    ;(async () => {
      const meta = readWalkInDraftMeta()
      let restoredFiles = []
      try {
        const stored = await loadWalkInDraftFiles()
        restoredFiles = (stored || [])
          .filter((row) => row?.blob)
          .map((row) => {
            const file = new File([row.blob], row.name || 'document', {
              type: row.mime || row.blob.type || 'application/octet-stream',
              lastModified: Date.now(),
            })
            const isImage = String(file.type || '').startsWith('image/')
            return {
              id: row.id || `restored_${Math.random().toString(36).slice(2)}`,
              file,
              name: file.name,
              size: file.size,
              mime: file.type,
              docType: row.docType || 'combined',
              previewUrl: isImage ? URL.createObjectURL(file) : null,
              status: 'ready',
              error: null,
            }
          })
      } catch {
        restoredFiles = []
      }

      if (cancelled) {
        restoredFiles.forEach((d) => {
          if (d.previewUrl) URL.revokeObjectURL(d.previewUrl)
        })
        return
      }

      const hasMeta = Boolean(meta?.form)
      const hasFiles = restoredFiles.length > 0
      const meaningful =
        hasMeta
        && draftHasContent(meta.form, {
          clientSignature: meta.clientSignature,
          secondDriverSignature: meta.secondDriverSignature,
          docItems: restoredFiles,
        })

      if (meaningful || hasFiles) {
        skipNextSaveRef.current = true
        if (meta?.form) {
          setForm((current) => ({
            ...current,
            ...meta.form,
            secondDriver: {
              ...(current.secondDriver || {}),
              ...(meta.form.secondDriver || {}),
            },
            deskDiscount: {
              type: meta.form.deskDiscount?.type || 'fixed',
              value: meta.form.deskDiscount?.value ?? '',
            },
          }))
        }
        if (meta?.clientSignature) setClientSignature(meta.clientSignature)
        if (meta?.secondDriverSignature) setSecondDriverSignature(meta.secondDriverSignature)
        if (typeof meta?.useExistingDoc === 'boolean') setUseExistingDoc(meta.useExistingDoc)
        if (restoredFiles.length) setDocItems(restoredFiles)
        setDraftBanner({
          savedAt: meta?.savedAt || Date.now(),
          fileCount: restoredFiles.length,
        })
      }

      hydratedRef.current = true
      setHydrated(true)
    })()

    return () => {
      cancelled = true
    }
  }, [
    enabled,
    setForm,
    setClientSignature,
    setSecondDriverSignature,
    setDocItems,
    setUseExistingDoc,
  ])

  useEffect(() => {
    if (!enabled || !hydrated) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }

    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      const {
        form: f,
        clientSignature: sig,
        secondDriverSignature: sig2,
        docItems: docs,
        useExistingDoc: reuse,
      } = latestRef.current

      if (!draftHasContent(f, { clientSignature: sig, secondDriverSignature: sig2, docItems: docs })) {
        clearWalkInDraft()
        return
      }

      writeWalkInDraftMeta({
        form: f,
        clientSignature: sig || '',
        secondDriverSignature: sig2 || '',
        useExistingDoc: Boolean(reuse),
        docMeta: (docs || []).map((d) => ({
          id: d.id,
          name: d.name,
          mime: d.mime,
          size: d.size,
          docType: d.docType,
        })),
      })
      saveWalkInDraftFiles(
        (docs || [])
          .filter((d) => d.file && d.status !== 'success')
          .map((d) => ({
            id: d.id,
            name: d.name,
            mime: d.mime,
            size: d.size,
            docType: d.docType,
            file: d.file,
          })),
      )
    }, SAVE_DEBOUNCE_MS)

    return () => window.clearTimeout(saveTimerRef.current)
  }, [
    enabled,
    hydrated,
    form,
    clientSignature,
    secondDriverSignature,
    docItems,
    useExistingDoc,
  ])

  const discardDraft = useCallback(async () => {
    window.clearTimeout(saveTimerRef.current)
    await clearWalkInDraft()
    setDraftBanner(null)
  }, [])

  const clearDraftAfterSuccess = useCallback(async () => {
    window.clearTimeout(saveTimerRef.current)
    await clearWalkInDraft()
    setDraftBanner(null)
  }, [])

  const dismissBanner = useCallback(() => setDraftBanner(null), [])

  return {
    hydrated,
    draftBanner,
    discardDraft,
    clearDraftAfterSuccess,
    dismissBanner,
  }
}

export default useWalkInDraft
