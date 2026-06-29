'use client';
// app/(dashboard)/products/page.tsx — ürün tam CRUD.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { CrudFormModal, CrudField } from '@/components/organisms/CrudFormModal';
import { Spinner } from '@/components/atoms/Spinner';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';

interface Product {
  id: string;
  sku: string | null;
  name: string;
  description?: string | null;
  unitPrice: string;
  currency: string;
  taxRate: string;
  active: boolean;
}

const FIELDS: CrudField[] = [
  { key: 'name', label: 'Ad', required: true },
  { key: 'sku', label: 'SKU' },
  { key: 'unitPrice', label: 'Birim fiyat', type: 'number', required: true, placeholder: '1000.00' },
  { key: 'currency', label: 'Para birimi', placeholder: 'TRY' },
  { key: 'taxRate', label: 'KDV %', type: 'number', placeholder: '20' },
  { key: 'description', label: 'Açıklama', type: 'textarea' },
];

export default function ProductsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const products = useQuery({
    queryKey: ['products'],
    queryFn: async () =>
      unwrap<Product[]>(
        (await api.get('/products', { params: { limit: 50 } })).data,
      ),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['products'] });

  const columns: Column<Product>[] = [
    { key: 'name', header: 'Ürün', render: (r) => r.name },
    { key: 'sku', header: 'SKU', render: (r) => r.sku ?? '—' },
    {
      key: 'unitPrice',
      header: 'Birim fiyat',
      render: (r) => `${r.unitPrice} ${r.currency}`,
    },
    { key: 'taxRate', header: 'KDV %', render: (r) => r.taxRate },
    {
      key: 'active',
      header: 'Durum',
      render: (r) => (
        <Badge tone={r.active ? 'green' : 'gray'}>
          {r.active ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
  ];

  return (
    <DashboardTemplate title="Ürünler">
      {can('product.create') && (
        <div className="mb-4">
          <Button onClick={() => setCreating(true)}>+ Yeni ürün</Button>
        </div>
      )}

      {products.isLoading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={products.data ?? []}
          empty="Ürün yok"
          onRowClick={can('product.update') ? setEditing : undefined}
        />
      )}

      {creating && (
        <CrudFormModal
          title="Yeni ürün"
          fields={FIELDS}
          submitLabel="Oluştur"
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            await api.post('/products', v);
            invalidate();
          }}
        />
      )}

      {editing && (
        <CrudFormModal
          title="Ürünü düzenle"
          fields={FIELDS}
          initial={{
            name: editing.name,
            sku: editing.sku ?? '',
            unitPrice: editing.unitPrice,
            currency: editing.currency,
            taxRate: editing.taxRate,
            description: editing.description ?? '',
          }}
          onClose={() => setEditing(null)}
          onSubmit={async (v) => {
            await api.patch(`/products/${editing.id}`, v);
            invalidate();
          }}
          onDelete={
            can('product.delete')
              ? async () => {
                  await api.delete(`/products/${editing.id}`);
                  invalidate();
                }
              : undefined
          }
        />
      )}
    </DashboardTemplate>
  );
}
