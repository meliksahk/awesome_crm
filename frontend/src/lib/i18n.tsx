'use client';
// src/lib/i18n.tsx — basit i18n motoru.
// Yerleşik diller: Türkçe (tr) + İngilizce (en). Kullanıcı, İngilizce şablonu indirip
// doldurarak panelden YENİ dil ekleyebilir (tarayıcıda localStorage'da saklanır).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type Dict = Record<string, string>;

// --- İngilizce (şablon kaynağı: tüm anahtarlar burada tanımlı) ---
export const en: Dict = {
  'app.title': 'CRM',
  // Navigation
  'nav.dashboard': 'Dashboard',
  'nav.leads': 'Leads',
  'nav.deals': 'Deals',
  'nav.contacts': 'Contacts',
  'nav.companies': 'Companies',
  'nav.meetings': 'Meetings',
  'nav.products': 'Products',
  'nav.quotes': 'Quotes',
  'nav.invoices': 'Invoices',
  'nav.reports': 'Reports',
  'nav.ai': 'AI Assistant',
  'nav.data': 'Data',
  'nav.automation': 'Automation',
  'nav.customFields': 'Custom Fields',
  'nav.audit': 'Audit',
  'nav.roles': 'Roles',
  'nav.tenants': 'Tenants',
  'nav.users': 'Users',
  'nav.language': 'Language',
  // Topbar
  'topbar.search': 'Search (deal, contact, company)…',
  'topbar.logout': 'Log out',
  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.create': 'Create',
  'common.add': 'Add',
  'common.new': 'New',
  'common.loading': 'Loading…',
  'common.empty': 'No records',
  'common.error': 'Operation failed — check the fields and your permissions.',
  // Page titles
  'page.dashboard': 'Dashboard',
  'page.deals': 'Sales (Deals) — Kanban',
  'page.leads': 'Leads (unqualified)',
  'page.contacts': 'Contacts',
  'page.companies': 'Companies',
  'page.meetings': 'Meetings',
  'page.products': 'Products',
  'page.quotes': 'Quotes',
  'page.invoices': 'Invoices',
  'page.reports': 'Reports',
  'page.ai': 'AI Assistant',
  'page.data': 'Data',
  'page.search': 'Search',
  'page.audit': 'Audit Log',
  'page.roles': 'Roles & Permissions',
  'page.customFields': 'Custom Fields',
  'page.automation': 'Automation Rules',
  'page.tenants': 'Tenants (Platform)',
  'page.users': 'Users',
  'page.language': 'Language',
  // Login
  'login.title': 'Sign in',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.error': 'Invalid credentials.',
  // Dashboard
  'dash.deals': 'Deals',
  'dash.dealsHint': 'Total sales opportunities',
  'dash.invoices': 'Invoices',
  'dash.invoicesHint': 'Total invoices',
  'dash.users': 'Users',
  'dash.usersHint': 'System users',
  'dash.noModules': 'You have no module access to display.',
  'dash.loading': 'Loading data…',
  'dash.fresh': 'Data is up to date (live API: /api/v1).',
  // Language page
  'lang.title': 'Language',
  'lang.current': 'Active language',
  'lang.downloadTemplate': 'Download English template (.json)',
  'lang.templateHint':
    'Fill the values in the downloaded file (keep the keys), then upload it below.',
  'lang.addTitle': 'Add a language',
  'lang.codeLabel': 'Code (e.g. de, fr)',
  'lang.nameLabel': 'Name (e.g. Deutsch)',
  'lang.fileLabel': 'Translation file (.json)',
  'lang.addButton': 'Add language',
  'lang.custom': 'Custom languages',
  'lang.remove': 'Remove',
  'lang.invalid': 'Invalid file — must be a JSON object of key→text.',
  'lang.builtin': 'built-in',
  // Table columns
  'col.name': 'Name',
  'col.email': 'Email',
  'col.title': 'Title',
  'col.company': 'Company',
  'col.phone': 'Phone',
  'col.domain': 'Domain',
  'col.industry': 'Industry',
  'col.contactsCount': 'Contacts',
  'col.source': 'Source',
  'col.status': 'Status',
  'col.product': 'Product',
  'col.sku': 'SKU',
  'col.unitPrice': 'Unit price',
  'col.taxRate': 'VAT %',
  'col.number': 'No',
  'col.customer': 'Customer',
  'col.amount': 'Amount',
  'col.roles': 'Roles',
  'col.entity': 'Entity',
  'col.key': 'Key',
  'col.label': 'Label',
  'col.type': 'Type',
  'col.required': 'Required',
  'col.trigger': 'Trigger',
  'col.action': 'Action',
  'col.actions': 'Actions',
  'col.time': 'Time',
  'col.actor': 'Actor',
  'col.slug': 'Slug',
  'col.permCount': 'Permissions',
  'col.description': 'Description',
  'col.role': 'Role',
  'col.hidden': 'hidden',
  // Form field labels
  'field.firstName': 'First name',
  'field.lastName': 'Last name',
  'field.email': 'Email',
  'field.phone': 'Phone',
  'field.title': 'Title',
  'field.company': 'Company',
  'field.name': 'Name',
  'field.domain': 'Domain',
  'field.industry': 'Industry',
  'field.website': 'Website',
  'field.sku': 'SKU',
  'field.unitPrice': 'Unit price',
  'field.currency': 'Currency',
  'field.taxRate': 'VAT %',
  'field.description': 'Description',
  'field.companyName': 'Company',
  'field.source': 'Source',
  'field.status': 'Status',
  'field.password': 'Password',
  'field.startsAt': 'Start',
  'field.endsAt': 'End',
  'field.location': 'Location',
  'field.notes': 'Notes',
  'field.subject': 'Title',
  'field.amount': 'Amount',
  'field.method': 'Method',
  'field.reference': 'Reference',
  // "New X" buttons
  'btn.newContact': '+ New contact',
  'btn.newCompany': '+ New company',
  'btn.newLead': '+ New lead',
  'btn.newProduct': '+ New product',
  'btn.newMeeting': '+ New meeting',
  'btn.newUser': '+ New user',
  'btn.newRole': '+ New role',
  'btn.newField': '+ New field',
  'btn.newRule': '+ New rule',
  'btn.newTenant': '+ New tenant',
  'btn.newInvoice': '+ New invoice',
  'btn.newQuote': '+ New quote',
  'btn.addItem': '+ Item',
  // Modal titles
  'm.newContact': 'New contact',
  'm.editContact': 'Edit contact',
  'm.newCompany': 'New company',
  'm.editCompany': 'Edit company',
  'm.newLead': 'New lead',
  'm.editLead': 'Edit lead',
  'm.newProduct': 'New product',
  'm.editProduct': 'Edit product',
  'm.newMeeting': 'New meeting',
  'm.editMeeting': 'Edit meeting',
  'm.newUser': 'New user',
  // Row actions
  'act.convert': 'Convert',
  'act.send': 'Send',
  'act.accept': 'Accept',
  'act.reject': 'Reject',
  'act.invoice': 'Invoice',
  'act.issue': 'Issue',
  'act.payment': 'Payment',
  'act.cancel': 'Cancel',
  // Status labels
  's.active': 'Active',
  's.passive': 'Inactive',
  's.yes': 'Yes',
  // Deal extras
  'field.value': 'Value',
  'field.contactName': 'Contact',
  'field.stage': 'Stage',
  'deal.newTitle': 'New deal',
  'deal.showFields': '+ Show fields',
  'deal.hideFields': 'Hide',
  'deal.editTitle': 'Edit deal',
  'deal.addHint': 'Added to the first stage; you can drag to move it.',
  // Quote / invoice extras
  'q.customerName': 'Customer name',
  'q.taxRate': 'VAT %',
  'q.items': 'Items',
  'q.product': '— Select product (opt.) —',
  'q.description': 'Description',
  'q.quantity': 'Quantity',
  'q.unitPrice': 'Unit price',
  'inv.confirmCancel': 'Cancel this invoice?',
  'q.confirmDelete': 'Delete this quote?',
  // Roles / custom fields / automation
  'role.permissions': 'Permissions',
  'role.nameLabel': 'Name (UPPER_CASE)',
  'cf.entity': 'Entity',
  'cf.immutable': '(immutable)',
  'cf.options': 'SELECT options (one per line / comma)',
  'cf.requiredField': 'Required field',
  'auto.trigger': 'Trigger',
  'auto.condition': 'Condition (optional) — payload field = value',
  'auto.field': 'Field',
  'auto.equals': 'Equals',
  'auto.actions': 'Actions',
  'auto.addAction': '+ Action',
  'auto.remove': 'Remove',
  'common.active': 'Active',
};

