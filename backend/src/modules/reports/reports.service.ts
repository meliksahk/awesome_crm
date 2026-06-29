// src/modules/reports/reports.service.ts
// İŞ MANTIĞI: rapor toplulaştırma + ağırlıklı forecast (Decimal).
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ReportsRepository } from './reports.repository';

const D = Prisma.Decimal;

@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  async pipeline(pipelineId: string) {
    const [stages, byStage] = await Promise.all([
      this.repo.stages(pipelineId),
      this.repo.dealsByStage(pipelineId),
    ]);
    const map = new Map(byStage.map((b) => [b.stageId, b]));
    return {
      pipelineId,
      stages: stages.map((s) => {
        const agg = map.get(s.id);
        return {
          stageId: s.id,
          name: s.name,
          position: s.position,
          openCount: agg?._count._all ?? 0,
          openValue: (agg?._sum.value ?? new D(0)).toString(),
        };
      }),
    };
  }

  async dealsSummary() {
    const byStatus = await this.repo.dealsByStatus();
    const result: Record<string, { count: number; value: string }> = {};
    for (const row of byStatus) {
      result[row.status] = {
        count: row._count._all,
        value: (row._sum.value ?? new D(0)).toString(),
      };
    }
    return result;
  }

  // Ağırlıklı forecast: açık deal değeri × (stage pozisyonu / pipeline stage sayısı).
  async forecast() {
    const [openDeals, stageCounts] = await Promise.all([
      this.repo.openDeals(),
      this.repo.stageCountByPipeline(),
    ]);
    const countByPipeline = new Map(
      stageCounts.map((s) => [s.pipelineId, s._count._all]),
    );
    let weighted = new D(0);
    let openValue = new D(0);
    for (const d of openDeals) {
      if (!d.value) continue;
      openValue = openValue.plus(d.value);
      const total = countByPipeline.get(d.stage.pipelineId) ?? 1;
      // pozisyon 0-tabanlı → (pos+1)/total olasılık
      const prob = Math.min(1, (d.stage.position + 1) / total);
      weighted = weighted.plus(d.value.mul(prob));
    }
    return {
      openCount: openDeals.length,
      openValue: openValue.toDecimalPlaces(2).toString(),
      weightedForecast: weighted.toDecimalPlaces(2).toString(),
    };
  }

  async invoicesSummary() {
    const agg = await this.repo.invoiceTotals();
    const total = agg._sum.total ?? new D(0);
    const paid = agg._sum.amountPaid ?? new D(0);
    return {
      totalInvoiced: total.toString(),
      totalPaid: paid.toString(),
      outstanding: total.minus(paid).toString(),
    };
  }

  // ---- Yeni raporlar ----

  // Son N ayın faturalanan + tahsil edilen tutarı (issuedAt yoksa createdAt).
  async revenueMonthly(months = 12) {
    const n = Math.min(36, Math.max(1, months));
    const keys = this.lastMonthKeys(n);
    const acc = new Map(
      keys.map((k) => [k, { invoiced: new D(0), paid: new D(0) }]),
    );
    const invoices = await this.repo.nonCancelledInvoices();
    for (const inv of invoices) {
      const key = this.ym(inv.issuedAt ?? inv.createdAt);
      const bucket = acc.get(key);
      if (!bucket) continue;
      bucket.invoiced = bucket.invoiced.plus(inv.total);
      bucket.paid = bucket.paid.plus(inv.amountPaid);
    }
    return {
      months: keys.map((k) => ({
        month: k,
        invoiced: acc.get(k)!.invoiced.toDecimalPlaces(2).toString(),
        paid: acc.get(k)!.paid.toDecimalPlaces(2).toString(),
      })),
    };
  }

  // Satışçı bazlı: kazanılan/açık deal sayı+değer + kapanış başarı oranı.
  async salesByOwner() {
    const deals = await this.repo.allDeals();
    interface Row {
      wonCount: number;
      wonValue: Prisma.Decimal;
      openCount: number;
      openValue: Prisma.Decimal;
      lostCount: number;
    }
    const map = new Map<string, Row>();
    const key = (id: string | null) => id ?? '__none__';
    for (const d of deals) {
      const k = key(d.ownerId);
      const row =
        map.get(k) ??
        ({
          wonCount: 0,
          wonValue: new D(0),
          openCount: 0,
          openValue: new D(0),
          lostCount: 0,
        } as Row);
      const val = d.value ?? new D(0);
      if (d.status === 'WON') {
        row.wonCount += 1;
        row.wonValue = row.wonValue.plus(val);
      } else if (d.status === 'OPEN') {
        row.openCount += 1;
        row.openValue = row.openValue.plus(val);
      } else if (d.status === 'LOST') {
        row.lostCount += 1;
      }
      map.set(k, row);
    }
    const ids = [...map.keys()].filter((k) => k !== '__none__');
    const users = ids.length ? await this.repo.usersByIds(ids) : [];
    const nameOf = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]),
    );
    return [...map.entries()]
      .map(([k, r]) => {
        const closed = r.wonCount + r.lostCount;
        return {
          ownerId: k === '__none__' ? null : k,
          name: k === '__none__' ? null : (nameOf.get(k) ?? null),
          wonCount: r.wonCount,
          wonValue: r.wonValue.toDecimalPlaces(2).toString(),
          openCount: r.openCount,
          openValue: r.openValue.toDecimalPlaces(2).toString(),
          lostCount: r.lostCount,
          winRate: closed ? Math.round((r.wonCount / closed) * 100) : 0,
        };
      })
      .sort((a, b) => Number(b.wonValue) - Number(a.wonValue));
  }

  // Ürün bazlı: teklif kalemlerinden ürün başına ciro + miktar (en yüksek N).
  async topProducts(limit = 10) {
    const take = Math.min(50, Math.max(1, limit));
    const lines = await this.repo.quoteLinesWithProduct();
    const map = new Map<
      string,
      { revenue: Prisma.Decimal; quantity: Prisma.Decimal }
    >();
    for (const l of lines) {
      if (!l.productId) continue;
      const row = map.get(l.productId) ?? {
        revenue: new D(0),
        quantity: new D(0),
      };
      row.revenue = row.revenue.plus(l.lineTotal);
      row.quantity = row.quantity.plus(l.quantity);
      map.set(l.productId, row);
    }
    const ids = [...map.keys()];
    const products = ids.length ? await this.repo.productsByIds(ids) : [];
    const nameOf = new Map(products.map((p) => [p.id, p.name]));
    return [...map.entries()]
      .map(([id, r]) => ({
        productId: id,
        name: nameOf.get(id) ?? '—',
        revenue: r.revenue.toDecimalPlaces(2).toString(),
        quantity: r.quantity.toDecimalPlaces(2).toString(),
      }))
      .sort((a, b) => Number(b.revenue) - Number(a.revenue))
      .slice(0, take);
  }

  // Son N ayın kazanılan/kaybedilen deal trendi + genel başarı oranı.
  async wonLostMonthly(months = 6) {
    const n = Math.min(36, Math.max(1, months));
    const keys = this.lastMonthKeys(n);
    const acc = new Map(
      keys.map((k) => [k, { wonCount: 0, wonValue: new D(0), lostCount: 0 }]),
    );
    const deals = await this.repo.allDeals();
    let totalWon = 0;
    let totalLost = 0;
    for (const d of deals) {
      if (d.status === 'WON') totalWon += 1;
      else if (d.status === 'LOST') totalLost += 1;
      else continue;
      const bucket = acc.get(this.ym(d.updatedAt));
      if (!bucket) continue;
      if (d.status === 'WON') {
        bucket.wonCount += 1;
        bucket.wonValue = bucket.wonValue.plus(d.value ?? new D(0));
      } else {
        bucket.lostCount += 1;
      }
    }
    const closed = totalWon + totalLost;
    return {
      winRate: closed ? Math.round((totalWon / closed) * 100) : 0,
      totalWon,
      totalLost,
      months: keys.map((k) => ({
        month: k,
        wonCount: acc.get(k)!.wonCount,
        wonValue: acc.get(k)!.wonValue.toDecimalPlaces(2).toString(),
        lostCount: acc.get(k)!.lostCount,
      })),
    };
  }

  // 'YYYY-MM' anahtarı (sunucu UTC; gösterim katmanı ayrı).
  private ym(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private lastMonthKeys(n: number): string[] {
    const now = new Date();
    const keys: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      keys.push(this.ym(d));
    }
    return keys;
  }
}
