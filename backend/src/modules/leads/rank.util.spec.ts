// src/modules/leads/rank.util.spec.ts
import { computeRank, needsRebalance } from './rank.util';

describe('computeRank', () => {
  // U-3.1 — iki kart arası ortalama
  it('iki kart arasına ortalama rank verir', () => {
    expect(computeRank(1, 2)).toBe(1.5);
    expect(computeRank(1, 3)).toBe(2);
  });

  // U-3.2 — sütun başı/sonu uç rank
  it('sütun başı: after - 1', () => {
    expect(computeRank(null, 5)).toBe(4);
  });

  it('sütun sonu: before + 1', () => {
    expect(computeRank(10, null)).toBe(11);
  });

  it('boş sütun: başlangıç rank', () => {
    expect(computeRank(null, null)).toBe(1);
  });

  it('ardışık ortalama sırayı korur', () => {
    // A=1, B=2 → araya C=1.5 → A,C arasına D=1.25
    const c = computeRank(1, 2);
    const d = computeRank(1, c);
    expect(d).toBeLessThan(c);
    expect(d).toBeGreaterThan(1);
  });
});

describe('needsRebalance', () => {
  it("çok yakın rank'lerde rebalance gerektiğini bildirir", () => {
    expect(needsRebalance(1, 1 + 1e-12)).toBe(true);
    expect(needsRebalance(1, 2)).toBe(false);
    expect(needsRebalance(null, 2)).toBe(false);
  });
});