// --- Türkçe ---
export const tr: Dict = {
  'app.title': 'CRM',
  'nav.dashboard': 'Panel',
  'nav.leads': "Lead'ler",
  'nav.deals': 'Anlaşmalar',
  'nav.contacts': 'Kişiler',
  'nav.companies': 'Şirketler',
  'nav.meetings': 'Toplantılar',
  'nav.products': 'Ürünler',
  'nav.quotes': 'Teklifler',
  'nav.invoices': 'Faturalar',
  'nav.reports': 'Raporlar',
  'nav.ai': 'AI Asistan',
  'nav.data': 'Veri',
  'nav.automation': 'Otomasyon',
  'nav.customFields': 'Özel Alanlar',
  'nav.audit': 'Denetim',
  'nav.roles': 'Roller',
  'nav.tenants': "Tenant'lar",
  'nav.users': 'Kullanıcılar',
  'nav.language': 'Dil',
  'topbar.search': 'Ara (deal, kişi, şirket)…',
  'topbar.logout': 'Çıkış',
  'common.save': 'Kaydet',
  'common.cancel': 'Vazgeç',
  'common.delete': 'Sil',
  'common.create': 'Oluştur',
  'common.add': 'Ekle',
  'common.new': 'Yeni',
  'common.loading': 'Yükleniyor…',
  'common.empty': 'Kayıt yok',
  'common.error': 'İşlem başarısız — alanları ve yetkinizi kontrol edin.',
  'page.dashboard': 'Panel',
  'page.deals': 'Satış (Deal) — Kanban',
  'page.leads': "Lead'ler (nitelenmemiş)",
  'page.contacts': 'Kişiler',
  'page.companies': 'Şirketler',
  'page.meetings': 'Toplantılar',
  'page.products': 'Ürünler',
  'page.quotes': 'Teklifler',
  'page.invoices': 'Faturalar',
  'page.reports': 'Raporlar',
  'page.ai': 'AI Asistan',
  'page.data': 'Veri',
  'page.search': 'Arama',
  'page.audit': 'Denetim Kaydı',
  'page.roles': 'Roller & İzinler',
  'page.customFields': 'Özel Alanlar',
  'page.automation': 'Otomasyon Kuralları',
  'page.tenants': "Tenant'lar (Platform)",
  'page.users': 'Kullanıcılar',
  'page.language': 'Dil',
  'login.title': 'Giriş yap',
  'login.email': 'E-posta',
  'login.password': 'Parola',
  'login.submit': 'Giriş yap',
  'login.error': 'Geçersiz kimlik bilgileri.',
  'dash.deals': 'Deal',
  'dash.dealsHint': 'Toplam satış fırsatı',
  'dash.invoices': 'Fatura',
  'dash.invoicesHint': 'Toplam fatura',
  'dash.users': 'Kullanıcı',
  'dash.usersHint': 'Sistem kullanıcıları',
  'dash.noModules': 'Görüntülenecek modül yetkiniz yok.',
  'dash.loading': 'Veriler çekiliyor…',
  'dash.fresh': 'Veriler güncel (canlı API: /api/v1).',
  'lang.title': 'Dil',
  'lang.current': 'Aktif dil',
  'lang.downloadTemplate': 'İngilizce şablonu indir (.json)',
  'lang.templateHint':
    'İndirdiğiniz dosyadaki değerleri doldurun (anahtarları değiştirmeyin), sonra aşağıdan yükleyin.',
  'lang.addTitle': 'Dil ekle',
  'lang.codeLabel': 'Kod (örn. de, fr)',
  'lang.nameLabel': 'Ad (örn. Deutsch)',
  'lang.fileLabel': 'Çeviri dosyası (.json)',
  'lang.addButton': 'Dili ekle',
  'lang.custom': 'Özel diller',
  'lang.remove': 'Kaldır',
  'lang.invalid': 'Geçersiz dosya — anahtar→metin içeren bir JSON nesnesi olmalı.',
  'lang.builtin': 'yerleşik',
  // Tablo sütunları
  'col.name': 'Ad',
  'col.email': 'E-posta',
  'col.title': 'Ünvan',
  'col.company': 'Şirket',
  'col.phone': 'Telefon',
  'col.domain': 'Alan adı',
  'col.industry': 'Sektör',
  'col.contactsCount': 'Kişi',
  'col.source': 'Kaynak',
  'col.status': 'Durum',
  'col.product': 'Ürün',
  'col.sku': 'SKU',
  'col.unitPrice': 'Birim fiyat',
  'col.taxRate': 'KDV %',
  'col.number': 'No',
  'col.customer': 'Müşteri',
  'col.amount': 'Tutar',
  'col.roles': 'Roller',
  'col.entity': 'Varlık',
  'col.key': 'Anahtar',
  'col.label': 'Etiket',
  'col.type': 'Tip',
  'col.required': 'Zorunlu',
  'col.trigger': 'Tetikleyici',
  'col.action': 'İşlem',
  'col.actions': 'Eylem',
  'col.time': 'Zaman',
  'col.actor': 'Aktör',
  'col.slug': 'Slug',
  'col.permCount': 'İzin sayısı',
  'col.description': 'Açıklama',
  'col.role': 'Rol',
  'col.hidden': 'gizli',
  // Form alan etiketleri
  'field.firstName': 'Ad',
  'field.lastName': 'Soyad',
  'field.email': 'E-posta',
  'field.phone': 'Telefon',
  'field.title': 'Ünvan',
  'field.company': 'Şirket',
  'field.name': 'Ad',
  'field.domain': 'Alan adı',
  'field.industry': 'Sektör',
  'field.website': 'Web sitesi',
  'field.sku': 'SKU',
  'field.unitPrice': 'Birim fiyat',
  'field.currency': 'Para birimi',
  'field.taxRate': 'KDV %',
  'field.description': 'Açıklama',
  'field.companyName': 'Şirket',
  'field.source': 'Kaynak',
  'field.status': 'Durum',
  'field.password': 'Parola',
  'field.startsAt': 'Başlangıç',
  'field.endsAt': 'Bitiş',
  'field.location': 'Konum',
  'field.notes': 'Notlar',
  'field.subject': 'Başlık',
  'field.amount': 'Tutar',
  'field.method': 'Yöntem',
  'field.reference': 'Referans',
  // "Yeni X" butonları
  'btn.newContact': '+ Yeni kişi',
  'btn.newCompany': '+ Yeni şirket',
  'btn.newLead': '+ Yeni lead',
  'btn.newProduct': '+ Yeni ürün',
  'btn.newMeeting': '+ Yeni toplantı',
  'btn.newUser': '+ Yeni kullanıcı',
  'btn.newRole': '+ Yeni rol',
  'btn.newField': '+ Yeni alan',
  'btn.newRule': '+ Yeni kural',
  'btn.newTenant': '+ Yeni tenant',
  'btn.newInvoice': '+ Yeni fatura',
  'btn.newQuote': '+ Yeni teklif',
  'btn.addItem': '+ Kalem',
  // Modal başlıkları
  'm.newContact': 'Yeni kişi',
  'm.editContact': 'Kişiyi düzenle',
  'm.newCompany': 'Yeni şirket',
  'm.editCompany': 'Şirketi düzenle',
  'm.newLead': 'Yeni lead',
  'm.editLead': 'Lead düzenle',
  'm.newProduct': 'Yeni ürün',
  'm.editProduct': 'Ürünü düzenle',
  'm.newMeeting': 'Yeni toplantı',
  'm.editMeeting': 'Toplantıyı düzenle',
  'm.newUser': 'Yeni kullanıcı',
  // Satır aksiyonları
  'act.convert': 'Dönüştür',
  'act.send': 'Gönder',
  'act.accept': 'Kabul',
  'act.reject': 'Ret',
  'act.invoice': 'Faturala',
  'act.issue': 'Kesinleştir',
  'act.payment': 'Ödeme',
  'act.cancel': 'İptal',
  // Durum etiketleri
  's.active': 'Aktif',
  's.passive': 'Pasif',
  's.yes': 'Evet',
  // Deal ekstra
  'field.value': 'Değer',
  'field.contactName': 'İlgili kişi',
  'field.stage': 'Aşama',
  'deal.newTitle': 'Yeni anlaşma',
  'deal.showFields': '+ Alanları göster',
  'deal.hideFields': 'Gizle',
  'deal.editTitle': 'Anlaşmayı düzenle',
  'deal.addHint': 'İlk aşamaya eklenir; sürükleyerek taşıyabilirsiniz.',
  // Teklif / fatura ekstra
  'q.customerName': 'Müşteri adı',
  'q.taxRate': 'KDV %',
  'q.items': 'Kalemler',
  'q.product': '— Ürün seç (ops.) —',
  'q.description': 'Açıklama',
  'q.quantity': 'Miktar',
  'q.unitPrice': 'Birim fiyat',
  'inv.confirmCancel': 'Fatura iptal edilsin mi?',
  'q.confirmDelete': 'Teklif silinsin mi?',
  // Roller / özel alanlar / otomasyon
  'role.permissions': 'İzinler',
  'role.nameLabel': 'Ad (BÜYÜK_HARF)',
  'cf.entity': 'Varlık',
  'cf.immutable': '(değişmez)',
  'cf.options': 'SELECT seçenekleri (her satır / virgül)',
  'cf.requiredField': 'Zorunlu alan',
  'auto.trigger': 'Tetikleyici',
  'auto.condition': 'Koşul (opsiyonel) — payload alanı = değer',
  'auto.field': 'Alan',
  'auto.equals': 'Eşittir',
  'auto.actions': 'Eylemler',
  'auto.addAction': '+ Eylem',
  'auto.remove': 'Kaldır',
  'common.active': 'Aktif',
};

