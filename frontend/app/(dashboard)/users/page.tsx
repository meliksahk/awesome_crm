'use client';
// app/(dashboard)/users/page.tsx — kullanıcı tam CRUD (oluştur + düzenle/durum/rol/sil).
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { CrudFormModal, CrudField } from '@/components/organisms/CrudFormModal';
import { UserEditModal } from '@/components/organisms/UserEditModal';
import { Badge } from '@/components/atoms/Badge';
import { Spinner } from '@/components/atoms/Spinner';
import { Button } from '@/components/atoms/Button';
import type { User } from '@/types';

const CREATE_FIELDS: CrudField[] = [
  { key: 'email', label: 'E-posta', type: 'email', required: true },
  {
    key: 'password',
    label: 'Parola',
    type: 'password',
    required: true,
    placeholder: 'En az 10 karakter, güçlü',
  },
  { key: 'firstName', label: 'Ad', required: true },
  { key: 'lastName', label: 'Soyad', required: true },
];

export default function UsersPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const users = useQuery({
    queryKey: ['users'],
    queryFn: async () =>
      unwrap<User[]>((await api.get('/users', { params: { limit: 50 } })).data),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const columns: Column<User>[] = [
    { key: 'name', header: 'Ad', render: (r) => `${r.firstName} ${r.lastName}` },
    { key: 'email', header: 'E-posta', render: (r) => r.email },
    {
      key: 'roles',
      header: 'Roller',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.roles.map((role) => (
            <Badge key={role} tone="indigo">
              {role}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Durum',
      render: (r) =>
        r.isActive ? (
          <Badge tone="green">Aktif</Badge>
        ) : (
          <Badge tone="red">Pasif</Badge>
        ),
    },
  ];

  return (
    <DashboardTemplate title="Kullanıcılar">
      {can('user.create') && (
        <div className="mb-4">
          <Button onClick={() => setCreating(true)}>+ Yeni kullanıcı</Button>
        </div>
      )}

      {users.isLoading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={users.data ?? []}
          empty="Kullanıcı yok"
          onRowClick={can('user.update') ? setEditing : undefined}
        />
      )}

      {creating && (
        <CrudFormModal
          title="Yeni kullanıcı"
          fields={CREATE_FIELDS}
          submitLabel="Oluştur"
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            await api.post('/users', v);
            invalidate();
          }}
        />
      )}

      {editing && (
        <UserEditModal
          user={editing}
          onClose={() => setEditing(null)}
          onChanged={invalidate}
        />
      )}
    </DashboardTemplate>
  );
}
