import { isValidPhoneNumber } from 'libphonenumber-js/min'

export const isPhoneValid = (value) => {
  if (!value) return false
  try {
    return isValidPhoneNumber(value)
  } catch {
    return false
  }
}
