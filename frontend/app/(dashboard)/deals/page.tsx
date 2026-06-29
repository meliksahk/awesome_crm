'use client';
// app/(dashboard)/deals/page.tsx — Kanban panosu + yeni deal (tüm alanlar).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { DealsBoard } from '@/components/organisms/DealsBoard';
import { DealEditModal } from '@/components/organisms/DealEditModal';
import { Spinner } from '@/components/atoms/Spinner';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { Card } from '@/components/atoms/Card';
import type { Board, Deal } from '@/types';

const EMPTY = {
  title: '',
  company: '',
  value: '',
  currency: 'TRY',
  contactName: '',
  email: '',
  phone: '',
};

export default function DealsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Deal | null>(null);

  const set = (k: keyof typeof EMPTY, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pipelines = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const res = await api.get('/deals', { params: { limit: 1 } });
      const data = unwrap<{ pipelineId?: string }[]>(res.data);
      return data[0]?.pipelineId ?? null;
    },
  });

  const board = useQuery({
    queryKey: ['board', pipelines.data],
    queryFn: async () => {
      const res = await api.get('/deals/board', {
        params: { pipelineId: pipelines.data },
      });
      return unwrap<Board>(res.data);
    },
    enabled: !!pipelines.data,
  });

  const firstStage = board.data?.stages[0]?.id;

  const moveDeal = useMutation({
    mutationFn: async ({ id, toStageId }: { id: string; toStageId: string }) => {
      await api.patch(`/deals/${id}/move`, { toStageId });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['board'] }),
  });

  const createDeal = useMutation({
    mutationFn: async () => {
      // Yalnız dolu opsiyonel alanları gönder (boş e-posta/değer backend doğrulamasına takılır).
      const payload: Record<string, unknown> = {
        pipelineId: pipelines.data,
        stageId: firstStage,
        title: form.title.trim(),
      };
      if (form.company.trim()) payload.company = form.company.trim();
      if (form.contactName.trim()) payload.contactName = form.contactName.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.value.trim()) {
        payload.value = form.value.trim();
        payload.currency = form.currency || 'TRY';
      }
      await api.post('/deals', payload);
    },
    onSuccess: () => {
      setForm({ ...EMPTY });
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['board'] });
    },
  });

  return (
    <DashboardTemplate title="Satış (Deal) — Kanban">
      {can('deal.create') && pipelines.data && firstStage && (
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Yeni anlaşma
            </h3>
            <Button variant="ghost" onClick={() => setOpen((o) => !o)}>
              {open ? 'Gizle' : '+ Alanları göster'}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField
              id="deal-title"
              label="Başlık *"
              placeholder="Örn. ACME teklifi"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
            <FormField
              id="deal-company"
              label="Şirket"
              placeholder="ACME A.Ş."
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <FormField
                  id="deal-value"
                  label="Değer"
                  placeholder="12000.50"
                  value={form.value}
                  onChange={(e) => set('value', e.target.value)}
                />
              </div>
              <FormField
                id="deal-currency"
                label="Birim"
                placeholder="TRY"
                maxLength={3}
                value={form.currency}
                onChange={(e) => set('currency', e.target.value.toUpperCase())}
              />
            </div>
          </div>

          {open && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField
                id="deal-contact"
                label="İlgili kişi"
                placeholder="Ad Soyad"
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
              />
              <FormField
                id="deal-email"
                label="E-posta"
                type="email"
                placeholder="kisi@firma.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
              <FormField
                id="deal-phone"
                label="Telefon"
                placeholder="+90 5xx xxx xx xx"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button
              disabled={!form.title.trim() || createDeal.isPending}
              onClick={() => createDeal.mutate()}
            >
              {createDeal.isPending ? 'Ekleniyor…' : 'Ekle'}
            </Button>
            {createDeal.isError && (
              <span className="text-sm text-red-600">
                Eklenemedi — alanları kontrol edin (değer sayısal, e-posta geçerli).
              </span>
            )}
            <span className="text-xs text-gray-400">
              İlk aşamaya eklenir; sürükleyerek taşıyabilirsiniz.
            </span>
          </div>
        </Card>
      )}

      {board.isLoading || pipelines.isLoading ? (
        <Spinner />
      ) : board.data ? (
        <DealsBoard
          board={board.data}
          onSelect={setSelected}
          onMove={
            can('deal.move')
              ? (id, toStageId) => moveDeal.mutate({ id, toStageId })
              : undefined
          }
        />
      ) : (
        <p className="text-sm text-gray-500">Pipeline bulunamadı.</p>
      )}

      {selected && board.data && (
        <DealEditModal
          deal={selected}
          board={board.data}
          onClose={() => setSelected(null)}
        />
      )}
    </DashboardTemplate>
  );
}
