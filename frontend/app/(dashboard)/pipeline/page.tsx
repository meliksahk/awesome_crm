'use client';
// app/(dashboard)/pipeline/page.tsx — Kanban stage yönetimi: ekle/yeniden adlandır/sırala/sil.
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

interface Stage {
  id: string;
  name: string;
  position: number;
  isWon: boolean;
  isLost: boolean;
}
interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

export default function PipelinePage() {
  const { can } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const manage = can('pipeline.manage');
  const [newName, setNewName] = useState('');

  const pipelines = useQuery({
    queryKey: ['pipelines-admin'],
    queryFn: async () =>
      unwrap<Pipeline[]>((await api.get('/pipelines')).data),
  });
  const pipeline = pipelines.data?.[0];
  const pid = pipeline?.id;
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['pipelines-admin'] });

  const add = useMutation({
    mutationFn: async (name: string) =>
      api.post(`/pipelines/${pid}/stages`, { name }),
    onSuccess: () => {
      setNewName('');
      invalidate();
    },
  });
  const patch = useMutation({
    mutationFn: async (v: { id: string; data: Partial<Stage> }) =>
      api.patch(`/pipelines/${pid}/stages/${v.id}`, v.data),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: async (stageIds: string[]) =>
      api.patch(`/pipelines/${pid}/stages/reorder`, { stageIds }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      api.delete(`/pipelines/${pid}/stages/${id}`),
    onSuccess: invalidate,
    onError: () => alert(t('stage.deleteBlocked')),
  });

  const stages = pipeline?.stages ?? [];
  const move = (idx: number, dir: -1 | 1) => {
    const order = stages.map((s) => s.id);
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    [order[idx], order[j]] = [order[j], order[idx]];
    reorder.mutate(order);
  };

  return (
    <DashboardTemplate title="page.pipeline">
      <p className="mb-4 text-sm text-gray-500">{t('stage.hint')}</p>

      {pipelines.isLoading ? (
        <Spinner />
      ) : (
        <Card className="p-4">
          <div className="space-y-2">
            {stages.map((s, i) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-gray-100 p-2"
              >
                <span className="w-6 text-center text-xs text-gray-400">
                  {i + 1}
                </span>
                <input
                  defaultValue={s.name}
                  disabled={!manage}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== s.name) patch.mutate({ id: s.id, data: { name: v } });
                  }}
                  className="min-w-[8rem] flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50"
                />
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={s.isWon}
                    disabled={!manage}
                    onChange={(e) =>
                      patch.mutate({ id: s.id, data: { isWon: e.target.checked } })
                    }
                  />
                  <Badge tone="green">{t('stage.won')}</Badge>
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={s.isLost}
                    disabled={!manage}
                    onChange={(e) =>
                      patch.mutate({ id: s.id, data: { isLost: e.target.checked } })
                    }
                  />
                  <Badge tone="red">{t('stage.lost')}</Badge>
                </label>
                {manage && (
                  <>
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || reorder.isPending}
                      aria-label={t('stage.up')}
                    >
                      ←
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      onClick={() => move(i, 1)}
                      disabled={i === stages.length - 1 || reorder.isPending}
                      aria-label={t('stage.down')}
                    >
                      →
                    </Button>
                    <Button
                      variant="danger"
                      className="px-2 py-1 text-xs"
                      onClick={() => {
                        if (confirm(t('stage.deleteConfirm'))) remove.mutate(s.id);
                      }}
                    >
                      {t('common.delete')}
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {manage && (
            <div className="mt-4 flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('stage.namePh')}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <Button
                onClick={() => add.mutate(newName.trim())}
                disabled={!newName.trim() || add.isPending}
              >
                {t('stage.add')}
              </Button>
            </div>
          )}
        </Card>
      )}
    </DashboardTemplate>
  );
}
