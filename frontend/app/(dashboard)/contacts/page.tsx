'use client';
// app/(dashboard)/contacts/page.tsx — kişi tam CRUD (şirket seçicili).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { CrudFormModal, CrudField } from '@/components/organisms/CrudFormModal';
import { Spinner } from '@/components/atoms/Spinner';
import { Button } from '@/components/atoms/Button';
import type { Company, Contact } from '@/types';

export default function ContactsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const contacts = useQuery({
    queryKey: ['contacts'],
    queryFn: async () =>
      unwrap<Contact[]>(
        (await api.get('/contacts', { params: { limit: 50 } })).data,
      ),
  });

  const companies = useQuery({
    queryKey: ['companies-options'],
    enabled: can('company.read'),
    queryFn: async () =>
      unwrap<Company[]>(
        (await api.get('/companies', { params: { limit: 100 } })).data,
      ),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contacts'] });

  const fields: CrudField[] = [
    { key: 'firstName', label: 'Ad', required: true },
    { key: 'lastName', label: 'Soyad', required: true },
    { key: 'email', label: 'E-posta', type: 'email' },
    { key: 'phone', label: 'Telefon' },
    { key: 'title', label: 'Ünvan' },
    {
      key: 'companyId',
      label: 'Şirket',
      type: 'select',
      options: (companies.data ?? []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    },
  ];

  const columns: Column<Contact>[] = [
    { key: 'name', header: 'Ad', render: (r) => `${r.firstName} ${r.lastName}` },
    { key: 'email', header: 'E-posta', render: (r) => r.email ?? '—' },
    { key: 'title', header: 'Ünvan', render: (r) => r.title ?? '—' },
    { key: 'company', header: 'Şirket', render: (r) => r.company?.name ?? '—' },
  ];

  return (
    <DashboardTemplate title="Kişiler">
      {can('contact.create') && (
        <div className="mb-4">
          <Button onClick={() => setCreating(true)}>+ Yeni kişi</Button>
        </div>
      )}

      {contacts.isLoading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={contacts.data ?? []}
          empty="Kişi yok"
          onRowClick={can('contact.update') ? setEditing : undefined}
        />
      )}

      {creating && (
        <CrudFormModal
          title="Yeni kişi"
          fields={fields}
          submitLabel="Oluştur"
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            await api.post('/contacts', v);
            invalidate();
          }}
        />
      )}

      {editing && (
        <CrudFormModal
          title="Kişiyi düzenle"
          fields={fields}
          initial={{
            firstName: editing.firstName,
            lastName: editing.lastName,
            email: editing.email ?? '',
            phone: editing.phone ?? '',
            title: editing.title ?? '',
            companyId: editing.companyId ?? '',
          }}
          onClose={() => setEditing(null)}
          onSubmit={async (v) => {
            await api.patch(`/contacts/${editing.id}`, v);
            invalidate();
          }}
          onDelete={
            can('contact.delete')
              ? async () => {
                  await api.delete(`/contacts/${editing.id}`);
                  invalidate();
                }
              : undefined
          }
        />
      )}
    </DashboardTemplate>
  );
}
