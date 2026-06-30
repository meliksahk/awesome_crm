// src/modules/branding/branding.service.ts
// İŞ MANTIĞI: marka oku (public) + güncelle. Logo yalnız güvenli data URL kabul edilir
// (XSS önlemi: frontend logoyu <img> ile render eder; script çalışmaz).
import { BadRequestException, Injectable } from '@nestjs/common';
import { BrandingRepository } from './branding.repository';
import { UpdateBrandingDto } from './dto/branding.dto';

const DATA_URL = /^data:image\/(svg\+xml|png|jpeg|webp);/i;

@Injectable()
export class BrandingService {
  constructor(private readonly repo: BrandingRepository) {}

  async get() {
    const row = await this.repo.get();
    return { appName: row?.appName ?? null, logo: row?.logo ?? null };
  }

  async update(dto: UpdateBrandingDto) {
    const data: { appName?: string | null; logo?: string | null } = {};

    if (dto.appName !== undefined) {
      const v = dto.appName.trim();
      data.appName = v.length ? v : null; // boş → varsayılan
    }
    if (dto.logo !== undefined) {
      const v = dto.logo.trim();
      if (!v) {
        data.logo = null; // boş → varsayılan logo
      } else if (!DATA_URL.test(v)) {
        throw new BadRequestException(
          'logo yalnız data URL olabilir (image/svg+xml, png, jpeg, webp).',
        );
      } else {
        data.logo = v;
      }
    }

    await this.repo.upsert(data);
    return this.get();
  }
}
