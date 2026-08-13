import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../../../context/AppContext'
import { getErrorMessage } from '../../../utils/apiError'
import {
  Check,
  RelatedLink,
  SettingsPanel,
  useSettingsLabel,
} from './settingsShared'

const InvoicesSettings = () => {
  const { axios } = useAppContext()
  const label = useSettingsLabel()
  const [showStamp, setShowStamp] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get('/api/owner/settings/documents')
        if (cancelled) return
        if (data.success) {
          setShowStamp(data.documentSettings?.invoices?.showAgencyStamp !== false)
        } else {
          toast.error(data.message || label('admin.settings.documentsLoadFailed', 'Could not load document settings'))
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, label('admin.settings.documentsLoadFailed', 'Could not load document settings')))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axios])

  const handleSave = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const { data } = await axios.put('/api/owner/settings/documents', {
        invoices: { showAgencyStamp: showStamp },
      })
      if (!data.success) {
        toast.error(data.message || label('admin.settings.documentsSaveFailed', 'Could not save document settings'))
        return
      }
      setShowStamp(data.documentSettings?.invoices?.showAgencyStamp !== false)
      toast.success(data.message || label('admin.settings.documentsSaved', 'Document settings saved'))
    } catch (error) {
      toast.error(getErrorMessage(error, label('admin.settings.documentsSaveFailed', 'Could not save document settings')))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SettingsPanel>
        <p className="text-sm text-muted">{label('admin.common.loading', 'Loading...')}</p>
      </SettingsPanel>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <SettingsPanel>
        <div>
          <h2 className="text-base font-semibold text-[var(--admin-fg)]">
            {label('admin.settings.invoiceStampTitle', 'Invoice stamp')}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {label(
              'admin.settings.invoiceStampHint',
              'Default preference when creating invoices. You can still override the stamp checkbox on each invoice.',
            )}
          </p>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3.5 space-y-2">
            <Check
              checked={showStamp}
              onChange={setShowStamp}
              label={label(
                'admin.settings.showAgencyStampOnInvoices',
                'Display agency stamp on invoices by default',
              )}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="admin-btn admin-btn--primary disabled:opacity-60"
            >
              {saving
                ? label('admin.common.saving', 'Saving...')
                : label('admin.settings.documentsSave', 'Save stamp settings')}
            </button>
          </div>
        </form>
      </SettingsPanel>

      <SettingsPanel>
        <RelatedLink
          to="/owner/invoices"
          title={label('admin.menu.invoices', 'Invoices')}
          description={label(
            'admin.settings.nav.invoicesModuleHint',
            'Create, edit, and download customer invoices.',
          )}
        />
      </SettingsPanel>
    </div>
  )
}

export default InvoicesSettings
