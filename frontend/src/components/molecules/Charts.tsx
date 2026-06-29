'use client';
// src/components/molecules/Charts.tsx — bağımlılıksız SVG grafik primitifleri.
// SVG yalnız geometri çizer (viewBox 0..100, preserveAspectRatio="none" → kapsayıcıyı doldurur);
// etiket/legend HTML olarak çevresinde (yazı bozulmasın diye). Renkler hex prop.

export interface Series {
  name: string;
  color: string;
}

function Legend({ series }: { series: Series[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-3 text-xs text-gray-600">
      {series.map((s) => (
        <span key={s.name} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: s.color }}
          />
          {s.name}
        </span>
      ))}
    </div>
  );
}

// Gruplanmış dikey çubuk grafiği (çok serili).
export function BarChart({
  labels,
  series,
  values,
  height = 180,
  format = (n) => String(n),
}: {
  labels: string[];
  series: Series[];
  values: number[][]; // values[serisIndex][labelIndex]
  height?: number;
  format?: (n: number) => string;
}) {
  const flat = values.flat();
  const max = Math.max(1, ...flat);
  const g = labels.length || 1;
  const s = series.length || 1;
  const groupW = 100 / g;
  const pad = groupW * 0.15;
  const barArea = groupW * 0.7;
  const barW = barArea / s;

  return (
    <div>
      <Legend series={series} />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: '100%', height }}
        role="img"
      >
        {/* taban çizgisi */}
        <line x1="0" y1="100" x2="100" y2="100" stroke="#e5e7eb" strokeWidth="0.4" />
        {labels.map((_, i) =>
          series.map((ser, j) => {
            const v = values[j]?.[i] ?? 0;
            const h = (v / max) * 92;
            const x = i * groupW + pad + j * barW;
            return (
              <rect
                key={`${i}-${j}`}
                x={x}
                y={100 - h}
                width={barW * 0.9}
                height={h}
                fill={ser.color}
                rx="0.5"
              >
                <title>{`${ser.name}: ${format(v)}`}</title>
              </rect>
            );
          }),
        )}
      </svg>
      <div className="mt-1 flex text-[10px] text-gray-400">
        {labels.map((l) => (
          <span key={l} className="flex-1 truncate text-center">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// Halka (donut) grafiği — kategori dağılımı.
export function DonutChart({
  data,
  format = (n) => String(n),
}: {
  data: { label: string; value: number; color: string }[];
  format?: (n: number) => string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let offset = 0;
  const R = 15.915; // çevre = 100
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 36 36" style={{ width: 120, height: 120 }} role="img">
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="4"
        />
        {data.map((d) => {
          const frac = (d.value / total) * 100;
          const seg = (
            <circle
              key={d.label}
              cx="18"
              cy="18"
              r={R}
              fill="none"
              stroke={d.color}
              strokeWidth="4"
              strokeDasharray={`${frac} ${100 - frac}`}
              strokeDashoffset={25 - offset}
            >
              <title>{`${d.label}: ${format(d.value)}`}</title>
            </circle>
          );
          offset += frac;
          return seg;
        })}
      </svg>
      <div className="space-y-1 text-xs text-gray-600">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-gray-700">{d.label}</span>
            <span className="text-gray-400">· {format(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Yatay çubuk listesi (sıralı: satışçı/ürün) — saf HTML.
export function HBarList({
  data,
  color = '#6366f1',
  format = (n) => String(n),
  empty,
}: {
  data: { label: string; value: number; sub?: string }[];
  color?: string;
  format?: (n: number) => string;
  empty?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) {
    return <p className="text-sm text-gray-400">{empty ?? '—'}</p>;
  }
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="w-28 truncate text-xs text-gray-600" title={d.label}>
            {d.label}
          </span>
          <div className="h-4 flex-1 rounded bg-gray-100">
            <div
              className="h-4 rounded"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="w-28 text-right text-xs text-gray-500">
            {format(d.value)}
            {d.sub ? ` · ${d.sub}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
