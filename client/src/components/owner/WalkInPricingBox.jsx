import React from 'react'

/**
 * Compact Walk-in pricing panel: original → remise → final.
 */
const WalkInPricingBox = ({
  quote,
  currency,
  discount,
  onDiscountChange,
  t,
}) => {
  if (!quote) {
    return (
      <div className="rounded-2xl border border-borderColor bg-gradient-to-b from-white to-sand/30 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink mb-2">{t('admin.walkIn.estimate')}</h2>
        <p className="text-sm text-muted">{t('admin.walkIn.estimateHint')}</p>
      </div>
    )
  }

  const type = discount?.type === 'percentage' ? 'percentage' : 'fixed'
  const value = discount?.value ?? ''
  const hasDiscount = Number(quote.discountAmount) > 0
  const formatMoney = (n) => `${currency}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

  return (
    <div className="rounded-2xl border border-borderColor bg-gradient-to-b from-white to-sand/30 p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{t('admin.walkIn.estimate')}</h2>
        <p className="mt-0.5 text-[11px] text-[var(--admin-fg-muted)]">{t('admin.walkIn.pricingHint')}</p>
      </div>

      <ul className="space-y-2 text-sm text-gray-600">
        <li className="flex justify-between gap-3">
          <span>{t('admin.walkIn.days', { count: quote.days })}</span>
          <span>{formatMoney(quote.rental)}</span>
        </li>
        {quote.pickupFee > 0 && (
          <li className="flex justify-between gap-3">
            <span>{t('admin.walkIn.pickupFee')}</span>
            <span>{formatMoney(quote.pickupFee)}</span>
          </li>
        )}
        {quote.dropoffFee > 0 && (
          <li className="flex justify-between gap-3">
            <span>{t('admin.walkIn.returnFee')}</span>
            <span>{formatMoney(quote.dropoffFee)}</span>
          </li>
        )}
      </ul>

      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
            {t('admin.walkIn.discountSection')}
          </p>
          <div className="inline-flex rounded-lg border border-[var(--admin-border)] p-0.5 text-xs">
            <button
              type="button"
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                type === 'fixed'
                  ? 'bg-[var(--admin-accent)] text-white'
                  : 'text-[var(--admin-fg-muted)] hover:text-ink'
              }`}
              onClick={() => onDiscountChange({ type: 'fixed', value })}
            >
              {currency.trim() || 'MAD'}
            </button>
            <button
              type="button"
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                type === 'percentage'
                  ? 'bg-[var(--admin-accent)] text-white'
                  : 'text-[var(--admin-fg-muted)] hover:text-ink'
              }`}
              onClick={() => onDiscountChange({ type: 'percentage', value })}
            >
              %
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="number"
            min="0"
            max={type === 'percentage' ? 100 : undefined}
            step={type === 'percentage' ? '0.1' : '1'}
            inputMode="decimal"
            className="w-full rounded-xl border border-borderColor bg-white px-3 py-2.5 pr-12 text-sm text-ink outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            value={value === '' || value == null ? '' : value}
            placeholder="0"
            onChange={(e) => {
              const raw = e.target.value
              onDiscountChange({
                type,
                value: raw === '' ? '' : raw,
              })
            }}
            aria-label={t('admin.walkIn.discountSection')}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-[var(--admin-fg-muted)]">
            {type === 'percentage' ? '%' : (currency.trim() || 'MAD')}
          </span>
        </div>

        {quote.error === 'exceeds' && (
          <p className="text-[11px] text-[var(--admin-warning)]">{t('admin.walkIn.discountExceeds')}</p>
        )}
        <p className="text-[11px] text-[var(--admin-fg-muted)]">{t('admin.walkIn.discountHint')}</p>
      </div>

      <div className="rounded-xl bg-[#161210] text-white p-3 space-y-2">
        <div className="flex justify-between gap-3 text-sm text-white/70">
          <span>{t('admin.walkIn.originalPrice')}</span>
          <span className={hasDiscount ? 'line-through decoration-white/40' : ''}>
            {formatMoney(quote.subtotal)}
          </span>
        </div>
        <div className={`flex justify-between gap-3 text-sm ${hasDiscount ? 'text-emerald-300' : 'text-white/50'}`}>
          <span>{t('admin.walkIn.discountAmount')}</span>
          <span>{hasDiscount ? `−${formatMoney(quote.discountAmount)}` : formatMoney(0)}</span>
        </div>
        <div className="flex justify-between gap-3 border-t border-white/15 pt-2 text-base font-semibold">
          <span>{t('admin.walkIn.finalPrice')}</span>
          <span>{formatMoney(quote.total)}</span>
        </div>
      </div>

      {quote.franchise > 0 && (
        <p className="text-[11px] text-muted flex justify-between gap-3">
          <span>{t('admin.walkIn.franchiseAmount')}</span>
          <span>{formatMoney(quote.franchise)}</span>
        </p>
      )}
    </div>
  )
}

export default WalkInPricingBox
