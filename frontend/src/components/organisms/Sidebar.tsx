'use client';
// src/components/organisms/Sidebar.tsx — izne göre menü öğeleri.
import { useAuth } from '@/lib/auth';
import { NavItem } from '../molecules/NavItem';

export function Sidebar() {
  const { can } = useAuth();
  return (
    <aside className="flex w-56 flex-col bg-gray-900 p-4">
      <div className="mb-6 px-2 text-lg font-bold text-white">CRM</div>
      <nav className="space-y-1">
        <NavItem href="/" label="Panel" />
        {can('lead.read') && <NavItem href="/leads" label="Lead'ler" />}
        {can('deal.read') && <NavItem href="/deals" label="Anlaşmalar" />}
        {can('contact.read') && <NavItem href="/contacts" label="Kişiler" />}
        {can('company.read') && <NavItem href="/companies" label="Şirketler" />}
        {can('product.read') && <NavItem href="/products" label="Ürünler" />}
        {can('quote.read') && <NavItem href="/quotes" label="Teklifler" />}
        {can('invoice.read') && <NavItem href="/invoices" label="Faturalar" />}
        {can('deal.read') && <NavItem href="/reports" label="Raporlar" />}
        {can('ai.use') && <NavItem href="/ai" label="AI Asistan" />}
        {can('user.read') && <NavItem href="/users" label="Kullanıcılar" />}
      </nav>
    </aside>
  );
}
