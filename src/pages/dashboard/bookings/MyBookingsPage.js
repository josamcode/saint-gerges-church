import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, NotebookPen } from 'lucide-react';
import { Link } from 'react-router-dom';

import { bookingsApi } from '../../../api/endpoints';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Card from '../../../components/ui/Card';
import Pagination from '../../../components/ui/Pagination';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import { useI18n } from '../../../i18n/i18n';

function statusVariant(status) {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'confirmed':
      return 'primary';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'warning';
  }
}

function statusLabel(status, tf) {
  switch (status) {
    case 'confirmed':
      return tf('bookings.dashboard.statuses.confirmed', 'Approved');
    case 'completed':
      return tf('bookings.dashboard.statuses.completed', 'Completed');
    case 'cancelled':
      return tf('bookings.dashboard.statuses.cancelled', 'Rejected');
    case 'pending':
    default:
      return tf('bookings.dashboard.statuses.pending', 'Pending');
  }
}

function formatAdditionalValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    if (value.url) return value.url;
    return JSON.stringify(value);
  }
  return String(value);
}

export default function MyBookingsPage() {
  const { t } = useI18n();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [status, setStatus] = useState('');
  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([null]);

  useEffect(() => {
    setCursor(null);
    setCursorStack([null]);
  }, [status]);

  const myBookingsQuery = useQuery({
    queryKey: ['bookings', 'mine', cursor, status],
    keepPreviousData: true,
    queryFn: async () => {
      const { data } = await bookingsApi.self.list({
        limit: 12,
        order: 'desc',
        ...(cursor ? { cursor } : {}),
        ...(status ? { status } : {}),
      });
      return data;
    },
  });

  const bookings = Array.isArray(myBookingsQuery.data?.data) ? myBookingsQuery.data.data : [];
  const meta = myBookingsQuery.data?.meta || null;

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: tf('bookings.dashboard.myPage', 'My bookings') },
        ]}
      />

      <PageHeader
        eyebrow={tf('bookings.dashboard.myEyebrow', 'Booking tracking')}
        title={tf('bookings.dashboard.myTitle', 'My bookings')}
        subtitle={tf(
          'bookings.dashboard.mySubtitle',
          'See the status of the bookings you submitted and read any notes left by the manager.'
        )}
        actions={(
          <Link
            to="/bookings/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-primary-dark"
          >
            <NotebookPen className="h-4 w-4" />
            {tf('bookings.public.submitAnother', 'Book a new appointment')}
          </Link>
        )}
      />

      <Card className="rounded-3xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label={tf('bookings.dashboard.statusFilter', 'Status')}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={[
              { value: '', label: tf('bookings.dashboard.allStatuses', 'All statuses') },
              { value: 'pending', label: statusLabel('pending', tf) },
              { value: 'confirmed', label: statusLabel('confirmed', tf) },
              { value: 'completed', label: statusLabel('completed', tf) },
              { value: 'cancelled', label: statusLabel('cancelled', tf) },
            ]}
            containerClassName="mb-0"
          />
        </div>
      </Card>

      {bookings.length === 0 ? (
        <Card className="rounded-3xl text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-4 text-lg font-semibold text-heading">
            {tf('bookings.dashboard.myEmptyTitle', 'No bookings yet')}
          </p>
          <p className="mt-2 text-sm text-muted">
            {tf(
              'bookings.dashboard.myEmptyBody',
              'Once you submit a booking while signed in, it will appear here with its approval status.'
            )}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {bookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-3xl border border-border bg-surface p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-heading">
                    {booking.bookingType?.name || tf('bookings.dashboard.bookingType', 'Booking type')}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {booking.scheduledTime
                      ? `${booking.scheduledDate} • ${booking.scheduledTime}`
                      : booking.scheduledDate}
                  </p>
                </div>
                <Badge variant={statusVariant(booking.status)}>
                  {statusLabel(booking.status, tf)}
                </Badge>
              </div>

              {booking.notes ? (
                <div className="mt-4 rounded-2xl border border-border bg-surface-alt/35 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {tf('bookings.dashboard.notes', 'Public notes')}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                    {booking.notes}
                  </p>
                </div>
              ) : null}

              {booking.adminNotes ? (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {tf('bookings.dashboard.adminNotes', 'Admin notes')}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                    {booking.adminNotes}
                  </p>
                </div>
              ) : null}

              {(booking.additionalFields || []).length ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-heading">
                    {tf('bookings.dashboard.additionalFields', 'Additional fields')}
                  </p>
                  {booking.additionalFields.map((field) => (
                    <div
                      key={field.key}
                      className="rounded-2xl border border-border bg-surface-alt/35 p-3"
                    >
                      <p className="text-sm font-semibold text-heading">{field.label}</p>
                      {field.type === 'image' &&
                      typeof field.value === 'object' &&
                      field.value?.url ? (
                        <a
                          href={field.value.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block"
                        >
                          <img
                            src={field.value.url}
                            alt={field.label}
                            className="max-h-56 rounded-2xl border border-border object-contain shadow-sm transition-transform duration-200 hover:scale-[1.01]"
                          />
                        </a>
                      ) : (
                        <p className="mt-2 text-sm text-muted">
                          {formatAdditionalValue(field.value)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <Card className="rounded-3xl">
        <Pagination
          meta={meta}
          loading={myBookingsQuery.isFetching}
          cursors={cursorStack}
          onLoadMore={() => {
            if (!meta?.nextCursor) return;
            setCursorStack((current) => [...current, meta.nextCursor]);
            setCursor(meta.nextCursor);
          }}
          onPrev={() => {
            setCursorStack((current) => {
              const next = current.slice(0, -1);
              setCursor(next[next.length - 1] || null);
              return next;
            });
          }}
        />
      </Card>
    </div>
  );
}
