import React, { useEffect, useState } from 'react'
import { AdminModal } from './ui/OwnerDialog'
import { Icon } from './ui/adminIcons'

const StampIcon = ({ className = 'h-5 w-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="9" r="4.25" />
    <path d="M7.5 13.5c-1.2.9-2 2.2-2 3.7V19h13v-1.8c0-1.5-.8-2.8-2-3.7" />
    <path d="M9 19h6" />
  </svg>
)

const ChoiceCard = ({
  selected,
  onSelect,
  icon,
  title,
  description,
  recommended = false,
  disabled = false,
  t,
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    disabled={disabled}
    onClick={onSelect}
    className={[
      'group relative w-full rounded-2xl border p-4 text-left transition-all duration-200',
      selected
        ? 'border-[var(--admin-accent)] bg-[color-mix(in_srgb,var(--admin-accent)_7%,white)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--admin-accent)_35%,transparent)]'
        : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-hover)]',
      disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
    ].join(' ')}
  >
    <div className="flex items-start gap-3.5">
      <div
        className={[
          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition',
          selected
            ? 'bg-[color-mix(in_srgb,var(--admin-accent)_14%,white)] text-[var(--admin-accent)]'
            : 'bg-[var(--admin-surface-2)] text-[var(--admin-fg-muted)] group-hover:text-[var(--admin-fg-secondary)]',
        ].join(' ')}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[var(--admin-fg)]">{title}</p>
          {recommended ? (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--admin-accent)_12%,white)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-accent)]">
              {t('admin.walkIn.stampModal.recommended')}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--admin-fg-muted)]">{description}</p>
      </div>
      <span
        className={[
          'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
          selected
            ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)] text-white'
            : 'border-[var(--admin-border-strong)] bg-white',
        ].join(' ')}
        aria-hidden
      >
        {selected ? (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2L4.8 8.5 9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
    </div>
  </button>
)

/**
 * Pre-create confirmation: include agency stamp & company signature on the contract PDF.
 */
const WalkInStampConfirmModal = ({
  open,
  onClose,
  onConfirm,
  loading = false,
  t,
}) => {
  const [choice, setChoice] = useState(true)

  useEffect(() => {
    if (open) setChoice(true)
  }, [open])

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      closeOnBackdrop={!loading}
      variant="center"
      size="md"
      title={t('admin.walkIn.stampModal.title')}
      description={t('admin.walkIn.stampModal.subtitle')}
      footer={
        <>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-modal-action"
            onClick={onClose}
            disabled={loading}
          >
            {t('admin.common.cancel')}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-modal-action"
            onClick={() => onConfirm(choice)}
            disabled={loading}
          >
            {loading
              ? t('admin.walkIn.saving')
              : choice
                ? t('admin.walkIn.stampModal.confirmWith')
                : t('admin.walkIn.stampModal.confirmWithout')}
          </button>
        </>
      }
    >
      <div
        role="radiogroup"
        aria-label={t('admin.walkIn.stampModal.title')}
        className="space-y-3"
      >
        <ChoiceCard
          selected={choice === true}
          onSelect={() => setChoice(true)}
          disabled={loading}
          recommended
          t={t}
          icon={<StampIcon className="h-5 w-5" />}
          title={t('admin.walkIn.stampModal.withTitle')}
          description={t('admin.walkIn.stampModal.withDesc')}
        />
        <ChoiceCard
          selected={choice === false}
          onSelect={() => setChoice(false)}
          disabled={loading}
          t={t}
          icon={<Icon name="file" className="h-5 w-5" />}
          title={t('admin.walkIn.stampModal.withoutTitle')}
          description={t('admin.walkIn.stampModal.withoutDesc')}
        />
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-[var(--admin-fg-muted)]">
        {t('admin.walkIn.stampModal.hint')}
      </p>
    </AdminModal>
  )
}

export default WalkInStampConfirmModal
