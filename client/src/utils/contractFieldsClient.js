/** Desk-fabricated placeholder emails must never be used for customer email. */
export const isSyntheticWalkInEmail = (email) => {
  const value = String(email || '').trim().toLowerCase()
  if (!value) return false
  return value.endsWith('@local.americonfort') || value.startsWith('walkin+')
}

export default { isSyntheticWalkInEmail }
