import { describe, expect, it, vi } from 'vitest';
import { requireJwtSecret, resolveJwtExpiresIn } from './jwt-config.util';

describe('jwt-config.util', () => {
  describe('requireJwtSecret', () => {
    it('returns a non-empty trimmed signing secret', () => {
      const configService = { get: vi.fn(() => '  signing-secret  ') };

      expect(requireJwtSecret(configService)).toBe('signing-secret');
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });

    it.each([undefined, '', '   '])('rejects a missing or blank secret', (secret) => {
      const configService = { get: vi.fn(() => secret) };

      expect(() => requireJwtSecret(configService)).toThrow(
        'JWT_SECRET is required. Refusing to start without a signing secret.',
      );
    });
  });

  describe('resolveJwtExpiresIn', () => {
    it('uses the configured trimmed expiry duration', () => {
      const configService = { get: vi.fn(() => '  2h  ') };

      expect(resolveJwtExpiresIn(configService)).toBe('2h');
      expect(configService.get).toHaveBeenCalledWith('JWT_EXPIRES_IN');
    });

    it.each([undefined, '', '   '])('defaults to one day when unset or blank', (expiresIn) => {
      const configService = { get: vi.fn(() => expiresIn) };

      expect(resolveJwtExpiresIn(configService)).toBe('1d');
    });
  });
});