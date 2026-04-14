import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { bookingsApi } from '../../../api/endpoints';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import PageHeader from '../../../components/ui/PageHeader';
import { useI18n } from '../../../i18n/i18n';
import { availabilityLabel } from './bookingTypeForm.utils';

export default function BookingTypesPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const typesQuery = useQuery({
    queryKey: ['bookings', 'types'],
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await bookingsApi.admin.listTypes();
      return data;
    },
  });

  const bookingTypes = Array.isArray(typesQuery.data?.data) ? typesQuery.data.data : [];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: tf('bookings.dashboard.typesPage', 'Booking types') },
        ]}
      />

      <PageHeader
        eyebrow={tf('bookings.dashboard.typesEyebrow', 'Booking configuration')}
        title={tf('bookings.dashboard.typesTitle', 'Booking types')}
        subtitle={tf(
          'bookings.dashboard.typesListSubtitle',
          'Review existing booking types and open the dedicated form to create or edit them.'
        )}
        actions={(
          <Button
            type="button"
            icon={Plus}
            onClick={() => navigate('/dashboard/bookings/types/new')}
          >
            {tf('bookings.dashboard.createNewType', 'Create new type')}
          </Button>
        )}
      />

      {typesQuery.isLoading ? (
        <Card className="rounded-3xl">
          <p className="text-sm text-muted">{t('common.loading')}</p>
        </Card>
      ) : bookingTypes.length === 0 ? (
        <Card className="rounded-3xl text-center">
          <p className="text-lg font-semibold text-heading">
            {tf('bookings.dashboard.noTypesTitle', 'No booking types yet')}
          </p>
          <p className="mt-2 text-sm text-muted">
            {tf(
              'bookings.dashboard.noTypesBody',
              'Create the first booking type to configure availability rules and public fields.'
            )}
          </p>
          <div className="mt-5">
            <Button
              type="button"
              icon={Plus}
              onClick={() => navigate('/dashboard/bookings/types/new')}
            >
              {tf('bookings.dashboard.createNewType', 'Create new type')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {bookingTypes.map((type) => (
            <Card key={type.id} className="rounded-3xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-heading">{type.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {availabilityLabel(type.availabilityMode, tf)}
                  </p>
                </div>
                <Badge variant={type.isActive ? 'success' : 'default'}>
                  {type.isActive
                    ? tf('bookings.dashboard.active', 'active')
                    : tf('bookings.dashboard.inactive', 'inactive')}
                </Badge>
              </div>

              {type.description ? (
                <p className="mt-3 text-sm leading-6 text-muted">{type.description}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                <span className="rounded-full bg-surface-alt px-3 py-1">
                  {type.durationMinutes} min
                </span>
                <span className="rounded-full bg-surface-alt px-3 py-1">
                  cap {type.capacity}
                </span>
                <span className="rounded-full bg-surface-alt px-3 py-1">
                  {(type.dynamicFields || []).length} fields
                </span>
              </div>

              <div className="mt-5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Pencil}
                  onClick={() => navigate(`/dashboard/bookings/types/${type.id}/edit`)}
                >
                  {tf('bookings.dashboard.editType', 'Edit type')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
