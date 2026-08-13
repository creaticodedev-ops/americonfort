import React, { useEffect, useMemo, useState } from 'react';
import ChannelBadge from '../../components/owner/ChannelBadge';
import StatusBadge from '../../components/owner/StatusBadge';
import {
  AdminPage,
  PageHeader,
  SegmentedControl,
  EmptyState,
  Skeleton,
  AdminModal,
} from '../../components/owner/ui';
import { useAppContext } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiError';
import { Link } from 'react-router-dom';

const views = [
  { id: 'month', labelKey: 'admin.calendar.month' },
  { id: 'week', labelKey: 'admin.calendar.week' },
  { id: 'day', labelKey: 'admin.calendar.day' },
];

const BookingCalendar = () => {
  const { axios } = useAppContext();
  const { t } = useI18n();
  const now = new Date();
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const month = cursor.getMonth() + 1;
  const year = cursor.getFullYear();

  useEffect(() => {
    const fetchCalendar = async () => {
      setLoading(true);
      try {
        const months = view === 'month' ? [month] : [month === 1 ? 12 : month - 1, month, month === 12 ? 1 : month + 1];
        const yearsFor = months.map((m, i) => {
          if (view === 'month') return year;
          if (i === 0 && month === 1) return year - 1;
          if (i === 2 && month === 12) return year + 1;
          return year;
        });

        const responses = await Promise.all(
          [...new Set(months.map((m, i) => `${yearsFor[i]}-${m}`))].map(async (key) => {
            const [y, m] = key.split('-').map(Number);
            const { data } = await axios.get(`/api/bookings/owner/calendar?month=${m}&year=${y}`);
            return data.success ? data.bookings : [];
          }),
        );
        const merged = [];
        const seen = new Set();
        for (const list of responses) {
          for (const b of list) {
            if (!seen.has(b._id)) {
              seen.add(b._id);
              merged.push(b);
            }
          }
        }
        setBookings(merged);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    fetchCalendar();
  }, [month, year, view, axios]);

  const shift = (delta) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + delta);
    else if (view === 'week') d.setDate(d.getDate() + delta * 7);
    else d.setDate(d.getDate() + delta);
    setCursor(d);
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const bookingsOnDay = (date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    return bookings.filter((b) => {
      const start = new Date(b.pickupDate);
      const end = new Date(b.returnDate);
      return start <= dayEnd && end >= dayStart;
    });
  };

  const weekDays = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(cursor.getDate() - cursor.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const headerLabel = view === 'month'
    ? cursor.toLocaleString('default', { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `Week of ${weekDays[0].toLocaleDateString()}`
      : cursor.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const viewOptions = views.map((v) => ({ id: v.id, label: t(v.labelKey) }));

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.calendar.title')}
        description={t('admin.calendar.subtitle')}
        actions={
          <Link to="/owner/manage-bookings" className="admin-btn admin-btn--secondary">
            {t('admin.menu.reservations')}
          </Link>
        }
      />

      <div className="admin-panel min-w-0">
        <div className="admin-panel-header flex-col gap-3 sm:flex-row">
          <div className="admin-action-rail">
            <button type="button" onClick={() => shift(-1)} className="admin-btn admin-btn--secondary">{t('admin.calendar.prev')}</button>
            <button type="button" onClick={() => setCursor(new Date())} className="admin-btn admin-btn--secondary">{t('admin.calendar.today')}</button>
            <button type="button" onClick={() => shift(1)} className="admin-btn admin-btn--secondary">{t('admin.calendar.next')}</button>
          </div>
          <h2 className="admin-panel-title text-center flex-1">{headerLabel}</h2>
          <SegmentedControl options={viewOptions} value={view} onChange={setView} ariaLabel="Calendar view" />
        </div>

        <div className="admin-panel-body">
          {loading ? (
            <Skeleton className="h-64 w-full rounded-[var(--admin-radius-lg)]" />
          ) : view === 'month' ? (
            <div className="max-lg:overflow-x-auto">
              <div className="max-lg:min-w-[560px]">
                <div className="mb-2 grid grid-cols-7 gap-1 text-xs text-[var(--admin-fg-muted)]">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-1 text-center font-medium">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-16 rounded-[var(--admin-radius)] bg-[var(--admin-surface-2)] md:min-h-20" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const date = new Date(year, month - 1, day);
                    const dayBookings = bookingsOnDay(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <button
                        type="button"
                        key={day}
                        className={`min-h-16 rounded-[var(--admin-radius)] border p-1.5 text-left text-sm transition hover:border-[color-mix(in_srgb,var(--admin-accent)_40%,var(--admin-border))] md:min-h-20 ${
                          isToday
                            ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]'
                            : 'border-[var(--admin-border)] bg-[var(--admin-surface)]'
                        }`}
                        onClick={() => { setCursor(date); setView('day'); }}
                      >
                        <p className="text-sm font-medium text-[var(--admin-fg)]">{day}</p>
                        {dayBookings.slice(0, 2).map((b) => (
                          <span
                            key={b._id}
                            role="presentation"
                            className="mt-1 block truncate rounded px-1 text-[10px] leading-tight"
                            onClick={(e) => { e.stopPropagation(); setSelected(b); }}
                          >
                            <StatusBadge status={b.status} label={`${b.car?.brand || ''} ${b.car?.model || ''}`.trim() || b.status} />
                          </span>
                        ))}
                        {dayBookings.length > 2 && (
                          <p className="text-[10px] text-[var(--admin-fg-muted)]">+{dayBookings.length - 2} more</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : view === 'week' ? (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
              {weekDays.map((date) => {
                const dayBookings = bookingsOnDay(date);
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={date.toISOString()}
                    className={`min-h-40 rounded-[var(--admin-radius-lg)] border p-2 ${
                      isToday
                        ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]'
                        : 'border-[var(--admin-border)] bg-[var(--admin-surface)]'
                    }`}
                  >
                    <button type="button" onClick={() => { setCursor(date); setView('day'); }} className="w-full cursor-pointer text-left">
                      <p className="text-xs text-[var(--admin-fg-muted)]">{date.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                      <p className="font-semibold text-[var(--admin-fg)]">{date.getDate()}</p>
                    </button>
                    <div className="mt-2 space-y-1">
                      {dayBookings.map((b) => (
                        <button
                          key={b._id}
                          type="button"
                          onClick={() => setSelected(b)}
                          className="w-full cursor-pointer truncate rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-1.5 py-1 text-left text-[10px]"
                        >
                          {b.customerName || b.reservationId}
                        </button>
                      ))}
                      {!dayBookings.length && <p className="text-[10px] text-[var(--admin-fg-muted)]">—</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {bookingsOnDay(cursor).length === 0 ? (
                <EmptyState icon="calendar" title={t('admin.calendar.noDay')} />
              ) : (
                bookingsOnDay(cursor).map((b) => (
                  <button
                    key={b._id}
                    type="button"
                    onClick={() => setSelected(b)}
                    className="w-full cursor-pointer rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 text-left hover:bg-[var(--admin-surface-hover)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[var(--admin-fg)]">{b.reservationId || t('admin.bookings.reservation')}</p>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 text-sm text-[var(--admin-fg-secondary)]">{b.customerName} · {b.car?.brand} {b.car?.model}</p>
                    <p className="mt-1 text-xs text-[var(--admin-fg-muted)]">
                      {new Date(b.pickupDate).toLocaleString()} → {new Date(b.returnDate).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <AdminModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.reservationId || 'Reservation'}
        size="sm"
        footer={
          <>
            <Link to="/owner/manage-bookings" className="admin-btn admin-btn--secondary" onClick={() => setSelected(null)}>
              {t('admin.leftover.openReservations')}
            </Link>
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => setSelected(null)}>
              {t('admin.calendar.close')}
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-2 text-sm text-[var(--admin-fg-secondary)]">
            <ChannelBadge channel={selected.channel || 'online'} />
            <p><span className="font-medium text-[var(--admin-fg)]">{t('admin.bookings.customer')}:</span> {selected.customerName}</p>
            <p><span className="font-medium text-[var(--admin-fg)]">{t('admin.bookings.vehicle')}:</span> {selected.car?.brand} {selected.car?.model}</p>
            <p><span className="font-medium text-[var(--admin-fg)]">{t('admin.details.pickup')}:</span> {new Date(selected.pickupDate).toLocaleString()}</p>
            <p><span className="font-medium text-[var(--admin-fg)]">{t('admin.details.return')}:</span> {new Date(selected.returnDate).toLocaleString()}</p>
            <StatusBadge status={selected.status} />
          </div>
        )}
      </AdminModal>
    </AdminPage>
  );
};

export default BookingCalendar;
