import React from 'react'
import { DateField } from '../../date/DateField'

/** Shared CRUD form layout — mobile-first, stacks on small screens. */
export const AdminForm = ({ children, className = '', onSubmit, id }) => (
  <form
    id={id}
    className={`admin-form ${className}`.trim()}
    onSubmit={onSubmit}
    noValidate
  >
    {children}
  </form>
)

export const AdminFormSection = ({ title, description, children, panel = false }) => (
  <section className={`admin-form-section${panel ? ' admin-form-section--panel' : ''}`}>
    {title ? <h3 className="admin-form-section-title">{title}</h3> : null}
    {description ? <p className="admin-form-section-desc">{description}</p> : null}
    <div className="admin-form-section-body">{children}</div>
  </section>
)

/** Responsive grid: 1 column on mobile, 2+ on sm+ */
export const AdminFormGrid = ({ children, columns = 2, className = '' }) => (
  <div className={`admin-form-grid admin-form-grid--${columns} ${className}`.trim()}>{children}</div>
)

export const AdminFormField = ({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
  className = '',
}) => (
  <div className={`admin-form-field ${className}`.trim()}>
    {label ? (
      <label className="admin-form-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="admin-form-required" aria-hidden="true"> *</span> : null}
      </label>
    ) : null}
    {children}
    {hint ? <p className="admin-form-hint">{hint}</p> : null}
    {error ? (
      <p className="admin-form-error" role="alert">
        {error}
      </p>
    ) : null}
  </div>
)

const controlClass = (extra = '') => `admin-form-control${extra ? ` ${extra}` : ''}`

export const AdminFormInput = ({ className = '', type, ...props }) => {
  if (type === 'date') {
    return (
      <DateField
        variant="admin"
        className={className}
        value={props.value ?? ''}
        onChange={props.onChange}
        min={props.min}
        max={props.max}
        disabled={props.disabled}
        id={props.id}
        name={props.name}
        aria-label={props['aria-label']}
        placeholder={props.placeholder}
      />
    )
  }
  return <input type={type} className={controlClass(className)} {...props} />
}

export const AdminFormTextarea = ({ className = '', rows = 3, ...props }) => (
  <textarea className={`${controlClass(className)} admin-form-control--textarea`} rows={rows} {...props} />
)

export const AdminFormSelect = ({ className = '', children, ...props }) => (
  <select className={controlClass(className)} {...props}>
    {children}
  </select>
)

export const AdminFormCheckbox = ({ label, checked, onChange, disabled = false, id }) => (
  <label className={`admin-form-check${disabled ? ' is-disabled' : ''}`} htmlFor={id}>
    <input
      id={id}
      type="checkbox"
      className="admin-form-check-input"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
    <span className="admin-form-check-label">{label}</span>
  </label>
)

export default AdminForm
