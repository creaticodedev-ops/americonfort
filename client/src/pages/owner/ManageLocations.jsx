import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { assets } from '../../assets/ownerAssets'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import {
  AdminPage,
  PageHeader,
  AdminModal,
  AdminForm,
  AdminFormSection,
  AdminFormField,
  AdminFormInput,
  AdminFormSelect,
  AdminFormGrid,
} from '../../components/owner/ui'

const emptyForm = {
  name: '',
  city: '',
  address: '',
  googleMapsLink: '',
  locationType: 'custom',
  deliveryFee: '0',
}

function LocationForm({ form, patchForm, money, t }) {
  return (
    <>
      <AdminFormSection>
        <AdminFormGrid columns={2}>
          <AdminFormField label={t('admin.locations.name')} required>
            <AdminFormInput
              required
              placeholder={t('admin.locUi.namePh')}
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
            />
          </AdminFormField>
          <AdminFormField label={t('admin.locations.city')} required>
            <AdminFormInput
              required
              placeholder={t('admin.locUi.cityPh')}
              value={form.city}
              onChange={(e) => patchForm({ city: e.target.value })}
              autoComplete="address-level2"
            />
          </AdminFormField>
        </AdminFormGrid>
        <AdminFormField label={t('admin.locations.address')} required>
          <AdminFormInput
            required
            placeholder={t('admin.locUi.addressPh')}
            value={form.address}
            onChange={(e) => patchForm({ address: e.target.value })}
            autoComplete="street-address"
          />
        </AdminFormField>
        <AdminFormGrid columns={2}>
          <AdminFormField label={t('admin.locations.mapsLink')}>
            <AdminFormInput
              type="url"
              inputMode="url"
              placeholder="https://maps.google.com/..."
              value={form.googleMapsLink}
              onChange={(e) => patchForm({ googleMapsLink: e.target.value })}
            />
          </AdminFormField>
          <AdminFormField label={t('admin.locations.type')}>
            <AdminFormSelect
              value={form.locationType}
              onChange={(e) => patchForm({ locationType: e.target.value })}
            >
              <option value="airport">{t('admin.locations.typeAirport')}</option>
              <option value="hotel">{t('admin.locations.typeHotel')}</option>
              <option value="office">{t('admin.locations.typeOffice')}</option>
              <option value="custom">{t('admin.locations.typeCustom')}</option>
            </AdminFormSelect>
          </AdminFormField>
        </AdminFormGrid>
        <AdminFormField label={t('admin.locations.deliveryFee')} hint={t('admin.locations.deliveryFeeHint')}>
          <div className="flex items-center gap-2 min-w-0">
            <AdminFormInput
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              required
              className="max-w-[9rem]"
              value={form.deliveryFee}
              onChange={(e) => patchForm({ deliveryFee: e.target.value })}
            />
            <span className="text-sm text-[var(--admin-fg-muted)] shrink-0">{money}</span>
          </div>
        </AdminFormField>
      </AdminFormSection>
    </>
  )
}

