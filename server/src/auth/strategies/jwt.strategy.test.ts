import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it.each([undefined, '   '])('refuses to initialize without a non-empty signing secret', (secret) => {
    const configService = { get: vi.fn(() => secret) };
    const authService = { validateUser: vi.fn() };

    expect(() => new JwtStrategy(
      configService as unknown as ConfigService,
      authService as unknown as AuthService,
    )).toThrow('JWT_SECRET is required. Refusing to start without a signing secret.');
  });

  describe('validate', () => {
    it('resolves the token subject to the current public user profile', async () => {
      const profile = { id: 12, email: 'person@example.com', name: 'Ada' };
      const authService = { validateUser: vi.fn().mockResolvedValue(profile) };
      const configService = { get: vi.fn(() => 'signing-secret') };
      const strategy = new JwtStrategy(
        configService as unknown as ConfigService,
        authService as unknown as AuthService,
      );

      await expect(
        strategy.validate({ sub: '12', email: 'person@example.com' }),
      ).resolves.toBe(profile);
      expect(authService.validateUser).toHaveBeenCalledWith('12');
    });

    it('propagates rejection when the token subject no longer exists', async () => {
      const error = new Error('User no longer exists');
      const authService = { validateUser: vi.fn().mockRejectedValue(error) };
      const configService = { get: vi.fn(() => 'signing-secret') };
      const strategy = new JwtStrategy(
        configService as unknown as ConfigService,
        authService as unknown as AuthService,
      );

      await expect(
        strategy.validate({ sub: '12', email: 'person@example.com' }),
      ).rejects.toBe(error);
    });
  });
});