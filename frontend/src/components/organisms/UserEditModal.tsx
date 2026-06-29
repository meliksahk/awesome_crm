'use client';
// src/components/organisms/UserEditModal.tsx — kullanıcı düzenle: ad + durum + roller + sil.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Modal } from '../molecules/Modal';
import { FormField } from '../molecules/FormField';
import { Button } from '../atoms/Button';
import type { User } from '@/types';

interface Role {
  id: string;
  name: string;
}

export function UserEditModal({
  user,
  onClose,
  onChanged,
}: {
  user: User;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { can } = useAuth();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [active, setActive] = useState(user.isActive);
  const [roleNames, setRoleNames] = useState<string[]>(user.roles);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const roles = useQuery({
    queryKey: ['roles'],
    enabled: can('role.read') || can('role.assign'),
    queryFn: async () => unwrap<Role[]>((await api.get('/roles')).data),
  });

  const toggleRole = (name: string) =>
    setRoleNames((s) =>
      s.includes(name) ? s.filter((r) => r !== name) : [...s, name],
    );

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.patch(`/users/${user.id}`, { firstName, lastName });
      if (active !== user.isActive) {
        await api.patch(`/users/${user.id}/status`, { isActive: active });
      }
      if (can('role.assign') && roles.data) {
        const roleIds = roles.data
          .filter((r) => roleNames.includes(r.name))
          .map((r) => r.id);
        await api.patch(`/users/${user.id}/roles`, { roleIds });
      }
      onChanged();
      onClose();
    } catch {
      setErr('Kaydedilemedi — yetki/alan kontrolü.');
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!confirm('Kullanıcı silinsin mi?')) return;
    setBusy(true);
    setErr(null);
    try {
      await api.delete(`/users/${user.id}`);
      onChanged();
      onClose();
    } catch {
      setErr('Silinemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Kullanıcı: ${user.email}`} onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField
          id="u-first"
          label="Ad"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <FormField
          id="u-last"
          label="Soyad"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Aktif
      </label>

      {can('role.assign') && (
        <div className="mt-3">
          <p className="mb-1 text-sm font-medium text-gray-600">Roller</p>
          <div className="flex flex-wrap gap-3">
            {(roles.data ?? []).map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-1.5 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={roleNames.includes(r.name)}
                  onChange={() => toggleRole(r.name)}
                />
                {r.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button disabled={busy} onClick={save}>
            {busy ? '…' : 'Kaydet'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
        </div>
        {can('user.delete') && (
          <Button variant="danger" disabled={busy} onClick={del}>
            Sil
          </Button>
        )}
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </Modal>
  );
}