const ManageLocations = () => {
  const { isOwner, axios, fetchPickupLocations, currency } = useAppContext()
  const { t } = useI18n()

  const [locations, setLocations] = useState([])
  const [form, setForm] = useState(emptyForm)
  const patchForm = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])
  const [editingId, setEditingId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchLocations = async () => {
    try {
      const { data } = await axios.get('/api/pickup-locations/all')
      data.success ? setLocations(data.locations) : toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const resetForm = useCallback(() => {
    setForm(emptyForm)
    setEditingId(null)
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    resetForm()
  }, [resetForm])

  const openAdd = useCallback(() => {
    resetForm()
    setDrawerOpen(true)
  }, [resetForm])

  const startEdit = useCallback((location) => {
    setEditingId(location._id)
    setForm({
      name: location.name,
      city: location.city,
      address: location.address,
      googleMapsLink: location.googleMapsLink || '',
      locationType: location.locationType || 'custom',
      deliveryFee: String(location.deliveryFee ?? 0),
    })
    setDrawerOpen(true)
  }, [])

  const save = useCallback(async () => {
    if (isLoading) return

    const fee = Number(form.deliveryFee)
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error(t('admin.locations.invalidFee'))
      return
    }

    setIsLoading(true)
    try {
      const payload = {
        name: form.name,
        city: form.city,
        address: form.address,
        googleMapsLink: form.googleMapsLink,
        locationType: form.locationType,
        deliveryFee: fee,
      }
      const endpoint = editingId ? '/api/pickup-locations/update' : '/api/pickup-locations/create'
      const body = editingId ? { locationId: editingId, ...payload } : payload
      const { data } = await axios.post(endpoint, body)

      if (data.success) {
        toast.success(data.message)
        closeDrawer()
        fetchLocations()
        fetchPickupLocations()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [axios, closeDrawer, editingId, form, isLoading, t, fetchPickupLocations])

  const toggleLocation = async (locationId) => {
    try {
      const { data } = await axios.post('/api/pickup-locations/toggle', { locationId })
      if (data.success) {
        toast.success(data.message)
        fetchLocations()
        fetchPickupLocations()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const deleteLocation = async (locationId) => {
    if (!window.confirm(t('admin.locations.deleteConfirm'))) return

    try {
      const { data } = await axios.post('/api/pickup-locations/delete', { locationId })
      if (data.success) {
        toast.success(data.message)
        if (editingId === locationId) closeDrawer()
        fetchLocations()
        fetchPickupLocations()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  useEffect(() => {
    isOwner && fetchLocations()
  }, [isOwner])

  const money = currency || 'MAD '

  const drawerFooter = useMemo(
    () => (
      <>
        <button type="button" className="admin-btn admin-btn--secondary admin-modal-action" onClick={closeDrawer}>
          {t('admin.common.cancel')}
        </button>
        <button type="button" disabled={isLoading} className="admin-btn admin-btn--primary admin-modal-action" onClick={save}>
          {isLoading ? t('admin.locations.saving') : editingId ? t('admin.locations.update') : t('admin.locations.add')}
        </button>
      </>
    ),
    [closeDrawer, editingId, isLoading, save, t],
  )

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.locations.title')}
        description={t('admin.locations.subtitle')}
        actions={
          <button type="button" className="admin-btn admin-btn--primary" onClick={openAdd}>
            {t('admin.locations.add')}
          </button>
        }
      />

      <div className="max-w-5xl w-full rounded-md overflow-hidden border border-borderColor mt-2 bg-white">
        <div className="table-scroll">
        <table className="w-full border-collapse text-left text-sm text-gray-600 max-lg:min-w-[640px]">
          <thead className="text-gray-500 bg-gray-50">
            <tr>
              <th className="p-3 font-medium">{t('admin.locations.colLocation')}</th>
              <th className="p-3 font-medium max-md:hidden">{t('admin.locations.colCity')}</th>
              <th className="p-3 font-medium max-md:hidden">{t('admin.locations.colType')}</th>
              <th className="p-3 font-medium">{t('admin.locations.colFee')}</th>
              <th className="p-3 font-medium">{t('admin.locations.colStatus')}</th>
              <th className="p-3 font-medium">{t('admin.locations.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((location) => {
              const fee = Number(location.deliveryFee) || 0
              return (
                <tr key={location._id} className="border-t border-borderColor">
                  <td className="p-3">
                    <p className="font-medium">{location.name}</p>
                    <p className="text-xs text-gray-500 max-w-xs truncate">{location.address}</p>
                  </td>
                  <td className="p-3 max-md:hidden">{location.city}</td>
                  <td className="p-3 max-md:hidden capitalize">{location.locationType}</td>
                  <td className="p-3">
                    {fee <= 0 ? (
                      <span className="text-green-600 font-medium">{t('admin.locations.free')}</span>
                    ) : (
                      <span className="font-medium text-gray-800">{money}{fee}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-xs ${location.isActive ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                      {location.isActive ? t('admin.locations.active') : t('admin.locations.inactive')}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleLocation(location._id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer"
                      aria-label={location.isActive ? t('admin.locations.inactive') : t('admin.locations.active')}
                    >
                      <img
                        src={location.isActive ? assets.eye_close_icon : assets.eye_icon}
                        alt=""
                        className="h-5 w-5"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(location)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-blue-50 cursor-pointer"
                      aria-label={t('admin.common.edit')}
                    >
                      <img
                        src={assets.edit_icon}
                        alt=""
                        className="h-5 w-5"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLocation(location._id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-red-50 cursor-pointer"
                      aria-label={t('admin.common.delete')}
                    >
                      <img
                        src={assets.delete_icon}
                        alt=""
                        className="h-5 w-5"
                      />
                    </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      <AdminModal
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingId ? t('admin.locations.update') : t('admin.locations.add')}
        variant="drawer"
        footer={drawerFooter}
      >
        <AdminForm>
          <LocationForm form={form} patchForm={patchForm} money={money} t={t} />
        </AdminForm>
      </AdminModal>
    </AdminPage>
  )
}

export default ManageLocations
