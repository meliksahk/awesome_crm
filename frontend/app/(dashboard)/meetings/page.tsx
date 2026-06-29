'use client';
// app/(dashboard)/meetings/page.tsx — toplantı tam CRUD (i18n).
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { CrudFormModal, CrudField } from '@/components/organisms/CrudFormModal';
import { Spinner } from '@/components/atoms/Spinner';
import { Button } from '@/components/atoms/Button';

interface Meeting {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  notes: string | null;
}

const FIELDS: CrudField[] = [
  { key: 'title', label: 'field.subject', required: true },
  { key: 'startsAt', label: 'field.startsAt', type: 'datetime', required: true },
  { key: 'endsAt', label: 'field.endsAt', type: 'datetime', required: true },
  { key: 'location', label: 'field.location' },
  { key: 'notes', label: 'field.notes', type: 'textarea' },
];

// ISO → datetime-local ('YYYY-MM-DDTHH:mm', yerel saat)
const toLocal = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
};
const fmt = (iso: string) => new Date(iso).toLocaleString();

export default function MeetingsPage() {
  const { can } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);

  const meetings = useQuery({
    queryKey: ['meetings'],
    queryFn: async () =>
      unwrap<Meeting[]>(
        (await api.get('/meetings', { params: { limit: 50 } })).data,
      ),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['meetings'] });

  const columns: Column<Meeting>[] = [
    { key: 'title', header: t('field.subject'), render: (r) => r.title },
    { key: 'startsAt', header: t('field.startsAt'), render: (r) => fmt(r.startsAt) },
    { key: 'endsAt', header: t('field.endsAt'), render: (r) => fmt(r.endsAt) },
    { key: 'location', header: t('field.location'), render: (r) => r.location ?? '—' },
  ];

  return (
    <DashboardTemplate title="page.meetings">
      {can('meeting.create') && (
        <div className="mb-4">
          <Button onClick={() => setCreating(true)}>{t('btn.newMeeting')}</Button>
        </div>
      )}

      {meetings.isLoading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={meetings.data ?? []}
          empty={t('common.empty')}
          onRowClick={can('meeting.update') ? setEditing : undefined}
        />
      )}

      {creating && (
        <CrudFormModal
          title={t('m.newMeeting')}
          fields={FIELDS}
          submitLabel={t('common.create')}
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            await api.post('/meetings', v);
            invalidate();
          }}
        />
      )}

      {editing && (
        <CrudFormModal
          title={t('m.editMeeting')}
          fields={FIELDS}
          initial={{
            title: editing.title,
            startsAt: toLocal(editing.startsAt),
            endsAt: toLocal(editing.endsAt),
            location: editing.location ?? '',
            notes: editing.notes ?? '',
          }}
          onClose={() => setEditing(null)}
          onSubmit={async (v) => {
            await api.patch(`/meetings/${editing.id}`, v);
            invalidate();
          }}
          onDelete={
            can('meeting.delete')
              ? async () => {
                  await api.delete(`/meetings/${editing.id}`);
                  invalidate();
                }
              : undefined
          }
        />
      )}
    </DashboardTemplate>
  );
}
