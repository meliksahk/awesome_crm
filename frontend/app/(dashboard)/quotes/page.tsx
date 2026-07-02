'use client';
// app/(dashboard)/quotes/page.tsx — v2.7 teklif (CPQ): liste + oluştur + gönder/dönüştür.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { WhatsAppSendModal } from '@/components/organisms/WhatsAppSendModal';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { Badge } from '@/components/atoms/Badge';
import { FormField } from '@/components/molecules/FormField';

interface Product {
  id: string;
  name: string;
  unitPrice: string;
}
interface Quote {
  id: string;
  number: string | null;
  customerName: string;
  status: string;
  total: string;
  currency: string;
}
interface LineItem {
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

type Tone = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'indigo';
const STATUS_TONE: Record<string, Tone> = {
  DRAFT: 'gray',
  SENT: 'blue',
  ACCEPTED: 'green',
  REJECTED: 'red',
  EXPIRED: 'amber',
  CONVERTED: 'indigo',
};

export default function QuotesPage() {
  const { can } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [waQuote, setWaQuote] = useState<Quote | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [taxRate, setTaxRate] = useState('20');
  const [lines, setLines] = useState<LineItem[]>([
    { productId: '', description: '', quantity: '1', unitPrice: '' },
  ]);

  const quotes = useQuery({
    queryKey: ['quotes'],
    queryFn: async () =>
      unwrap<Quote[]>((await api.get('/quotes', { params: { limit: 50 } })).data),
  });

  const products = useQuery({
    queryKey: ['products-for-quote'],
    enabled: can('quote.create'),
    queryFn: async () =>
      unwrap<Product[]>(
        (await api.get('/products', { params: { limit: 100, active: true } }))
          .data,
      ),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['quotes'] });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/quotes', {
        customerName,
        taxRate,
        lineItems: lines.map((l) => ({
          productId: l.productId || undefined,
          description: l.description || undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice || undefined,
        })),
      }),
    onSuccess: () => {
      setCustomerName('');
      setLines([
        { productId: '', description: '', quantity: '1', unitPrice: '' },
      ]);
      refresh();
    },
  });

  const action = useMutation({
    mutationFn: async (p: { id: string; verb: string }) =>
      api.post(`/quotes/${p.id}/${p.verb}`),
    onSuccess: refresh,
  });

  const del = useMutation({
    mutationFn: async (id: string) => api.delete(`/quotes/${id}`),
    onSuccess: refresh,
  });

  const setLine = (i: number, patch: Partial<LineItem>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const columns: Column<Quote>[] = [
    { key: 'number', header: t('col.number'), render: (r) => r.number ?? '—' },
    { key: 'customerName', header: t('col.customer'), render: (r) => r.customerName },
    {
      key: 'total',
      header: t('col.amount'),
      render: (r) => `${r.total} ${r.currency}`,
    },
    {
      key: 'status',
      header: t('col.status'),
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status] ?? 'gray'}>{r.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: t('col.action'),
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          {r.status === 'DRAFT' && can('quote.send') && (
            <Button
              variant="secondary"
              className="px-2 py-1 text-xs"
              onClick={() => action.mutate({ id: r.id, verb: 'send' })}
            >
              {t('act.send')}
            </Button>
          )}
          {r.status === 'SENT' && can('quote.send') && (
            <>
              <Button
                variant="secondary"
                className="px-2 py-1 text-xs"
                onClick={() => action.mutate({ id: r.id, verb: 'accept' })}
              >
                {t('act.accept')}
              </Button>
              <Button
                variant="ghost"
                className="px-2 py-1 text-xs"
                onClick={() => action.mutate({ id: r.id, verb: 'reject' })}
              >
                {t('act.reject')}
              </Button>
            </>
          )}
          {(r.status === 'SENT' || r.status === 'ACCEPTED') &&
            can('quote.convert') && (
              <Button
                className="px-2 py-1 text-xs"
                onClick={() => action.mutate({ id: r.id, verb: 'convert' })}
              >
                {t('act.invoice')}
              </Button>
            )}
          {can('whatsapp.send') && r.status !== 'DRAFT' && (
            <Button
              variant="ghost"
              className="px-2 py-1 text-xs"
              onClick={() => setWaQuote(r)}
            >
              💬 {t('wa.sendVia')}
            </Button>
          )}
          {r.status !== 'CONVERTED' && can('quote.delete') && (
            <Button
              variant="danger"
              className="px-2 py-1 text-xs"
              onClick={() => {
                if (confirm(t('q.confirmDelete'))) del.mutate(r.id);
              }}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardTemplate title="page.quotes">
      {can('quote.create') && (
        <Card className="mb-4 p-4">
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              id="q-cust"
              label={t('q.customerName')}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <FormField
              id="q-tax"
              label={t('q.taxRate')}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>

          <p className="mb-1 text-sm font-medium text-gray-600">{t('q.items')}</p>
          {lines.map((l, i) => (
            <div
              key={i}
              className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-12"
            >
              <select
                className="rounded-md border border-gray-300 px-2 py-2 text-sm sm:col-span-4"
                value={l.productId}
                onChange={(e) => {
                  const p = products.data?.find(
                    (x) => x.id === e.target.value,
                  );
                  setLine(i, {
                    productId: e.target.value,
                    description: p?.name ?? l.description,
                    unitPrice: p?.unitPrice ?? l.unitPrice,
                  });
                }}
              >
                <option value="">{t('q.product')}</option>
                {products.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unitPrice})
                  </option>
                ))}
              </select>
              <input
                className="rounded-md border border-gray-300 px-2 py-2 text-sm sm:col-span-4"
                placeholder={t('q.description')}
                value={l.description}
                onChange={(e) => setLine(i, { description: e.target.value })}
              />
              <input
                className="rounded-md border border-gray-300 px-2 py-2 text-sm sm:col-span-2"
                placeholder={t('q.quantity')}
                value={l.quantity}
                onChange={(e) => setLine(i, { quantity: e.target.value })}
              />
              <input
                className="rounded-md border border-gray-300 px-2 py-2 text-sm sm:col-span-2"
                placeholder={t('q.unitPrice')}
                value={l.unitPrice}
                onChange={(e) => setLine(i, { unitPrice: e.target.value })}
              />
            </div>
          ))}

          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="ghost"
              className="text-xs"
              onClick={() =>
                setLines([
                  ...lines,
                  {
                    productId: '',
                    description: '',
                    quantity: '1',
                    unitPrice: '',
                  },
                ])
              }
            >
              {t('btn.addItem')}
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending || !customerName}
            >
              {create.isPending ? '…' : t('q.create')}
            </Button>
            {create.isError && (
              <span className="text-sm text-red-600">{t('common.error')}</span>
            )}
          </div>
        </Card>
      )}

      {quotes.isLoading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={quotes.data ?? []}
          empty={t('common.empty')}
        />
      )}

      {waQuote && (
        <WhatsAppSendModal
          initialBody={t('wa.quoteMsg')
            .replace('{name}', waQuote.customerName)
            .replace('{number}', waQuote.number ?? '—')
            .replace('{total}', waQuote.total)
            .replace('{currency}', waQuote.currency)}
          onClose={() => setWaQuote(null)}
        />
      )}
    </DashboardTemplate>
  );
}
