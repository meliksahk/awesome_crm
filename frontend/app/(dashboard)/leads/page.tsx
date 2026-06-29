'use client';
// app/(dashboard)/leads/page.tsx — nitelenmemiş Lead tam CRUD + dönüştür.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
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

const BASE: CrudField[] = [
  { key: 'firstName', label: 'Ad', required: true },
  { key: 'lastName', label: 'Soyad', required: true },
  { key: 'email', label: 'E-posta', type: 'email' },
  { key: 'phone', label: 'Telefon' },
  { key: 'companyName', label: 'Şirket' },
  { key: 'source', label: 'Kaynak', placeholder: 'WEB / REFERRAL / EVENT' },
];

const STATUS_FIELD: CrudField = {
  key: 'status',
  label: 'Durum',
  type: 'select',
  options: ['NEW', 'WORKING', 'QUALIFIED', 'UNQUALIFIED'].map((s) => ({
    value: s,
    label: s,
  })),
};

export default function LeadsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UnqualifiedLead | null>(null);

  const leads = useQuery({
    queryKey: ['leads'],
    queryFn: async () =>
      unwrap<UnqualifiedLead[]>(
        (await api.get('/leads', { params: { limit: 50 } })).data,
      ),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['leads'] });

  const convert = useMutation({
    mutationFn: (id: string) => api.post(`/leads/${id}/convert`),
    onSuccess: invalidate,
  });

  const columns: Column<UnqualifiedLead>[] = [
    { key: 'name', header: 'Ad', render: (r) => `${r.firstName} ${r.lastName}` },
    { key: 'company', header: 'Şirket', render: (r) => r.companyName ?? '—' },
    { key: 'source', header: 'Kaynak', render: (r) => r.source ?? '—' },
    {
      key: 'status',
      header: 'Durum',
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
            Dönüştür
          </Button>
        ) : null,
    },
  ];

  return (
    <DashboardTemplate title="Lead'ler (nitelenmemiş)">
      {can('lead.create') && (
        <div className="mb-4">
          <Button onClick={() => setCreating(true)}>+ Yeni lead</Button>
        </div>
      )}

      {leads.isLoading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={leads.data ?? []}
          empty="Lead yok"
          onRowClick={can('lead.update') ? setEditing : undefined}
        />
      )}

      {creating && (
        <CrudFormModal
          title="Yeni lead"
          fields={BASE}
          submitLabel="Oluştur"
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            await api.post('/leads', v);
            invalidate();
          }}
        />
      )}

      {editing && (
        <CrudFormModal
          title="Lead düzenle"
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
