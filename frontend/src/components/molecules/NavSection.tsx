'use client';
// src/components/molecules/NavSection.tsx — açılır-kapanır (accordion) sidebar grubu.
// İçindeki tüm öğeler izinle gizlenirse (children = false/null) başlık da gösterilmez.
import { Children, ReactNode } from 'react';

export function NavSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const visible = Children.toArray(children).length; // false/null elenir
  if (visible === 0) return null;
  return (
    <div className="pt-2 first:pt-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
      >
        <span>{title}</span>
        <span
          className={`text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          ▸
        </span>
      </button>
      {open && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}
