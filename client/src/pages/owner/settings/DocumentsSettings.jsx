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

const DocumentsSettings = () => {
  const { axios } = useAppContext()
  const label = useSettingsLabel()
  const [documentSettings, setDocumentSettings] = useState({
    contracts: { showAgencyStamp: true },
    invoices: { showAgencyStamp: true },
  })
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
          setDocumentSettings({
            contracts: {
              showAgencyStamp: data.documentSettings?.contracts?.showAgencyStamp !== false,
            },
            invoices: {
              showAgencyStamp: data.documentSettings?.invoices?.showAgencyStamp !== false,
            },
          })
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
      const { data } = await axios.put('/api/owner/settings/documents', documentSettings)
      if (!data.success) {
        toast.error(data.message || label('admin.settings.documentsSaveFailed', 'Could not save document settings'))
        return
      }
      setDocumentSettings({
        contracts: {
          showAgencyStamp: data.documentSettings?.contracts?.showAgencyStamp !== false,
        },
        invoices: {
          showAgencyStamp: data.documentSettings?.invoices?.showAgencyStamp !== false,
        },
      })
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
          <h2 className="text-base font-semibold text-ink">
            {label('admin.settings.agencyStampTitle', 'Agency Stamp')}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {label(
              'admin.settings.agencyStampHint',
              'Control whether your uploaded cachet / company stamp appears on generated contracts. Upload the stamp image under Export Templates.',
            )}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-xl border border-borderColor bg-light/40 px-4 py-3.5 space-y-2">
            <Check
              checked={documentSettings.contracts.showAgencyStamp}
              onChange={(v) =>
                setDocumentSettings((prev) => ({
                  ...prev,
                  contracts: { ...prev.contracts, showAgencyStamp: v },
                }))
              }
              label={label(
                'admin.settings.showAgencyStampOnContracts',
                'Display agency stamp on contracts',
              )}
            />
            <p className="pl-6 text-xs text-muted">
              {label(
                'admin.settings.showAgencyStampOnContractsHint',
                'The stamp will appear on generated contracts when enabled. When disabled, the stamp area stays empty — no placeholder or broken image.',
              )}
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dull disabled:opacity-60"
            >
              {saving
                ? label('admin.common.saving', 'Saving...')
                : label('admin.settings.documentsSave', 'Save stamp settings')}
            </button>
          </div>
        </form>
      </SettingsPanel>

      <SettingsPanel>
        <h3 className="text-sm font-semibold text-ink">
          {label('admin.settings.nav.relatedTools', 'Related tools')}
        </h3>
        <div className="space-y-2">
          <RelatedLink
            to="/owner/templates"
            title={label('admin.menu.templates', 'Export Templates')}
            description={label(
              'admin.settings.nav.templatesHint',
              'Upload logo, agency stamp/cachet, and edit contract HTML templates.',
            )}
          />
          <RelatedLink
            to="/owner/contracts"
            title={label('admin.menu.contracts', 'Contracts')}
            description={label(
              'admin.settings.nav.contractsHint',
              'Generate and manage rental contracts for reservations.',
            )}
          />
        </div>
      </SettingsPanel>
    </div>
  )
}

export default DocumentsSettings
