'use client';
// app/(dashboard)/whatsapp/page.tsx — v3.1 WhatsApp gelen kutusu: sohbetler + dizi + yanıt.
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Spinner } from '@/components/atoms/Spinner';

interface Conversation {
  phone: string;
  lastBody: string;
  lastAt: string;
  lastDirection: string;
  count: number;
  leadId: string | null;
  contactId: string | null;
}
interface Message {
  id: string;
  direction: 'IN' | 'OUT';
  body: string;
  status: string;
  createdAt: string;
}

export default function WhatsAppInboxPage() {
  const { can } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const status = useQuery({
    queryKey: ['wa-status'],
    queryFn: async () =>
      unwrap<{ connected: boolean }>((await api.get('/whatsapp/status')).data),
  });
  const conversations = useQuery({
    queryKey: ['wa-conversations'],
    queryFn: async () =>
      unwrap<Conversation[]>(
        (await api.get('/whatsapp/conversations')).data,
      ),
    refetchInterval: 15_000, // gelen mesajlar için hafif canlılık
  });
  const thread = useQuery({
    queryKey: ['wa-thread', selected],
    enabled: !!selected,
    queryFn: async () =>
      unwrap<Message[]>(
        (await api.get(`/whatsapp/thread/${selected}`)).data,
      ),
    refetchInterval: 10_000,
  });

  const send = useMutation({
    mutationFn: async () =>
      api.post('/whatsapp/send', { to: selected, body: reply }),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['wa-thread', selected] });
      qc.invalidateQueries({ queryKey: ['wa-conversations'] });
    },
  });

  return (
    <DashboardTemplate title="page.whatsapp">
      {status.data && !status.data.connected && (
        <Card className="mb-4 border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {t('wa.notConnected')}{' '}
          <Link href="/connections" className="underline">
            {t('nav.connections')} →
          </Link>
        </Card>
      )}

      {conversations.isLoading ? (
        <Spinner />
      ) : (conversations.data ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">{t('wa.empty')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Sohbet listesi */}
          <Card className="p-2 lg:col-span-1">
            {(conversations.data ?? []).map((c) => (
              <button
                key={c.phone}
                type="button"
                onClick={() => setSelected(c.phone)}
                className={`block w-full rounded-md px-3 py-2 text-left transition hover:bg-gray-50 ${
                  selected === c.phone ? 'bg-brand-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">
                    +{c.phone}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(c.lastAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="flex-1 truncate text-xs text-gray-500">
                    {c.lastDirection === 'OUT' ? '↗ ' : '↘ '}
                    {c.lastBody}
                  </p>
                  {c.leadId && <Badge tone="green">{t('wa.linkedLead')}</Badge>}
                  {c.contactId && (
                    <Badge tone="blue">{t('wa.linkedContact')}</Badge>
                  )}
                </div>
              </button>
            ))}
          </Card>

          {/* Dizi + yanıt */}
          <Card className="flex min-h-[24rem] flex-col p-4 lg:col-span-2">
            {!selected ? (
              <p className="m-auto text-sm text-gray-400">{t('wa.empty')}</p>
            ) : thread.isLoading ? (
              <Spinner />
            ) : (
              <>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {(thread.data ?? []).map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        m.direction === 'OUT'
                          ? 'ml-auto bg-brand-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          m.direction === 'OUT'
                            ? 'text-brand-100'
                            : 'text-gray-400'
                        }`}
                      >
                        {new Date(m.createdAt).toLocaleString()}
                        {m.status === 'failed' && ` · ${t('wa.failed')}`}
                      </p>
                    </div>
                  ))}
                </div>
                {can('whatsapp.send') && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && reply.trim())
                          send.mutate();
                      }}
                      placeholder={t('wa.reply')}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <Button
                      onClick={() => send.mutate()}
                      disabled={send.isPending || !reply.trim()}
                    >
                      {t('wa.send')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </DashboardTemplate>
  );
}
