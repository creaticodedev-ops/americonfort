/**
 * Walk-in draft persistence — form fields in localStorage, pending files in IndexedDB.
 * Cleared after successful create or intentional discard.
 */

const DRAFT_VERSION = 1
const STORAGE_KEY = 'americonfort:walkin-draft:v1'
const IDB_NAME = 'americonfort-walkin'
const IDB_STORE = 'draft-files'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

const openDb = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'))
  })

export const readWalkInDraftMeta = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== DRAFT_VERSION || !parsed.savedAt) return null
    if (Date.now() - Number(parsed.savedAt) > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const writeWalkInDraftMeta = (payload) => {
  try {
    const body = {
      version: DRAFT_VERSION,
      savedAt: Date.now(),
      ...payload,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(body))
    return true
  } catch {
    return false
  }
}

export const clearWalkInDraftMeta = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export const loadWalkInDraftFiles = async () => {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const store = tx.objectStore(IDB_STORE)
      const req = store.getAll()
      req.onsuccess = () => {
        db.close()
        resolve(Array.isArray(req.result) ? req.result : [])
      }
      req.onerror = () => {
        db.close()
        reject(req.error)
      }
    })
  } catch {
    return []
  }
}

export const saveWalkInDraftFiles = async (files = []) => {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      store.clear()
      for (const entry of files) {
        store.put({
          id: entry.id,
          name: entry.name,
          mime: entry.mime || entry.file?.type || '',
          size: entry.size || entry.file?.size || 0,
          docType: entry.docType || 'combined',
          blob: entry.file || entry.blob,
        })
      }
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
    return true
  } catch {
    return false
  }
}

export const clearWalkInDraftFiles = async () => {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).clear()
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch {
    /* ignore */
  }
}

export const clearWalkInDraft = async () => {
  clearWalkInDraftMeta()
  await clearWalkInDraftFiles()
}

export const draftHasContent = (form, { clientSignature, secondDriverSignature, docItems } = {}) => {
  if (!form) return false
  const keys = [
    'fullName', 'email', 'phone', 'car', 'notes', 'nationality', 'dateOfBirth',
    'placeOfBirth', 'customerAddress', 'identityDocumentNumber', 'passportNumber',
    'driverLicenseNumber', 'pickupDate', 'returnDate',
  ]
  if (keys.some((k) => String(form[k] || '').trim())) return true
  if (form.secondDriver?.enabled) return true
  if (Number(form.deskDiscount?.value) > 0) return true
  if (clientSignature || secondDriverSignature) return true
  if (Array.isArray(docItems) && docItems.length > 0) return true
  return false
}

export default {
  readWalkInDraftMeta,
  writeWalkInDraftMeta,
  clearWalkInDraft,
  loadWalkInDraftFiles,
  saveWalkInDraftFiles,
  draftHasContent,
}
