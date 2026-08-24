/**
 * Guest-only date helper for CompleteBooking.
 * Kept separate from admin documentFormUtils so the public signature page
 * does not share a hashed chunk with the owner panel (avoids deploy-skew 404s).
 */
export const toDateInput = (value) => {
  if (value === undefined || value === null) return ''
  const raw = String(value).trim()
  if (!raw || raw === '—' || raw === '-' || raw === 'N/A') return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