const BUILTIN: Record<string, { name: string; dict: Dict }> = {
  tr: { name: 'Türkçe', dict: tr },
  en: { name: 'English', dict: en },
};

interface CustomLang {
  name: string;
  dict: Dict;
}
interface I18nCtx {
  lang: string;
  setLang: (code: string) => void;
  t: (key: string) => string;
  languages: { code: string; name: string; builtin: boolean }[];
  addLanguage: (code: string, name: string, dict: Dict) => void;
  removeLanguage: (code: string) => void;
  templateJson: () => string;
}

const Ctx = createContext<I18nCtx | null>(null);
const LS_LANG = 'crm_lang';
const LS_CUSTOM = 'crm_custom_langs';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState('tr');
  const [custom, setCustom] = useState<Record<string, CustomLang>>({});

  // Tarayıcıdan yükle (hydration uyumsuzluğunu önlemek için mount sonrası).
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem(LS_CUSTOM) || '{}');
      if (c && typeof c === 'object') setCustom(c);
    } catch {
      /* yoksay */
    }
    const l = localStorage.getItem(LS_LANG);
    if (l) setLangState(l);
  }, []);

  const setLang = useCallback((code: string) => {
    setLangState(code);
    try {
      localStorage.setItem(LS_LANG, code);
    } catch {
      /* yoksay */
    }
  }, []);

  const dict = useMemo<Dict>(
    () => BUILTIN[lang]?.dict ?? custom[lang]?.dict ?? tr,
    [lang, custom],
  );

  const t = useCallback((key: string) => dict[key] ?? en[key] ?? key, [dict]);

  const persistCustom = (next: Record<string, CustomLang>) => {
    try {
      localStorage.setItem(LS_CUSTOM, JSON.stringify(next));
    } catch {
      /* yoksay */
    }
  };

  const addLanguage = useCallback(
    (code: string, name: string, d: Dict) => {
      setCustom((prev) => {
        const next = { ...prev, [code]: { name, dict: d } };
        persistCustom(next);
        return next;
      });
    },
    [],
  );

  const removeLanguage = useCallback(
    (code: string) => {
      setCustom((prev) => {
        const next = { ...prev };
        delete next[code];
        persistCustom(next);
        return next;
      });
      setLangState((cur) => {
        if (cur !== code) return cur;
        try {
          localStorage.setItem(LS_LANG, 'tr');
        } catch {
          /* yoksay */
        }
        return 'tr';
      });
    },
    [],
  );

  const languages = useMemo(
    () => [
      { code: 'tr', name: 'Türkçe', builtin: true },
      { code: 'en', name: 'English', builtin: true },
      ...Object.entries(custom).map(([code, v]) => ({
        code,
        name: v.name,
        builtin: false,
      })),
    ],
    [custom],
  );

  const templateJson = useCallback(() => JSON.stringify(en, null, 2), []);

  const value: I18nCtx = {
    lang,
    setLang,
    t,
    languages,
    addLanguage,
    removeLanguage,
    templateJson,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n must be used within I18nProvider');
  return c;
}
