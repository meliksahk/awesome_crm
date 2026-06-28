// src/common/constants/permission.enum.ts
// Merkezi izin sabitleri (DRY) — "kaynak.eylem" biçimi. Hem Guard'lar hem seed kullanır.

export const PERMISSIONS = {
  USER: {
    CREATE: 'user.create',
    READ: 'user.read',
    UPDATE: 'user.update',
    DELETE: 'user.delete',
  },
  ROLE: {
    CREATE: 'role.create',
    READ: 'role.read',
    UPDATE: 'role.update',
    DELETE: 'role.delete',
    ASSIGN: 'role.assign',
  },
  DEAL: {
    CREATE: 'deal.create',
    READ: 'deal.read',
    UPDATE: 'deal.update',
    DELETE: 'deal.delete',
    MOVE: 'deal.move',
  },
  // v2.1c — nitelenmemiş Lead (Contact+Deal'e dönüştürülür)
  LEAD: {
    CREATE: 'lead.create',
    READ: 'lead.read',
    UPDATE: 'lead.update',
    DELETE: 'lead.delete',
    CONVERT: 'lead.convert',
  },
  INVOICE: {
    CREATE: 'invoice.create',
    READ: 'invoice.read',
    UPDATE: 'invoice.update',
    DELETE: 'invoice.delete',
    READ_FINANCIAL: 'invoice.read_financial',
  },
  INTEGRATION: {
    READ: 'integration.read',
    MANAGE: 'integration.manage',
  },
  // v2.1 — çekirdek CRM nesneleri
  COMPANY: {
    CREATE: 'company.create',
    READ: 'company.read',
    UPDATE: 'company.update',
    DELETE: 'company.delete',
  },
  CONTACT: {
    CREATE: 'contact.create',
    READ: 'contact.read',
    UPDATE: 'contact.update',
    DELETE: 'contact.delete',
  },
  // v2.2 — takvim/toplantı
  MEETING: {
    CREATE: 'meeting.create',
    READ: 'meeting.read',
    UPDATE: 'meeting.update',
    DELETE: 'meeting.delete',
  },
  // v2.3 — otomasyon kuralları
  AUTOMATION: {
    READ: 'automation.read',
    MANAGE: 'automation.manage',
  },
  // v2.5 — özel alan tanımları
  CUSTOM_FIELD: {
    READ: 'custom_field.read',
    MANAGE: 'custom_field.manage',
  },
} as const;

// Tüm izinlerin düz listesi (seed + doğrulama için).
export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS).flatMap(
  (group) => Object.values(group),
);

export const ROLE_NAMES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES: 'SALES',
  FINANCE: 'FINANCE',
  VIEWER: 'VIEWER',
} as const;

// Varsayılan rol → izin eşlemesi (seed). En az ayrıcalık ilkesi.
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLE_NAMES.ADMIN]: ALL_PERMISSIONS, // tüm izinler
  [ROLE_NAMES.MANAGER]: [
    PERMISSIONS.USER.READ,
    PERMISSIONS.DEAL.CREATE,
    PERMISSIONS.DEAL.READ,
    PERMISSIONS.DEAL.UPDATE,
    PERMISSIONS.DEAL.DELETE,
    PERMISSIONS.DEAL.MOVE,
    PERMISSIONS.INVOICE.READ,
    // Faz 5: entegrasyon yönetimi yalnız ADMIN/MANAGER.
    PERMISSIONS.INTEGRATION.READ,
    PERMISSIONS.INTEGRATION.MANAGE,
    // v2.1: çekirdek nesneler — MANAGER tam yetki
    PERMISSIONS.COMPANY.CREATE,
    PERMISSIONS.COMPANY.READ,
    PERMISSIONS.COMPANY.UPDATE,
    PERMISSIONS.COMPANY.DELETE,
    PERMISSIONS.CONTACT.CREATE,
    PERMISSIONS.CONTACT.READ,
    PERMISSIONS.CONTACT.UPDATE,
    PERMISSIONS.CONTACT.DELETE,
    PERMISSIONS.LEAD.CREATE,
    PERMISSIONS.LEAD.READ,
    PERMISSIONS.LEAD.UPDATE,
    PERMISSIONS.LEAD.DELETE,
    PERMISSIONS.LEAD.CONVERT,
    PERMISSIONS.MEETING.CREATE,
    PERMISSIONS.MEETING.READ,
    PERMISSIONS.MEETING.UPDATE,
    PERMISSIONS.MEETING.DELETE,
    PERMISSIONS.AUTOMATION.READ,
    PERMISSIONS.AUTOMATION.MANAGE,
    PERMISSIONS.CUSTOM_FIELD.READ,
    PERMISSIONS.CUSTOM_FIELD.MANAGE,
  ],
  [ROLE_NAMES.SALES]: [
    PERMISSIONS.DEAL.CREATE,
    PERMISSIONS.DEAL.READ,
    PERMISSIONS.DEAL.UPDATE,
    PERMISSIONS.DEAL.MOVE,
    // v2.1c: satışçı nitelenmemiş lead'leri yönetir ve dönüştürür
    PERMISSIONS.LEAD.CREATE,
    PERMISSIONS.LEAD.READ,
    PERMISSIONS.LEAD.UPDATE,
    PERMISSIONS.LEAD.CONVERT,
    PERMISSIONS.MEETING.CREATE,
    PERMISSIONS.MEETING.READ,
    PERMISSIONS.MEETING.UPDATE,
    PERMISSIONS.MEETING.DELETE,
    // Faz 4: satışçı faturanın varlığını görür ama tutarları göremez
    // (invoice.read_financial YOK → API'de finansal alanlar kesilir).
    PERMISSIONS.INVOICE.READ,
    // v2.1: satışçı kişi/şirket oluşturur ve yönetir
    PERMISSIONS.COMPANY.CREATE,
    PERMISSIONS.COMPANY.READ,
    PERMISSIONS.CONTACT.CREATE,
    PERMISSIONS.CONTACT.READ,
    PERMISSIONS.CONTACT.UPDATE,
    PERMISSIONS.CUSTOM_FIELD.READ,
  ],
  [ROLE_NAMES.FINANCE]: [
    PERMISSIONS.INVOICE.CREATE,
    PERMISSIONS.INVOICE.READ,
    PERMISSIONS.INVOICE.UPDATE,
    PERMISSIONS.INVOICE.DELETE,
    PERMISSIONS.INVOICE.READ_FINANCIAL,
  ],
  // VIEWER: salt okuma (hassas finansal okuma HARİÇ).
  [ROLE_NAMES.VIEWER]: [
    PERMISSIONS.USER.READ,
    PERMISSIONS.ROLE.READ,
    PERMISSIONS.DEAL.READ,
    PERMISSIONS.INVOICE.READ,
    PERMISSIONS.COMPANY.READ,
    PERMISSIONS.CONTACT.READ,
    PERMISSIONS.LEAD.READ,
    PERMISSIONS.MEETING.READ,
    PERMISSIONS.CUSTOM_FIELD.READ,
  ],
};
