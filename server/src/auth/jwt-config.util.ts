import { ConfigService } from '@nestjs/config';

export function requireJwtSecret(configService: ConfigService): string {
  const jwtSecret = String(configService.get('JWT_SECRET') ?? '').trim();

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required. Refusing to start without a signing secret.');
  }

  return jwtSecret;
}

export function resolveJwtExpiresIn(configService: ConfigService): string {
  const expiresIn = String(configService.get('JWT_EXPIRES_IN') ?? '').trim();
  return expiresIn || '1d';
}
