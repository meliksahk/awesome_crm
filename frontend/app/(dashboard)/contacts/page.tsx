'use client';
// app/(dashboard)/contacts/page.tsx — kişi tam CRUD (şirket seçicili, i18n).
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
import type { Company, Contact } from '@/types';

export default function ContactsPage() {
  const { can } = useAuth();
  const { t } = useI18n();
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
    { key: 'firstName', label: 'field.firstName', required: true },
    { key: 'lastName', label: 'field.lastName', required: true },
    { key: 'email', label: 'field.email', type: 'email' },
    { key: 'phone', label: 'field.phone', type: 'phone' },
    { key: 'title', label: 'field.title' },
    {
      key: 'companyId',
      label: 'field.company',
      type: 'select',
      options: (companies.data ?? []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    },
  ];

  const columns: Column<Contact>[] = [
    { key: 'name', header: t('col.name'), render: (r) => `${r.firstName} ${r.lastName}` },
    { key: 'email', header: t('col.email'), render: (r) => r.email ?? '—' },
    { key: 'title', header: t('col.title'), render: (r) => r.title ?? '—' },
    { key: 'company', header: t('col.company'), render: (r) => r.company?.name ?? '—' },
  ];

  return (
    <DashboardTemplate title="page.contacts">
      {can('contact.create') && (
        <div className="mb-4">
          <Button onClick={() => setCreating(true)}>{t('btn.newContact')}</Button>
        </div>
      )}

      {contacts.isLoading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={contacts.data ?? []}
          empty={t('common.empty')}
          onRowClick={can('contact.update') ? setEditing : undefined}
        />
      )}

      {creating && (
        <CrudFormModal
          title={t('m.newContact')}
          fields={fields}
          submitLabel={t('common.create')}
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            await api.post('/contacts', v);
            invalidate();
          }}
        />
      )}

      {editing && (
        <CrudFormModal
          title={t('m.editContact')}
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
