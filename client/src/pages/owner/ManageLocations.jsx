import React, { useEffect, useState } from 'react'
import Title from '../../components/owner/Title'
import { assets } from '../../assets/ownerAssets'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'

const emptyForm = {
  name: '',
  city: '',
  address: '',
  googleMapsLink: '',
  locationType: 'custom',
  deliveryFee: '0',
}

const ManageLocations = () => {
  const { isOwner, axios, fetchPickupLocations, currency } = useAppContext()
  const { t } = useI18n()

  const [locations, setLocations] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchLocations = async () => {
    try {
      const { data } = await axios.get('/api/pickup-locations/all')
      data.success ? setLocations(data.locations) : toast.error(data.message)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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
        resetForm()
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
  }

  const startEdit = (location) => {
    setEditingId(location._id)
    setForm({
      name: location.name,
      city: location.city,
      address: location.address,
      googleMapsLink: location.googleMapsLink || '',
      locationType: location.locationType || 'custom',
      deliveryFee: String(location.deliveryFee ?? 0),
    })
  }

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
        if (editingId === locationId) resetForm()
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

  return (
    <div className='px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 w-full pb-12'>
      <Title
        title={t('admin.locations.title')}
        subTitle={t('admin.locations.subtitle')}
      />

      <form onSubmit={handleSubmit} className='mt-6 max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500'>
        <div className='flex flex-col'>
          <label>{t('admin.locations.name')}</label>
          <input
            type="text"
            required
            placeholder={t('admin.locUi.namePh')}
            className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none'
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className='flex flex-col'>
          <label>{t('admin.locations.city')}</label>
          <input
            type="text"
            required
            placeholder={t('admin.locUi.cityPh')}
            className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none'
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div className='flex flex-col md:col-span-2'>
          <label>{t('admin.locations.address')}</label>
          <input
            type="text"
            required
            placeholder={t('admin.locUi.addressPh')}
            className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none'
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div className='flex flex-col'>
          <label>{t('admin.locations.mapsLink')}</label>
          <input
            type="url"
            placeholder="https://maps.google.com/..."
            className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none'
            value={form.googleMapsLink}
            onChange={(e) => setForm({ ...form, googleMapsLink: e.target.value })}
          />
        </div>
        <div className='flex flex-col'>
          <label>{t('admin.locations.type')}</label>
          <select
            className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none'
            value={form.locationType}
            onChange={(e) => setForm({ ...form, locationType: e.target.value })}
          >
            <option value="airport">{t('admin.locations.typeAirport')}</option>
            <option value="hotel">{t('admin.locations.typeHotel')}</option>
            <option value="office">{t('admin.locations.typeOffice')}</option>
            <option value="custom">{t('admin.locations.typeCustom')}</option>
          </select>
        </div>
        <div className='flex flex-col md:col-span-2'>
          <label>{t('admin.locations.deliveryFee')}</label>
          <div className='flex items-center gap-2 mt-1'>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              className='px-3 py-2 border border-borderColor rounded-md outline-none w-40'
              value={form.deliveryFee}
              onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })}
            />
            <span className='text-gray-600 text-sm'>{t('admin.locations.deliveryFeeHint')}</span>
          </div>
        </div>
        <div className='md:col-span-2 flex items-center gap-3'>
          <button type="submit" className='flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-md font-medium cursor-pointer'>
            <img src={assets.tick_icon} alt="" />
            {isLoading ? t('admin.locations.saving') : editingId ? t('admin.locations.update') : t('admin.locations.add')}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className='px-4 py-2.5 border border-borderColor rounded-md cursor-pointer'>
              {t('admin.common.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="max-w-5xl w-full rounded-md overflow-hidden border border-borderColor mt-8 bg-white">
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
    </div>
  )
}

export default ManageLocations
