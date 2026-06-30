'use client';
// src/components/atoms/LogoMark.tsx — varsayılan AwesomeCRM marka işareti (saf SVG).
// Yükselen çubuklar + kıvılcım (büyüme/pipeline) gradient bir rozette. currentColor kullanmaz;
// kendi renkleriyle hem koyu hem açık zeminde çalışır.
import { useId } from 'react';

export function LogoMark({ size = 30 }: { size?: number }) {
  const gid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="AwesomeCRM"
    >
      <defs>
        <linearGradient id={`lg-${gid}`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill={`url(#lg-${gid})`} />
      {/* yükselen çubuklar */}
      <rect x="7" y="18" width="4" height="7" rx="2" fill="#fff" fillOpacity="0.75" />
      <rect x="14" y="14" width="4" height="11" rx="2" fill="#fff" fillOpacity="0.9" />
      <rect x="21" y="9" width="4" height="16" rx="2" fill="#fff" />
      {/* kıvılcım (en yüksek çubuğun tepesinde) */}
      <circle cx="23" cy="7" r="2.6" fill="#fff" />
    </svg>
  );
}
