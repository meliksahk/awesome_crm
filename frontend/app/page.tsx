'use client';
// app/page.tsx — Panel (özet istatistikler).
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { StatCard } from '@/components/molecules/StatCard';
import { Spinner } from '@/components/atoms/Spinner';

async function total(path: string): Promise<number> {
  const res = await api.get(path, { params: { limit: 1 } });
  return res.data?.meta?.total ?? 0;
}

export default function DashboardHome() {
  const { can } = useAuth();

  const deals = useQuery({
    queryKey: ['count', 'deals'],
    queryFn: () => total('/deals'),
    enabled: can('deal.read'),
  });
  const invoices = useQuery({
    queryKey: ['count', 'invoices'],
    queryFn: () => total('/invoices'),
    enabled: can('invoice.read'),
  });
  const users = useQuery({
    queryKey: ['count', 'users'],
    queryFn: () => total('/users'),
    enabled: can('user.read'),
  });

  // Yalnız yetkili (enabled) sorgular yüklenirken spinner göster.
  const anyLoading =
    (can('deal.read') && deals.isLoading) ||
    (can('invoice.read') && invoices.isLoading) ||
    (can('user.read') && users.isLoading);

  return (
    <DashboardTemplate title="Panel">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {can('deal.read') && (
          <StatCard
            label="Deal"
            value={deals.isLoading ? '…' : (deals.data ?? 0)}
            hint="Toplam satış fırsatı"
          />
        )}
        {can('invoice.read') && (
          <StatCard
            label="Fatura"
            value={invoices.isLoading ? '…' : (invoices.data ?? 0)}
            hint="Toplam fatura"
          />
        )}
        {can('user.read') && (
          <StatCard
            label="Kullanıcı"
            value={users.isLoading ? '…' : (users.data ?? 0)}
            hint="Sistem kullanıcıları"
          />
        )}
      </div>
      {!can('deal.read') && !can('invoice.read') && !can('user.read') && (
        <p className="text-sm text-gray-500">
          Görüntülenecek modül yetkiniz yok.
        </p>
      )}
      <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
        {anyLoading ? (
          <>
            <Spinner className="h-3 w-3" /> Veriler çekiliyor…
          </>
        ) : (
          <>Veriler güncel (canlı API: /api/v1).</>
        )}
      </div>
    </DashboardTemplate>
  );
}
