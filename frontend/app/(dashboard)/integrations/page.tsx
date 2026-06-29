'use client';
// app/(dashboard)/integrations/page.tsx — Giden webhook abonelikleri: liste + oluştur + test + teslimat + anlatım.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Spinner } from '@/components/atoms/Spinner';

const EVENTS = ['deal.created', 'deal.moved', 'invoice.issued', 'invoice.paid'];

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  secret?: string;
}
interface Delivery {
  id: string;
  event: string;
  status: string;
  attempts: number;
  createdAt: string;
}

export default function IntegrationsPage() {
  const { can } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const manage = can('integration.manage');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const hooks = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () =>
      unwrap<Webhook[]>((await api.get('/integrations/webhooks')).data),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['webhooks'] });

  const create = useMutation({
    mutationFn: async () =>
      unwrap<Webhook>(
        (await api.post('/integrations/webhooks', { url, events })).data,
      ),
    onSuccess: (data) => {
      setNewSecret(data.secret ?? null);
      setUrl('');
      setEvents([]);
      invalidate();
    },
  });
  const test = useMutation({
    mutationFn: async (id: string) =>
      api.post(`/integrations/webhooks/${id}/test`),
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      api.delete(`/integrations/webhooks/${id}`),
    onSuccess: invalidate,
  });

  const deliveries = useQuery({
    queryKey: ['webhook-deliveries', openId],
    enabled: !!openId,
    queryFn: async () =>
      unwrap<Delivery[]>(
        (await api.get(`/integrations/webhooks/${openId}/deliveries`)).data,
      ),
  });

  const toggleEvent = (e: string) =>
    setEvents((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e]));

  return (
    <DashboardTemplate title="page.integrations">
      {/* Anlatım */}
      <Card className="mb-4 border-brand-200 bg-brand-50/40 p-4">
        <h3 className="mb-1 text-sm font-semibold text-gray-700">
          {t('wh.howTitle')}
        </h3>
        <p className="text-xs text-gray-600">{t('wh.howBody')}</p>
        <p className="mt-2 text-xs text-gray-500">{t('wh.inboundNote')}</p>
      </Card>

      {/* Oluştur */}
      {manage && (
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[16rem] flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-600">
                {t('wh.url')}
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks/crm"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-2">
            <p className="mb-1 text-sm font-medium text-gray-600">
              {t('wh.events')}
            </p>
            <div className="flex flex-wrap gap-3">
              {EVENTS.map((e) => (
                <label
                  key={e}
                  className="flex items-center gap-1.5 text-xs text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={events.includes(e)}
                    onChange={() => toggleEvent(e)}
                  />
                  <code>{e}</code>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              onClick={() => create.mutate()}
              disabled={
                create.isPending || !url.trim() || events.length === 0
              }
            >
              {create.isPending ? '…' : t('common.create')}
            </Button>
            {create.isError && (
              <span className="text-sm text-red-600">{t('common.error')}</span>
            )}
          </div>
          {newSecret && (
            <div className="mt-3 rounded-md bg-emerald-50 p-2">
              <p className="mb-1 text-xs text-emerald-700">
                {t('wh.secretOnce')}
              </p>
              <code className="break-all text-xs">{newSecret}</code>
            </div>
          )}
        </Card>
      )}

      {/* Liste */}
      {hooks.isLoading ? (
        <Spinner />
      ) : (hooks.data ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">{t('common.empty')}</p>
      ) : (
        <div className="space-y-2">
          {(hooks.data ?? []).map((h) => (
            <Card key={h.id} className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 break-all text-xs">{h.url}</code>
                <Badge tone={h.isActive ? 'green' : 'gray'}>
                  {h.isActive ? t('s.active') : t('s.passive')}
                </Badge>
                {manage && (
                  <>
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => test.mutate(h.id)}
                      disabled={test.isPending}
                    >
                      {t('wh.test')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      onClick={() => setOpenId(openId === h.id ? null : h.id)}
                    >
                      {t('wh.deliveries')}
                    </Button>
                    <Button
                      variant="danger"
                      className="px-2 py-1 text-xs"
                      onClick={() => {
                        if (confirm(t('wh.deleteConfirm'))) remove.mutate(h.id);
                      }}
                    >
                      {t('common.delete')}
                    </Button>
                  </>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {h.events.map((e) => (
                  <Badge key={e} tone="blue">
                    {e}
                  </Badge>
                ))}
              </div>
              {openId === h.id && (
                <div className="mt-2 border-t border-gray-100 pt-2">
                  {deliveries.isLoading ? (
                    <Spinner />
                  ) : (deliveries.data ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400">
                      {t('wh.noDeliveries')}
                    </p>
                  ) : (
                    <ul className="space-y-1 text-xs text-gray-600">
                      {(deliveries.data ?? []).map((d) => (
                        <li key={d.id} className="flex items-center gap-2">
                          <Badge
                            tone={
                              d.status === 'SUCCESS'
                                ? 'green'
                                : d.status === 'FAILED'
                                  ? 'red'
                                  : 'amber'
                            }
                          >
                            {d.status}
                          </Badge>
                          <code>{d.event}</code>
                          <span className="text-gray-400">
                            ×{d.attempts} ·{' '}
                            {new Date(d.createdAt).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </DashboardTemplate>
  );
}
