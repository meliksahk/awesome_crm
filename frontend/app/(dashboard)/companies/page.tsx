'use client';
// app/(dashboard)/companies/page.tsx — şirket tam CRUD.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { CrudFormModal, CrudField } from '@/components/organisms/CrudFormModal';
import { Spinner } from '@/components/atoms/Spinner';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import type { Company } from '@/types';

const FIELDS: CrudField[] = [
  { key: 'name', label: 'Ad', required: true },
  { key: 'domain', label: 'Alan adı', placeholder: 'firma.com' },
  { key: 'industry', label: 'Sektör' },
  { key: 'phone', label: 'Telefon' },
  { key: 'website', label: 'Web sitesi', placeholder: 'https://…' },
];

export default function CompaniesPage() {
  const { can } = useAuth();
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
    { key: 'name', header: 'Şirket', render: (r) => r.name },
    { key: 'domain', header: 'Alan adı', render: (r) => r.domain ?? '—' },
    { key: 'industry', header: 'Sektör', render: (r) => r.industry ?? '—' },
    {
      key: 'contacts',
      header: 'Kişi',
      render: (r) => <Badge tone="indigo">{r.contactCount}</Badge>,
    },
  ];

  return (
    <DashboardTemplate title="Şirketler">
      {can('company.create') && (
        <div className="mb-4">
          <Button onClick={() => setCreating(true)}>+ Yeni şirket</Button>
        </div>
      )}

      {companies.isLoading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={companies.data ?? []}
          empty="Şirket yok"
          onRowClick={can('company.update') ? setEditing : undefined}
        />
      )}

      {creating && (
        <CrudFormModal
          title="Yeni şirket"
          fields={FIELDS}
          submitLabel="Oluştur"
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            await api.post('/companies', v);
            invalidate();
          }}
        />
      )}

      {editing && (
        <CrudFormModal
          title="Şirketi düzenle"
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
