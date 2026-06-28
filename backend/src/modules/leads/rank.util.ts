// src/modules/leads/rank.util.ts
// Kanban kesirli sıralama (fractional ranking). Saf fonksiyon → kolay test edilir.
// before = taşınan kartın ÜSTÜNDE kalacak kartın rank'i (yoksa null)
// after  = taşınan kartın ALTINDA kalacak kartın rank'i (yoksa null)

export const RANK_GAP = 1; // bitişik uçlarda kullanılan adım

export function computeRank(
  before: number | null,
  after: number | null,
): number {
  if (before === null && after === null) {
    return RANK_GAP; // boş sütun → başlangıç rank'i
  }
  if (before === null && after !== null) {
    return after - RANK_GAP; // sütun başı
  }
  if (before !== null && after === null) {
    return before + RANK_GAP; // sütun sonu
  }
  // araya bırak → ortalama
  return ((before as number) + (after as number)) / 2;
}

// Ardışık taşımalarda iki rank birbirine çok yaklaşırsa (precision tükenmesi)
// yeniden dengeleme gerekir.
export const MIN_RANK_GAP = 1e-9;

export function needsRebalance(
  before: number | null,
  after: number | null,
): boolean {
  if (before === null || after === null) return false;
  return Math.abs(after - before) < MIN_RANK_GAP;
}
