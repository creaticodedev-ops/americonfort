import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { downloadPdfFromApi } from '../../utils/downloadPdf'
import { useI18n } from '../../i18n/I18nContext'
import DocumentPdfProgress, { buildPdfJobStages } from '../DocumentPdfProgress'
import { useDocumentPdfJob } from '../../hooks/useDocumentPdfJob'

const inputClass = 'border border-borderColor px-3 py-2 rounded-lg w-full text-sm'
const labelClass = 'text-xs font-medium text-gray-600 mb-1 block'

/**
 * Shared editor shell for persistent Contract / Invoice instances.
 * type: 'contract' | 'invoice'
 */
const DocumentEditor = ({
  type,
  documentId,
  axios,
  onClose,
  onSaved,
  /** Optional: render structured fields form; receives (form, setForm) */
  renderFields,
  /** Build PATCH body from form + sections */
  buildPatch,
  /** Initialize form state from loaded document */
  initForm,
}) => {
  const { t } = useI18n()
  const [tab, setTab] = useState('fields')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [doc, setDoc] = useState(null)
  const [form, setForm] = useState(null)
  const [sections, setSections] = useState({
    headerHtml: '',
    bodyHtml: '',
    footerHtml: '',
    termsHtml: '',
    customCss: '',
    pageSize: 'A4',
    logoUrl: '',
    companySignatureUrl: '',
  })
  const [versions, setVersions] = useState([])
  const [previewHtml, setPreviewHtml] = useState('')
  const [baseline, setBaseline] = useState(null)
  const [pdfJobMode, setPdfJobMode] = useState('regenerate') // regenerate | restore
  const pdfJob = useDocumentPdfJob()
  const pendingRestoreVersion = useRef(null)

  const basePath = type === 'contract' ? '/api/contracts' : '/api/invoices'
  const busy = saving || pdfJob.isRunning

  const applyLoadedDoc = (loaded, versionsList) => {
    setDoc(loaded)
    const nextForm = initForm(loaded)
    setForm(nextForm)
    const snap = loaded.templateSnapshot || {}
    const nextSections = {
      headerHtml: snap.headerHtml || '',
      bodyHtml: snap.bodyHtml || '',
      footerHtml: snap.footerHtml || '',
      termsHtml: snap.termsHtml || '',
      customCss: snap.customCss || '',
      pageSize: snap.pageSize || 'A4',
      logoUrl: snap.logoUrl || '',
      companySignatureUrl: snap.companySignatureUrl || '',
    }
    setSections(nextSections)
    setBaseline({ form: nextForm, sections: nextSections })
    if (versionsList) setVersions(versionsList)
    setPreviewHtml(loaded.renderedHtml || '')
  }

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: detail }, { data: ver }] = await Promise.all([
        axios.get(`${basePath}/${documentId}`),
        axios.get(`${basePath}/${documentId}/versions`),
      ])
      if (!detail.success) {
        toast.error(detail.message)
        return
      }
      const loaded = detail.contract || detail.invoice
      applyLoadedDoc(loaded, ver.success ? (ver.versions || []) : (loaded.versions || []))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  const persistDocument = async ({ regeneratePdf = true } = {}) => {
    if (!form || !baseline) return null
    const patch = {
      ...buildPatch(form),
      sections: {
        ...sections,
        // Keep Fields-tab logo/signature edits in sync with Sections snapshot
        logoUrl: form.logoUrl ?? sections.logoUrl,
        companySignatureUrl: form.companySignatureUrl ?? sections.companySignatureUrl,
      },
      regeneratePdf,
    }
    const { data } = await axios.patch(`${basePath}/${documentId}`, patch)
    if (!data.success) {
      throw new Error(data.message || 'Save failed')
    }
    const saved = data.contract || data.invoice
    applyLoadedDoc(saved, saved.versions || versions)
    onSaved?.(saved)

    if (regeneratePdf) {
      try {
        const { data: prev } = await axios.get(`${basePath}/${documentId}/preview`)
        if (prev.success) setPreviewHtml(prev.html || '')
      } catch {
        /* keep renderedHtml from save */
      }
      setTab('preview')
    }

    return data
  }

  const save = async ({ regeneratePdf = true } = {}) => {
    if (!form || !baseline || busy) return

    if (!regeneratePdf) {
      setSaving(true)
      const previous = { form: baseline.form, sections: baseline.sections, doc, previewHtml }
      try {
        const data = await persistDocument({ regeneratePdf: false })
        toast.success(data?.message || t('admin.common.save'))
      } catch (error) {
        setForm(previous.form)
        setSections(previous.sections)
        setDoc(previous.doc)
        setPreviewHtml(previous.previewHtml)
        toast.error(getErrorMessage(error))
      } finally {
        setSaving(false)
      }
      return
    }

    setPdfJobMode('regenerate')
    // Keep editor + current preview visible on failure so Retry can resubmit the same edits.
    const outcome = await pdfJob.run(async () => persistDocument({ regeneratePdf: true }))

    if (outcome.duplicate) return
    if (!outcome.ok) {
      toast.error(getErrorMessage(outcome.error) || t('admin.documents.regenerateFailed'))
      return
    }

    toast.success(outcome.data?.message || t('admin.common.save'))
    window.setTimeout(() => pdfJob.reset(), 700)
  }

  const runRestore = async (version) => {
    const outcome = await pdfJob.run(async () => {
      const { data } = await axios.post(`${basePath}/${documentId}/restore/${version}`)
      if (!data.success) throw new Error(data.message || 'Restore failed')
      await load()
      onSaved?.(data.contract || data.invoice)
      setTab('preview')
      return data
    })

    if (outcome.duplicate) return
    if (!outcome.ok) {
      toast.error(getErrorMessage(outcome.error) || t('admin.documents.regenerateFailed'))
      return
    }

    toast.success(outcome.data?.message || t('admin.documents.restore'))
    window.setTimeout(() => {
      pdfJob.reset()
      pendingRestoreVersion.current = null
    }, 700)
  }

  const restore = async (version) => {
    if (busy) return
    if (!window.confirm(`${t('admin.documents.restoreConfirm')} v${version}?`)) return
    setPdfJobMode('restore')
    pendingRestoreVersion.current = version
    await runRestore(version)
  }

  const download = async () => {
    try {
      const number = doc?.contractNumber || doc?.invoiceNumber || type
      await downloadPdfFromApi(axios, `${basePath}/${documentId}/pdf`, `${number}.pdf`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const loadPreview = async () => {
    try {
      const { data } = await axios.get(`${basePath}/${documentId}/preview`)
      if (data.success) {
        setPreviewHtml(data.html || '')
        setTab('preview')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const title = doc?.contractNumber || doc?.invoiceNumber || t('admin.documents.edit')
  const progressTitle =
    pdfJob.status === 'success'
      ? t('admin.documents.stageReady')
      : pdfJobMode === 'restore'
        ? t('admin.documents.restoringTitle')
        : t('admin.documents.regeneratingTitle')
  const progressStages = buildPdfJobStages(pdfJob.status, {
    saved: t('admin.documents.stageSaving'),
    generating: t('admin.documents.stageRegenerating'),
    ready: t('admin.documents.stageReady'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-borderColor bg-white shadow-xl">
        {pdfJob.isActive ? (
          <DocumentPdfProgress
            status={pdfJob.status}
            title={progressTitle}
            subtitle={
              pdfJob.status === 'error' ? undefined : t('admin.documents.regeneratingHint')
            }
            stages={progressStages}
            errorMessage={
              getErrorMessage(pdfJob.error) || t('admin.documents.regenerateFailed')
            }
            onRetry={
              pdfJob.status === 'error'
                ? () => {
                    if (pdfJobMode === 'restore' && pendingRestoreVersion.current != null) {
                      return runRestore(pendingRestoreVersion.current)
                    }
                    return save({ regeneratePdf: true })
                  }
                : undefined
            }
            retryLabel={t('admin.documents.retryRegenerate')}
            variant="overlay"
          />
        ) : null}

        <div className="flex items-start justify-between gap-4 border-b border-borderColor px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-xs text-gray-500">
              {t('admin.documents.version')} {doc?.version || 1}
              {doc?.updatedAt ? ` · ${new Date(doc.updatedAt).toLocaleString()}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pdfJob.isRunning}
            className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-borderColor px-5 py-2">
          {[
            ['fields', t('admin.documents.fields')],
            ['sections', t('admin.documents.sections')],
            ['history', t('admin.documents.history')],
            ['preview', t('admin.documents.preview')],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              disabled={pdfJob.isRunning}
              onClick={() => (id === 'preview' ? loadPreview() : setTab(id))}
              className={`rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 ${
                tab === id ? 'bg-primary text-white' : 'border border-borderColor text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading || !form ? (
            <p className="text-sm text-gray-500">{t('admin.common.loading')}</p>
          ) : tab === 'fields' ? (
            renderFields(form, setForm, inputClass, labelClass)
          ) : tab === 'sections' ? (
            <div className="space-y-3">
              {['headerHtml', 'bodyHtml', 'footerHtml', 'termsHtml', 'customCss'].map((key) => (
                <div key={key}>
                  <label className={labelClass}>{key}</label>
                  <textarea
                    className={`${inputClass} font-mono min-h-[100px]`}
                    value={sections[key] || ''}
                    onChange={(e) => setSections((s) => ({ ...s, [key]: e.target.value }))}
                    disabled={busy}
                  />
                </div>
              ))}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>logoUrl</label>
                  <input
                    className={inputClass}
                    value={sections.logoUrl || ''}
                    onChange={(e) => setSections((s) => ({ ...s, logoUrl: e.target.value }))}
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className={labelClass}>companySignatureUrl</label>
                  <input
                    className={inputClass}
                    value={sections.companySignatureUrl || ''}
                    onChange={(e) => setSections((s) => ({ ...s, companySignatureUrl: e.target.value }))}
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className={labelClass}>pageSize</label>
                  <select
                    className={inputClass}
                    value={sections.pageSize}
                    onChange={(e) => setSections((s) => ({ ...s, pageSize: e.target.value }))}
                    disabled={busy}
                  >
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>
              </div>
            </div>
          ) : tab === 'history' ? (
            <div className="space-y-2">
              {(versions || []).length === 0 ? (
                <p className="text-sm text-gray-500">{t('admin.documents.noHistory')}</p>
              ) : (
                [...versions].reverse().map((v) => (
                  <div
                    key={`${v.version}-${v.savedAt}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-borderColor px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">v{v.version}</p>
                      <p className="text-xs text-gray-500">
                        {v.savedAt ? new Date(v.savedAt).toLocaleString() : '—'}
                        {v.note ? ` · ${v.note}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => restore(v.version)}
                      className="rounded-lg border border-borderColor px-3 py-1 text-xs font-medium text-primary disabled:opacity-60"
                    >
                      {t('admin.documents.restore')}
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-borderColor">
              {previewHtml ? (
                <iframe title={t('admin.commonUi.preview')} srcDoc={previewHtml} className="min-h-[480px] w-full bg-white" />
              ) : (
                <p className="p-6 text-sm text-gray-500">{t('admin.documents.noPreview')}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-borderColor px-5 py-3">
          <button
            type="button"
            onClick={download}
            disabled={pdfJob.isRunning}
            className="rounded-xl border border-borderColor px-4 py-2 text-sm disabled:opacity-60"
          >
            PDF
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => save({ regeneratePdf: false })}
            className="rounded-xl border border-borderColor px-4 py-2 text-sm disabled:opacity-60"
          >
            {t('admin.documents.saveOnly')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => save({ regeneratePdf: true })}
            className="rounded-xl bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {pdfJob.isRunning && pdfJobMode === 'regenerate'
              ? t('admin.documents.stageRegenerating')
              : t('admin.documents.saveRegenerate')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DocumentEditor
