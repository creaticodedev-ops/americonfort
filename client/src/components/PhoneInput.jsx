import React from 'react'
import PhoneInputBase from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { isPhoneValid } from '../utils/phoneValidation'

export { isPhoneValid }

const inputClass =
  'border border-borderColor px-3 py-2 rounded-lg w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30'

const PhoneInput = ({
  id,
  value,
  onChange,
  required = false,
  defaultCountry = 'MA',
  className = '',
  placeholder = '',
}) => (
  <PhoneInputBase
    id={id}
    international
    defaultCountry={defaultCountry}
    value={value || undefined}
    onChange={(next) => onChange(next || '')}
    className={`phone-input-field ${className}`}
    numberInputProps={{
      className: inputClass,
      required,
      placeholder,
    }}
  />
)

export default PhoneInput
