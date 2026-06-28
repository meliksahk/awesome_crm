'use client';
// app/(dashboard)/products/page.tsx — v2.7 ürün kataloğu (liste + oluştur).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { Badge } from '@/components/atoms/Badge';
import { FormField } from '@/components/molecules/FormField';

interface Product {
  id: string;
  sku: string | null;
  name: string;
  unitPrice: string;
  currency: string;
  taxRate: string;
  active: boolean;
}

export default function ProductsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    sku: '',
    unitPrice: '',
    taxRate: '20',
  });

  const products = useQuery({
    queryKey: ['products'],
    queryFn: async () =>
      unwrap<Product[]>(
        (await api.get('/products', { params: { limit: 50 } })).data,
      ),
  });

  const create = useMutation({
    mutationFn: async () =>
      unwrap<Product>(
        (
          await api.post('/products', {
            name: form.name,
            sku: form.sku || undefined,
            unitPrice: form.unitPrice,
            taxRate: form.taxRate,
          })
        ).data,
      ),
    onSuccess: () => {
      setForm({ name: '', sku: '', unitPrice: '', taxRate: '20' });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

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
        <Card className="mb-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <FormField
              id="p-name"
              label="Ad"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <FormField
              id="p-sku"
              label="SKU (ops.)"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
            <FormField
              id="p-price"
              label="Birim fiyat"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            />
            <FormField
              id="p-tax"
              label="KDV %"
              value={form.taxRate}
              onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              onClick={() => create.mutate()}
              disabled={
                create.isPending || !form.name || !form.unitPrice
              }
            >
              {create.isPending ? 'Ekleniyor…' : 'Ürün ekle'}
            </Button>
            {create.isError && (
              <span className="text-sm text-red-600">Eklenemedi.</span>
            )}
          </div>
        </Card>
      )}

      {products.isLoading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={products.data ?? []}
          empty="Ürün yok"
        />
      )}
    </DashboardTemplate>
  );
}
