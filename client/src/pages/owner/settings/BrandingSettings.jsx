import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../../../context/AppContext'
import { getErrorMessage } from '../../../utils/apiError'
import {
  Check,
  RelatedLink,
  SettingsPanel,
  useSettingsLabel,
} from './settingsShared'

const BrandingSettings = () => {
  const { axios, user, fetchUser } = useAppContext()
  const label = useSettingsLabel()
  const [image, setImage] = useState(null)
  const [savingLogo, setSavingLogo] = useState(false)
  const [documentSettings, setDocumentSettings] = useState({
    contracts: { showAgencyStamp: true },
    invoices: { showAgencyStamp: true },
  })
  const [loadingStamp, setLoadingStamp] = useState(true)
  const [savingStamp, setSavingStamp] = useState(false)

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ''), [image])

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingStamp(true)
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
        }
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error, label('admin.settings.documentsLoadFailed', 'Could not load document settings')))
      } finally {
        if (!cancelled) setLoadingStamp(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axios])

  const saveLogo = async () => {
    if (!image || savingLogo) return
    setSavingLogo(true)
    try {
      const formData = new FormData()
      formData.append('image', image)
      const { data } = await axios.post('/api/owner/update-image', formData)
      if (!data.success) {
        toast.error(data.message || label('admin.brandingPage.logoFailed', 'Could not update logo'))
        return
      }
      await fetchUser()
      setImage(null)
      toast.success(data.message || label('admin.brandingPage.logoSaved', 'Logo updated'))
    } catch (error) {
      toast.error(getErrorMessage(error, label('admin.brandingPage.logoFailed', 'Could not update logo')))
    } finally {
      setSavingLogo(false)
    }
  }

  const saveStamp = async (e) => {
    e.preventDefault()
    if (savingStamp) return
    setSavingStamp(true)
    try {
      const { data } = await axios.put('/api/owner/settings/documents', documentSettings)
      if (!data.success) {
        toast.error(data.message || label('admin.settings.documentsSaveFailed', 'Could not save document settings'))
        return
      }
      toast.success(data.message || label('admin.settings.documentsSaved', 'Document settings saved'))
    } catch (error) {
      toast.error(getErrorMessage(error, label('admin.settings.documentsSaveFailed', 'Could not save document settings')))
    } finally {
      setSavingStamp(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <SettingsPanel>
        <div>
          <h2 className="text-base font-semibold text-[var(--admin-fg)]">
            {label('admin.brandingPage.logoTitle', 'Agency logo')}
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-fg-secondary)]">
            {label(
              'admin.brandingPage.logoHint',
              'This image appears in the admin sidebar. Contract and invoice logos are uploaded under Export Templates.',
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {previewUrl || user?.image || user?.agencyProfile?.logo ? (
            <img
              src={previewUrl || user?.image || user?.agencyProfile?.logo}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-1 ring-[var(--admin-border)] bg-[var(--admin-surface-2)]"
            />
          ) : (
            <div className="h-16 w-16 rounded-full ring-1 ring-[var(--admin-border)] bg-[var(--admin-surface-2)]" />
          )}
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              className="block text-sm text-[var(--admin-fg-secondary)]"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
            {image ? (
              <button
                type="button"
                disabled={savingLogo}
                onClick={saveLogo}
                className="admin-btn admin-btn--primary"
              >
                {savingLogo
                  ? label('admin.common.saving', 'Saving...')
                  : label('admin.brandingPage.saveLogo', 'Save logo')}
              </button>
            ) : null}
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <div>
          <h2 className="text-base font-semibold text-[var(--admin-fg)]">
            {label('admin.settings.agencyStampTitle', 'Agency Stamp')}
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-fg-secondary)]">
            {label(
              'admin.settings.agencyStampHint',
              'Control whether your uploaded cachet / company stamp appears on generated contracts. Upload the stamp image under Export Templates.',
            )}
          </p>
        </div>
        {loadingStamp ? (
          <p className="text-sm text-[var(--admin-fg-muted)]">{label('admin.common.loading', 'Loading...')}</p>
        ) : (
          <form onSubmit={saveStamp} className="space-y-3">
            <Check
              checked={documentSettings.contracts.showAgencyStamp}
              onChange={(v) =>
                setDocumentSettings((prev) => ({
                  ...prev,
                  contracts: { ...prev.contracts, showAgencyStamp: v },
                }))
              }
              label={label('admin.settings.showAgencyStampOnContracts', 'Display agency stamp on contracts')}
            />
            <Check
              checked={documentSettings.invoices.showAgencyStamp}
              onChange={(v) =>
                setDocumentSettings((prev) => ({
                  ...prev,
                  invoices: { ...prev.invoices, showAgencyStamp: v },
                }))
              }
              label={label('admin.settings.showAgencyStampOnInvoices', 'Display agency stamp on invoices by default')}
            />
            <div className="flex justify-end">
              <button type="submit" disabled={savingStamp} className="admin-btn admin-btn--primary">
                {savingStamp
                  ? label('admin.common.saving', 'Saving...')
                  : label('admin.settings.documentsSave', 'Save stamp settings')}
              </button>
            </div>
          </form>
        )}
      </SettingsPanel>

      <SettingsPanel>
        <h3 className="text-sm font-semibold text-[var(--admin-fg)]">
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
            to="/owner/settings/documents"
            title={label('admin.settings.nav.documents', 'Contracts & Documents')}
            description={label('admin.settings.nav.documentsDesc', 'Agency stamp, contract defaults, and document templates.')}
          />
        </div>
      </SettingsPanel>
    </div>
  )
}

export default BrandingSettings
