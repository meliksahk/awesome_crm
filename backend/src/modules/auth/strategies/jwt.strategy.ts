// src/modules/auth/strategies/jwt.strategy.ts
// Access token doğrulama stratejisi. Yetkiler (roller) HER istekte güncel kaynaktan
// (DB) okunur — token'a körü körüne güvenilmez (docs/90 §3).
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthRepository } from '../auth.repository';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly authRepo: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.authRepo.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kimlik doğrulama gerekli');
    }
    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((ur) => ur.role.name),
    };
  }
}
