# Faz 2 — RBAC (Role-Based Access Control) & Kullanıcı Yönetimi

**Amaç:** Faz 1'de tanımlanan `Role`/`Permission` modelini çalışır yetkilendirmeye dönüştürmek; rol ve izin tabanlı Guard'lar ile her endpoint'i korumak; tam kullanıcı/rol yönetimi (CRUD) sağlamak.

**Önkoşul:** Faz 1 tamamlanmış (JWT, kullanıcı modeli, global `JwtAuthGuard`).

---

## 1. Kapsam

- İzin modeli (`kaynak.eylem`) ve merkezi `PermissionEnum`.
- `@Roles()` ve `@Permissions()` dekoratörleri + `RolesGuard` / `PermissionsGuard`.
- `@CurrentUser()` dekoratörü (request'ten kullanıcı çıkarımı).
- `UsersModule` ve `RolesModule`: kullanıcı/rol/izin yönetimi (CRUD).
- Yetki atama/çıkarma; en az ayrıcalık (least privilege) ilkesi.

---

## 2. Yetkilendirme Modeli

İki katmanlı kontrol:

1. **Kaba taneli (rol):** `@Roles('ADMIN')` → yalnızca belirli roller.
2. **İnce taneli (izin):** `@Permissions('user.create')` → eyleme özel.

> **Tercih:** İnce taneli izinler birincildir (esneklik). Rol kontrolü kısayoldur. İkisi birlikte kullanılırsa **AND** mantığıyla çalışır (her ikisi de sağlanmalı).

### 2.1 Merkezi İzin Sabitleri (DRY)

```ts
// backend/src/common/constants/permission.enum.ts
export const PERMISSIONS = {
  USER:    { CREATE: 'user.create', READ: 'user.read', UPDATE: 'user.update', DELETE: 'user.delete' },
  ROLE:    { CREATE: 'role.create', READ: 'role.read', UPDATE: 'role.update', DELETE: 'role.delete', ASSIGN: 'role.assign' },
  LEAD:    { CREATE: 'lead.create', READ: 'lead.read', UPDATE: 'lead.update', DELETE: 'lead.delete', MOVE: 'lead.move' },
  INVOICE: { CREATE: 'invoice.create', READ: 'invoice.read', UPDATE: 'invoice.update', DELETE: 'invoice.delete', READ_FINANCIAL: 'invoice.read_financial' },
} as const;
```

### 2.2 Varsayılan Roller (seed)

| Rol | İzinler (özet) |
|-----|----------------|
| `ADMIN` | Tüm izinler |
| `MANAGER` | user.read, lead.*, invoice.read |
| `SALES` | lead.create, lead.read, lead.update, lead.move |
| `FINANCE` | invoice.* (yalnız finans modülü) |
| `VIEWER` | *.read (salt okuma) |

---

## 3. Dekoratörler & Guard'lar

### 3.1 Dekoratörler

```ts
// backend/src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

```ts
// backend/src/common/decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);
```

```ts
// backend/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user;
    return data ? user?.[data] : user;
  },
);
```

### 3.2 PermissionsGuard (özet)

```ts
// backend/src/common/guards/permissions.guard.ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true; // izin gerekmiyorsa geç

    const { user } = ctx.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException();

    // user.permissions JWT'den DEĞİL; güvenli kaynaktan gelir (aşağıdaki nota bak)
    const granted: Set<string> = new Set(user.permissions ?? []);
    const ok = required.every((p) => granted.has(p));
    if (!ok) throw new ForbiddenException('Bu işlem için yetkiniz yok.');
    return true;
  }
}
```

> **Güvenlik notu (kritik):** İzinler doğrulanırken **JWT içindeki rol/izin listesine körü körüne güvenilmez** çünkü token süresi içinde yetkiler değişebilir. İki strateji:
> 1. İzinleri her istekte DB'den/önbellekten (kısa TTL Redis) çek → en güncel.
> 2. Yetki değişiminde ilgili kullanıcının token'larını iptal et (Faz 1 rotasyon altyapısı).
>
> Bu proje **(1)**'i seçer: `JwtStrategy.validate` kullanıcının güncel rol+izinlerini yükler ve `request.user`'a koyar.

### 3.3 Guard Sırası

```
JwtAuthGuard (kimlik)  →  RolesGuard (kaba)  →  PermissionsGuard (ince)
```

`JwtAuthGuard` global; `Roles/Permissions` Guard'ları global veya modül seviyesinde `APP_GUARD` ile bağlanır.

---

## 4. Controller Kullanımı

```ts
// backend/src/modules/users/users.controller.ts
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions(PERMISSIONS.USER.CREATE)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.USER.READ)
  findAll(@Query() q: PaginationDto) {
    return this.usersService.findAll(q);
  }

  @Patch(':id/roles')
  @Permissions(PERMISSIONS.ROLE.ASSIGN)
  assignRoles(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignRolesDto) {
    return this.usersService.assignRoles(id, dto);
  }
}
```

---

## 5. API Sözleşmesi

### Users — `/api/v1/users`

| Method | Yol | İzin |
|--------|-----|------|
| POST | `/` | `user.create` |
| GET | `/` | `user.read` |
| GET | `/:id` | `user.read` |
| PATCH | `/:id` | `user.update` |
| DELETE | `/:id` | `user.delete` (soft delete) |
| PATCH | `/:id/roles` | `role.assign` |
| PATCH | `/:id/status` | `user.update` (aktif/pasif) |

### Roles — `/api/v1/roles`

| Method | Yol | İzin |
|--------|-----|------|
| POST | `/` | `role.create` |
| GET | `/` | `role.read` |
| PATCH | `/:id` | `role.update` |
| DELETE | `/:id` | `role.delete` |
| PATCH | `/:id/permissions` | `role.update` |

---

## 6. DTO'lar

```ts
// backend/src/modules/users/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, IsArray, IsUUID, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(10) password: string;
  @IsString() firstName: string;
  @IsString() lastName: string;

  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  roleIds?: string[];
}
```

```ts
// backend/src/modules/users/dto/assign-roles.dto.ts
import { IsArray, IsUUID } from 'class-validator';
export class AssignRolesDto {
  @IsArray() @IsUUID('4', { each: true })
  roleIds: string[];
}
```

---

## 7. Güvenlik Kontrolleri (Faz 2)

| Kontrol | Uygulama |
|--------|----------|
| Privilege escalation engeli | Kullanıcı kendi rolünü/izinlerini yükseltemez; `role.assign` izni ayrı |
| Son admin koruması | Sistemdeki son `ADMIN` rolü/kullanıcısı silinemez/pasifleştirilemez |
| IDOR engeli | `:id` her zaman yetki + (gerekirse) sahiplik kontrolünden geçer |
| Mass assignment | DTO whitelist; `roleIds` yalnız `role.assign` ile değişir |
| Güncel yetki | İzinler her istekte güncel kaynaktan yüklenir (token'a güvenilmez) |
| Soft delete | Kullanıcı `DELETE` ile pasifleştirilir; sert silme yalnız admin + ayrı süreç |
| Yatay yetki | VIEWER yalnız `*.read`; yazma denemesi `403` |
| Audit | Rol/izin değişiklikleri loglanır (kim, kime, ne zaman) |

---

## 8. Kabul Kriterleri

- [ ] İzni olmayan kullanıcı korumalı endpoint'te `403` alır.
- [ ] `SALES` rolü `lead.*` yapar ama `invoice.*` yapamaz.
- [ ] Yetki anında değiştirildiğinde sonraki istek yeni yetkiyi yansıtır.
- [ ] Son admin silinemez/pasifleştirilemez.
- [ ] Kullanıcı kendi rolünü ADMIN'e yükseltemez.

---

## 9. Test Senaryoları (Faz 2)

### 9.1 Birim Testleri

| ID | Test | Beklenen |
|----|------|----------|
| U-2.1 | `PermissionsGuard` gerekli izin yokken | `false` / `ForbiddenException` |
| U-2.2 | `PermissionsGuard` çoklu izin (AND) — biri eksik | reddeder |
| U-2.3 | `RolesGuard` rol eşleşmesi | doğru kabul/ret |
| U-2.4 | `UsersService.assignRoles` geçersiz roleId | `BadRequest/NotFound` |
| U-2.5 | Son admin pasifleştirme denemesi | `ConflictException` |

### 9.2 E2E Testleri

| ID | Senaryo | Beklenen |
|----|---------|----------|
| E-2.1 | SALES token ile `POST /users` | `403` |
| E-2.2 | ADMIN token ile `POST /users` | `201` |
| E-2.3 | VIEWER token ile `GET /users` | `200` |
| E-2.4 | VIEWER token ile `PATCH /users/:id` | `403` |
| E-2.5 | SALES kullanıcı `PATCH /users/:self/roles` ADMIN ekler | `403` |
| E-2.6 | Yetki değişimi → eski izinli endpoint yeni istekte | `403` (güncel yetki) |
| E-2.7 | Son admin `DELETE` | `409` |
| E-2.8 | Geçersiz UUID `:id` | `400` (ParseUUIDPipe) |

### 9.3 Güvenlik Testleri

| ID | Test | Beklenen |
|----|------|----------|
| S-2.1 | JWT payload'ında `roles:["ADMIN"]` elle eklenmiş sahte token | İmza geçersiz → `401`; ayrıca izin DB'den doğrulanır |
| S-2.2 | IDOR: başka kullanıcının `:id`'siyle erişim | yetki yoksa `403` |
| S-2.3 | Privilege escalation API kombinasyonları | hepsinde `403` |

---

## 10. Uygulama Notları (gerçekleşen kararlar)

Faz 2 kodlanırken spec'in ötesinde alınan iki güvenlik sertleştirmesi (dürüstçe işaretlenir):

1. **Oluştururken rol atama ayrı yetki ister.** `POST /users` `user.create` ile çağrılır,
   ancak gövdede `roleIds` verilirse ek olarak `role.assign` izni aranır. Aksi hâlde
   `403`. Gerekçe: yalnız `user.create` olan biri kendine/başkasına ADMIN rolü vererek
   privilege escalation yapamasın.
2. **ADMIN (süper) rolü kilitlenmeye karşı korunur.** `DELETE /roles/:adminId` → `409`;
   `PATCH /roles/:adminId/permissions` → `409`. Gerekçe: ADMIN rolünün izinleri çıkarılır
   veya rol silinirse sistem geri dönülmez biçimde kilitlenebilir (lockout).

**Pragmatik sınır:** Audit izi şu an yapılandırılmış **log** ile tutuluyor
(`Logger`: kim, kime, ne zaman) — ayrı bir `AuditLog` tablosu ileride eklenebilir.

**Doğrulama:** 24 birim + 18 e2e testi gerçek PostgreSQL ile yeşil
(canlı yetki iptali E-2.6 dahil: rol kaldırılınca aynı access token sonraki istekte 403).

> **Sonraki faz:** [Faz 3 — Satış (Lead) & Kanban](./03-faz3-lead-kanban.md)
