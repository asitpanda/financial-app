import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

function requireJwtSecret(configService: ConfigService): string {
  const jwtSecret = String(configService.get('JWT_SECRET') ?? '').trim();

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required. Refusing to start without a signing secret.');
  }

  return jwtSecret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(configService),
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    return user;
  }
}
