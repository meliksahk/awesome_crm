// backend/prisma/seed.ts
// İlk ADMIN rolünü ve admin kullanıcıyı oluşturur (idempotent — tekrar çalıştırılabilir).
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@crm.dev';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
  const bcryptCost = Number(process.env.BCRYPT_COST ?? 12);

  // ADMIN rolü (Faz 2'de izinlerle genişletilecek)
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Tam yetkili sistem yöneticisi' },
  });

  const passwordHash = await bcrypt.hash(adminPassword, bcryptCost);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
    },
  });

  // ADMIN rolünü kullanıcıya bağla (idempotent)
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  // Güvenlik: düz parolayı loglamıyoruz; yalnız e-postayı bildiriyoruz.
  console.log(`Seed tamam. Admin kullanıcı: ${adminEmail} (rol: ADMIN)`);
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
