'use client';
// app/(dashboard)/reports/page.tsx — grafik destekli raporlar:
// KPI kartları + aylık ciro + kazan/kayıp trendi + durum dağılımı + satışçı/ürün bazlı + pipeline.
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { Card } from '@/components/atoms/Card';
import { StatCard } from '@/components/molecules/StatCard';
import { Spinner } from '@/components/atoms/Spinner';
import { BarChart, DonutChart, HBarList } from '@/components/molecules/Charts';

interface PipelineReport {
  stages: { stageId: string; name: string; openCount: number; openValue: string }[];
}
interface RevenueRow {
  month: string;
  invoiced: string;
  paid: string;
}
interface OwnerRow {
  ownerId: string | null;
  name: string | null;
  wonValue: string;
  wonCount: number;
  winRate: number;
}
interface ProductRow {
  productId: string;
  name: string;
  revenue: string;
  quantity: string;
}
interface WonLostRow {
  month: string;
  wonCount: number;
  lostCount: number;
}

const num = (s: string | number | undefined) => Number(s ?? 0);
const money = (n: number) => n.toLocaleString();
const shortMonth = (m: string) => m.slice(2); // '2026-01' → '26-01'

export default function ReportsPage() {
  const { can } = useAuth();
  const { t } = useI18n();
  const financial = can('invoice.read_financial');

  const pipelineId = useQuery({
    queryKey: ['report-pipelineId'],
    queryFn: async () => {
      const res = await api.get('/deals', { params: { limit: 1 } });
      return unwrap<{ pipelineId?: string }[]>(res.data)[0]?.pipelineId ?? null;
    },
  });

  const pipeline = useQuery({
    queryKey: ['report-pipeline', pipelineId.data],
    enabled: !!pipelineId.data,
    queryFn: async () =>
      unwrap<PipelineReport>(
        (await api.get('/reports/pipeline', { params: { pipelineId: pipelineId.data } })).data,
      ),
  });

  const forecast = useQuery({
    queryKey: ['report-forecast'],
    queryFn: async () =>
      unwrap<{ openCount: number; openValue: string; weightedForecast: string }>(
        (await api.get('/reports/forecast')).data,
      ),
  });

  const summary = useQuery({
    queryKey: ['report-deals-summary'],
    queryFn: async () =>
      unwrap<Record<string, { count: number; value: string }>>(
        (await api.get('/reports/deals/summary')).data,
      ),
  });

  const wonLost = useQuery({
    queryKey: ['report-won-lost'],
    queryFn: async () =>
      unwrap<{ winRate: number; months: WonLostRow[] }>(
        (await api.get('/reports/deals/won-lost', { params: { months: 6 } })).data,
      ),
  });

  const byOwner = useQuery({
    queryKey: ['report-by-owner'],
    queryFn: async () =>
      unwrap<OwnerRow[]>((await api.get('/reports/sales/by-owner')).data),
  });

  const topProducts = useQuery({
    queryKey: ['report-top-products'],
    queryFn: async () =>
      unwrap<ProductRow[]>(
        (await api.get('/reports/products/top', { params: { limit: 8 } })).data,
      ),
  });

  const revenue = useQuery({
    queryKey: ['report-revenue'],
    enabled: financial,
    queryFn: async () =>
      unwrap<{ months: RevenueRow[] }>(
        (await api.get('/reports/revenue/monthly', { params: { months: 12 } })).data,
      ),
  });

  const invoices = useQuery({
    queryKey: ['report-invoices'],
    enabled: financial,
    queryFn: async () =>
      unwrap<{ totalInvoiced: string; totalPaid: string; outstanding: string }>(
        (await api.get('/reports/invoices/summary')).data,
      ),
  });

  return (
    <DashboardTemplate title="page.reports">
      {/* KPI kartları */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('rep.openDeals')}
          value={forecast.data?.openCount ?? '…'}
          hint={`${t('rep.valuePrefix')}: ${forecast.data?.openValue ?? '—'}`}
        />
        <StatCard
          label={t('rep.forecast')}
          value={forecast.data?.weightedForecast ?? '…'}
          hint={t('rep.forecastHint')}
        />
        <StatCard
          label={t('rep.winRate')}
          value={wonLost.data ? `%${wonLost.data.winRate}` : '…'}
          hint={`${t('rep.won')}: ${wonLost.data?.months.reduce((a, m) => a + m.wonCount, 0) ?? '—'}`}
        />
        {financial && (
          <StatCard
            label={t('rep.outstanding')}
            value={invoices.data?.outstanding ?? '…'}
            hint={`${t('rep.invoicedPrefix')}: ${invoices.data?.totalInvoiced ?? '—'}`}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Aylık ciro (finansal) */}
        {financial && (
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              {t('rep.revenueTitle')}
            </h3>
            {revenue.isLoading ? (
              <Spinner />
            ) : (
              <BarChart
                labels={(revenue.data?.months ?? []).map((m) => shortMonth(m.month))}
                series={[
                  { name: t('rep.invoiced'), color: '#6366f1' },
                  { name: t('rep.paid'), color: '#10b981' },
                ]}
                values={[
                  (revenue.data?.months ?? []).map((m) => num(m.invoiced)),
                  (revenue.data?.months ?? []).map((m) => num(m.paid)),
                ]}
                format={money}
              />
            )}
          </Card>
        )}

        {/* Kazanılan / Kaybedilen aylık */}
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {t('rep.wonLostTitle')}
          </h3>
          {wonLost.isLoading ? (
            <Spinner />
          ) : (
            <BarChart
              labels={(wonLost.data?.months ?? []).map((m) => shortMonth(m.month))}
              series={[
                { name: t('rep.won'), color: '#10b981' },
                { name: t('rep.lost'), color: '#ef4444' },
              ]}
              values={[
                (wonLost.data?.months ?? []).map((m) => m.wonCount),
                (wonLost.data?.months ?? []).map((m) => m.lostCount),
              ]}
            />
          )}
        </Card>

        {/* Durum dağılımı */}
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {t('rep.statusTitle')}
          </h3>
          {summary.isLoading ? (
            <Spinner />
          ) : (
            <DonutChart
              data={[
                { label: t('rep.open'), value: summary.data?.OPEN?.count ?? 0, color: '#3b82f6' },
                { label: t('rep.won'), value: summary.data?.WON?.count ?? 0, color: '#10b981' },
                { label: t('rep.lost'), value: summary.data?.LOST?.count ?? 0, color: '#ef4444' },
              ]}
            />
          )}
        </Card>

        {/* Satışçı bazlı */}
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {t('rep.byOwnerTitle')}
          </h3>
          {byOwner.isLoading ? (
            <Spinner />
          ) : (
            <HBarList
              color="#6366f1"
              empty={t('common.empty')}
              data={(byOwner.data ?? []).map((o) => ({
                label: o.name ?? t('rep.unassigned'),
                value: num(o.wonValue),
                sub: `%${o.winRate}`,
              }))}
              format={money}
            />
          )}
        </Card>

        {/* Ürün bazlı */}
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {t('rep.topProductsTitle')}
          </h3>
          {topProducts.isLoading ? (
            <Spinner />
          ) : (
            <HBarList
              color="#f59e0b"
              empty={t('common.empty')}
              data={(topProducts.data ?? []).map((p) => ({
                label: p.name,
                value: num(p.revenue),
                sub: `${num(p.quantity)} ${t('rep.qty')}`,
              }))}
              format={money}
            />
          )}
        </Card>

        {/* Pipeline (açık deal sütunları) */}
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {t('rep.pipelineTitle')}
          </h3>
          {pipeline.isLoading ? (
            <Spinner />
          ) : (
            <HBarList
              color="#8b5cf6"
              empty={t('common.empty')}
              data={(pipeline.data?.stages ?? []).map((s) => ({
                label: s.name,
                value: s.openCount,
                sub: s.openValue,
              }))}
            />
          )}
        </Card>
      </div>
    </DashboardTemplate>
  );
}
