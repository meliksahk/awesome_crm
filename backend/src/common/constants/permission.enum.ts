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
  LEAD: {
    CREATE: 'lead.create',
    READ: 'lead.read',
    UPDATE: 'lead.update',
    DELETE: 'lead.delete',
    MOVE: 'lead.move',
  },
  INVOICE: {
    CREATE: 'invoice.create',
    READ: 'invoice.read',
    UPDATE: 'invoice.update',
    DELETE: 'invoice.delete',
    READ_FINANCIAL: 'invoice.read_financial',
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
    PERMISSIONS.LEAD.CREATE,
    PERMISSIONS.LEAD.READ,
    PERMISSIONS.LEAD.UPDATE,
    PERMISSIONS.LEAD.DELETE,
    PERMISSIONS.LEAD.MOVE,
    PERMISSIONS.INVOICE.READ,
  ],
  [ROLE_NAMES.SALES]: [
    PERMISSIONS.LEAD.CREATE,
    PERMISSIONS.LEAD.READ,
    PERMISSIONS.LEAD.UPDATE,
    PERMISSIONS.LEAD.MOVE,
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
    PERMISSIONS.LEAD.READ,
    PERMISSIONS.INVOICE.READ,
  ],
};
