'use client';
// app/(dashboard)/leads/page.tsx — nitelenmemiş Lead tam CRUD + dönüştür (i18n).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { CrudFormModal, CrudField } from '@/components/organisms/CrudFormModal';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import type { UnqualifiedLead } from '@/types';

const tone: Record<string, 'gray' | 'blue' | 'green' | 'amber' | 'red'> = {
  NEW: 'blue',
  WORKING: 'amber',
  QUALIFIED: 'green',
  UNQUALIFIED: 'red',
  CONVERTED: 'gray',
};

const channelTone: Record<string, 'gray' | 'blue' | 'green' | 'amber' | 'red'> =
  {
    MANUAL: 'gray',
    IMPORT: 'amber',
    FORM: 'green',
    WEBHOOK: 'blue',
    API: 'gray',
  };

const CHANNELS = ['MANUAL', 'IMPORT', 'FORM', 'WEBHOOK', 'API'] as const;
const channelKey: Record<string, string> = {
  MANUAL: 'lead.chManual',
  IMPORT: 'lead.chImport',
  FORM: 'lead.chForm',
  WEBHOOK: 'lead.chWebhook',
  API: 'lead.chApi',
};

const BASE: CrudField[] = [
  { key: 'firstName', label: 'field.firstName', required: true },
  { key: 'lastName', label: 'field.lastName', required: true },
  { key: 'email', label: 'field.email', type: 'email' },
  { key: 'phone', label: 'field.phone', type: 'phone' },
  { key: 'companyName', label: 'field.companyName' },
  { key: 'source', label: 'field.source', placeholder: 'WEB / REFERRAL / EVENT' },
];

const STATUS_FIELD: CrudField = {
  key: 'status',
  label: 'field.status',
  type: 'select',
  options: ['NEW', 'WORKING', 'QUALIFIED', 'UNQUALIFIED'].map((s) => ({
    value: s,
    label: s,
  })),
};

export default function LeadsPage() {
  const { can } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UnqualifiedLead | null>(null);
  const [fChannel, setFChannel] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fSource, setFSource] = useState('');

  const leads = useQuery({
    queryKey: ['leads', fChannel, fStatus, fSource],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 50 };
      if (fChannel) params.channel = fChannel;
      if (fStatus) params.status = fStatus;
      if (fSource) params.source = fSource;
      return unwrap<UnqualifiedLead[]>(
        (await api.get('/leads', { params })).data,
      );
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['leads'] });

  const convert = useMutation({
    mutationFn: (id: string) => api.post(`/leads/${id}/convert`),
    onSuccess: invalidate,
  });

  const columns: Column<UnqualifiedLead>[] = [
    { key: 'name', header: t('col.name'), render: (r) => `${r.firstName} ${r.lastName}` },
    { key: 'company', header: t('col.company'), render: (r) => r.companyName ?? '—' },
    { key: 'source', header: t('col.source'), render: (r) => r.source ?? '—' },
    {
      key: 'channel',
      header: t('col.channel'),
      render: (r) => (
        <Badge tone={channelTone[r.channel] ?? 'gray'}>
          {t(channelKey[r.channel] ?? 'lead.chManual')}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: t('col.status'),
      render: (r) => <Badge tone={tone[r.status]}>{r.status}</Badge>,
    },
    {
      key: 'action',
      header: '',
      render: (r) =>
        can('lead.convert') && r.status !== 'CONVERTED' ? (
          <Button
            variant="secondary"
            className="px-2 py-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              convert.mutate(r.id);
            }}
            disabled={convert.isPending}
          >
            {t('act.convert')}
          </Button>
        ) : null,
    },
  ];

  return (
    <DashboardTemplate title="page.leads">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {can('lead.create') && (
          <Button onClick={() => setCreating(true)}>{t('btn.newLead')}</Button>
        )}
        <select
          value={fChannel}
          onChange={(e) => setFChannel(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          aria-label={t('lead.filterChannel')}
        >
          <option value="">
            {t('lead.filterChannel')}: {t('common.all')}
          </option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {t(channelKey[c])}
            </option>
          ))}
        </select>
        <select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          aria-label={t('field.status')}
        >
          <option value="">
            {t('field.status')}: {t('common.all')}
          </option>
          {['NEW', 'WORKING', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ),
          )}
        </select>
        <input
          value={fSource}
          onChange={(e) => setFSource(e.target.value)}
          placeholder={t('lead.filterSource')}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      {leads.isLoading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={leads.data ?? []}
          empty={t('common.empty')}
          onRowClick={can('lead.update') ? setEditing : undefined}
        />
      )}

      {creating && (
        <CrudFormModal
          title={t('m.newLead')}
          fields={BASE}
          submitLabel={t('common.create')}
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            await api.post('/leads', v);
            invalidate();
          }}
        />
      )}

      {editing && (
        <CrudFormModal
          title={t('m.editLead')}
          fields={[...BASE, STATUS_FIELD]}
          initial={{
            firstName: editing.firstName,
            lastName: editing.lastName,
            email: editing.email ?? '',
            phone: editing.phone ?? '',
            companyName: editing.companyName ?? '',
            source: editing.source ?? '',
            status: editing.status,
          }}
          onClose={() => setEditing(null)}
          onSubmit={async (v) => {
            await api.patch(`/leads/${editing.id}`, v);
            invalidate();
          }}
          onDelete={
            can('lead.delete')
              ? async () => {
                  await api.delete(`/leads/${editing.id}`);
                  invalidate();
                }
              : undefined
          }
        />
      )}
    </DashboardTemplate>
  );
}
