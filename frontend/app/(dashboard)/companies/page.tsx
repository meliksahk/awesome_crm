'use client';
// app/(dashboard)/companies/page.tsx — şirket tam CRUD (i18n).
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { CrudFormModal, CrudField } from '@/components/organisms/CrudFormModal';
import { Spinner } from '@/components/atoms/Spinner';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import type { Company } from '@/types';

const FIELDS: CrudField[] = [
  { key: 'name', label: 'field.name', required: true },
  { key: 'domain', label: 'field.domain', placeholder: 'firma.com' },
  { key: 'industry', label: 'field.industry' },
  { key: 'phone', label: 'field.phone', type: 'phone' },
  { key: 'website', label: 'field.website', placeholder: 'https://…' },
];

export default function CompaniesPage() {
  const { can } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const companies = useQuery({
    queryKey: ['companies'],
    queryFn: async () =>
      unwrap<Company[]>(
        (await api.get('/companies', { params: { limit: 50 } })).data,
      ),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['companies'] });

  const columns: Column<Company>[] = [
    { key: 'name', header: t('col.company'), render: (r) => r.name },
    { key: 'domain', header: t('col.domain'), render: (r) => r.domain ?? '—' },
    { key: 'industry', header: t('col.industry'), render: (r) => r.industry ?? '—' },
    {
      key: 'contacts',
      header: t('col.contactsCount'),
      render: (r) => <Badge tone="indigo">{r.contactCount}</Badge>,
    },
  ];

  return (
    <DashboardTemplate title="page.companies">
      {can('company.create') && (
        <div className="mb-4">
          <Button onClick={() => setCreating(true)}>{t('btn.newCompany')}</Button>
        </div>
      )}

      {companies.isLoading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={companies.data ?? []}
          empty={t('common.empty')}
          onRowClick={can('company.update') ? setEditing : undefined}
        />
      )}

      {creating && (
        <CrudFormModal
          title={t('m.newCompany')}
          fields={FIELDS}
          submitLabel={t('common.create')}
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            await api.post('/companies', v);
            invalidate();
          }}
        />
      )}

      {editing && (
        <CrudFormModal
          title={t('m.editCompany')}
          fields={FIELDS}
          initial={{
            name: editing.name,
            domain: editing.domain ?? '',
            industry: editing.industry ?? '',
            phone: editing.phone ?? '',
            website: editing.website ?? '',
          }}
          onClose={() => setEditing(null)}
          onSubmit={async (v) => {
            await api.patch(`/companies/${editing.id}`, v);
            invalidate();
          }}
          onDelete={
            can('company.delete')
              ? async () => {
                  await api.delete(`/companies/${editing.id}`);
                  invalidate();
                }
              : undefined
          }
        />
      )}
    </DashboardTemplate>
  );
}
