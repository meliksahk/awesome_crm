'use client';
// src/components/organisms/Sidebar.tsx — izne göre menü öğeleri (i18n).
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { NavItem } from '../molecules/NavItem';

export function Sidebar() {
  const { can } = useAuth();
  const { t } = useI18n();
  return (
    <aside className="flex w-56 flex-col bg-gray-900 p-4">
      <div className="mb-6 px-2 text-lg font-bold text-white">
        {t('app.title')}
      </div>
      <nav className="space-y-1">
        <NavItem href="/" label={t('nav.dashboard')} />
        {can('lead.read') && <NavItem href="/leads" label={t('nav.leads')} />}
        {can('lead_form.read') && (
          <NavItem href="/lead-forms" label={t('nav.leadForms')} />
        )}
        {can('deal.read') && <NavItem href="/deals" label={t('nav.deals')} />}
        {can('contact.read') && (
          <NavItem href="/contacts" label={t('nav.contacts')} />
        )}
        {can('company.read') && (
          <NavItem href="/companies" label={t('nav.companies')} />
        )}
        {can('meeting.read') && (
          <NavItem href="/meetings" label={t('nav.meetings')} />
        )}
        {can('product.read') && (
          <NavItem href="/products" label={t('nav.products')} />
        )}
        {can('quote.read') && <NavItem href="/quotes" label={t('nav.quotes')} />}
        {can('invoice.read') && (
          <NavItem href="/invoices" label={t('nav.invoices')} />
        )}
        {can('deal.read') && (
          <NavItem href="/reports" label={t('nav.reports')} />
        )}
        {can('ai.use') && <NavItem href="/ai" label={t('nav.ai')} />}
        {(can('data.export') || can('data.import')) && (
          <NavItem href="/data" label={t('nav.data')} />
        )}
        {can('automation.read') && (
          <NavItem href="/automation" label={t('nav.automation')} />
        )}
        {can('custom_field.read') && (
          <NavItem href="/custom-fields" label={t('nav.customFields')} />
        )}
        {can('audit.read') && <NavItem href="/audit" label={t('nav.audit')} />}
        {can('role.read') && <NavItem href="/roles" label={t('nav.roles')} />}
        {can('platform.tenant.manage') && (
          <NavItem href="/tenants" label={t('nav.tenants')} />
        )}
        {can('user.read') && <NavItem href="/users" label={t('nav.users')} />}
        <NavItem href="/language" label={t('nav.language')} />
      </nav>
    </aside>
  );
}
