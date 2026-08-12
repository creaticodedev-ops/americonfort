import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'
import { getErrorMessage } from '../../utils/apiError'

/**
 * Contract extension modal — preview then confirm via dedicated API
 * (never uses generic updateBooking).
 */
const ContractExtensionModal = ({ booking, onClose, onExtended }) => {
  const { axios, currency, hasPermission } = useAppContext()
  const cur = (currency || 'MAD ').trim()
  const [newReturnDate, setNewReturnDate] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (!hasPermission('contract_extensions')) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <p className="text-sm text-gray-600">You do not have permission to extend contracts.</p>
          <button type="button" className="mt-4 text-sm text-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  const runPreview = async () => {
    if (!newReturnDate) return toast.error('Choose a new return date/time')
    setLoading(true)
    setPreview(null)
    try {
      const { data } = await axios.post('/api/owner/booking-extensions/preview', {
        bookingId: booking._id,
        newReturnDate,
      })
      if (!data.success) throw new Error(data.message)
      setPreview(data.preview)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const confirm = async () => {
    if (!preview) return
    if (!window.confirm('Confirm this contract extension? A history record will be created.')) return
    setConfirming(true)
    try {
      const { data } = await axios.post('/api/owner/booking-extensions/confirm', {
        bookingId: booking._id,
        newReturnDate,
        reason,
        notes,
      })
      if (!data.success) throw new Error(data.message)
      toast.success('Contract extended')
      onExtended?.(data)
      onClose()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setConfirming(false)
    }
  }

  const minReturn = booking.returnDate
    ? new Date(new Date(booking.returnDate).getTime() + 60_000).toISOString().slice(0, 16)
    : ''

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Extend contract</h2>
        <p className="text-sm text-gray-500 mt-1">
          {booking.reservationId} · current return {booking.returnDate ? new Date(booking.returnDate).toLocaleString() : '—'}
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-gray-600">New return date/time</label>
          <input
            type="datetime-local"
            className="w-full h-10 px-3 rounded-lg border border-borderColor text-sm"
            min={minReturn}
            value={newReturnDate}
            onChange={(e) => { setNewReturnDate(e.target.value); setPreview(null) }}
          />
          <input
            className="w-full h-10 px-3 rounded-lg border border-borderColor text-sm"
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <textarea
            className="w-full min-h-[70px] px-3 py-2 rounded-lg border border-borderColor text-sm"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {preview && (
          <div className="mt-4 rounded-xl bg-gray-50 border border-borderColor p-4 text-sm space-y-1">
            <p>Original period: {new Date(preview.originalPickupDate).toLocaleString()} → {new Date(preview.previousReturnDate).toLocaleString()}</p>
            <p>Extension to: {new Date(preview.newReturnDate).toLocaleString()}</p>
            <p>Additional days: <strong>{preview.additionalDays}</strong></p>
            <p>Additional amount: <strong>{cur}{preview.additionalAmount}</strong></p>
            <p>Previous total: {cur}{preview.previousTotal}</p>
            <p>New total: <strong>{cur}{preview.newTotal}</strong></p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="h-10 px-4 rounded-lg border text-sm" onClick={onClose}>Cancel</button>
          <button type="button" disabled={loading} className="h-10 px-4 rounded-lg border border-primary text-primary text-sm" onClick={runPreview}>
            {loading ? 'Calculating…' : 'Preview'}
          </button>
          <button type="button" disabled={!preview || confirming} className="h-10 px-4 rounded-lg bg-primary text-white text-sm disabled:opacity-40" onClick={confirm}>
            {confirming ? 'Confirming…' : 'Confirm extension'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ContractExtensionModal
