// src/modules/auth/auth.controller.ts
// SADECE HTTP: DTO alır, servisi çağırır, refresh cookie set/clear eder. İş mantığı YOK.
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Yeni kullanıcı kaydı' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Brute-force engeli: env'den (THROTTLE_LIMIT/TTL) gelen sıkı sınır.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Giriş — access token + httpOnly refresh cookie' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.validateAndLogin(dto);
    this.setRefreshCookie(res, result);
    return this.toLoginResponse(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh cookie ile access token yenileme (rotasyon)',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      // Public ama cookie yoksa 401 — UnauthorizedException servis tarafında atılır.
      const result = await this.authService.refresh('');
      this.setRefreshCookie(res, result);
      return this.toLoginResponse(result);
    }
    const result = await this.authService.refresh(token);
    this.setRefreshCookie(res, result);
    return this.toLoginResponse(result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Çıkış — refresh token iptali + cookie temizleme' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.authService.logout(token);
    this.clearRefreshCookie(res);
    return { loggedOut: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Mevcut kullanıcı profili' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // --- Cookie yardımcıları ---

  private setRefreshCookie(res: Response, result: LoginResult): void {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: this.config.get<boolean>('COOKIE_SECURE', false),
      sameSite: 'strict',
      expires: result.refreshExpiresAt,
      path: '/api/v1/auth',
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.config.get<boolean>('COOKIE_SECURE', false),
      sameSite: 'strict',
      path: '/api/v1/auth',
    });
  }

  // Ham refresh token yanıt gövdesinde DÖNDÜRÜLMEZ (yalnız httpOnly cookie'de).
  private toLoginResponse(result: LoginResult) {
    return { accessToken: result.accessToken, user: result.user };
  }
}
