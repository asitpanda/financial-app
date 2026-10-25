import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service';
import { registeredUsers } from '../mockdata';
import { AuthService } from './auth.service';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

const initialUsers = registeredUsers.map((user) => ({ ...user }));

function createAuthService(provider: 'mock' | 'postgres' = 'postgres') {
  const prisma = {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  const jwtService = { sign: vi.fn(() => 'signed-token') };
  const configService = {
    get: vi.fn((key: string) => (key === 'DB_PROVIDER' ? provider : undefined)),
  };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwtService as unknown as JwtService,
    configService as unknown as ConfigService,
  );

  return { service, prisma, jwtService };
}

const databaseUser = {
  id: 23,
  email: 'person@example.com',
  name: 'Ada',
  userId: 'ada23',
  mobile: '+15555555555',
  password: 'hashed-password',
};

beforeEach(() => {
  registeredUsers.splice(
    0,
    registeredUsers.length,
    ...initialUsers.map((user) => ({ ...user })),
  );
  vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
  vi.mocked(bcrypt.compare).mockResolvedValue(true);
});

describe('AuthService', () => {
  describe('register', () => {
    it('normalizes identifiers, hashes the password, and returns a signed user', async () => {
      const { service, prisma, jwtService } = createAuthService();
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(databaseUser);

      await expect(
        service.register({
          email: '  PERSON@Example.com ',
          password: 'secret',
          name: ' Ada ',
          userId: ' ada23 ',
          mobile: ' +15555555555 ',
        }),
      ).resolves.toEqual({
        user: { id: 23, email: 'person@example.com', name: 'Ada' },
        token: 'signed-token',
      });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: 'person@example.com' },
            { userId: 'ada23' },
            { mobile: '+15555555555' },
          ],
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'person@example.com',
          userId: 'ada23',
          mobile: '+15555555555',
          password: 'hashed-password',
          name: 'Ada',
        },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '23',
        email: 'person@example.com',
      });
    });

    it.each([
      ['email', { email: 'person@example.com' }, 'Email already exists'],
      ['user ID', { userId: 'ada23' }, 'User ID already taken'],
      ['mobile number', { mobile: '+15555555555' }, 'Mobile number already registered'],
    ])('rejects a duplicate %s', async (_identifier, existingFields, message) => {
      const { service, prisma } = createAuthService();
      prisma.user.findFirst.mockResolvedValue(existingFields);

      await expect(
        service.register({
          email: 'person@example.com',
          userId: 'ada23',
          mobile: '+15555555555',
          password: 'secret',
        }),
      ).rejects.toThrow(new ConflictException(message));
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('assigns a new mock user ID and supplies the default name', async () => {
      const { service, prisma, jwtService } = createAuthService('mock');

      await expect(
        service.register({ email: 'new@example.com', password: 'secret' }),
      ).resolves.toEqual({
        user: { id: 3, email: 'new@example.com', name: 'New User' },
        token: 'signed-token',
      });
      expect(registeredUsers[registeredUsers.length - 1]).toMatchObject({
        id: 3,
        email: 'new@example.com',
        password: 'secret',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '3',
        email: 'new@example.com',
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it.each([
      ['email', { email: 'demo@example.com' }, 'Email already registered'],
      ['user ID', { userId: 'demo123' }, 'User ID already taken'],
      ['mobile number', { mobile: '+1234567890' }, 'Mobile number already registered'],
    ])('rejects a duplicate mock %s', async (_identifier, registerDto, message) => {
      const { service } = createAuthService('mock');

      await expect(
        service.register({
          email: 'new@example.com',
          password: 'secret',
          ...registerDto,
        }),
      ).rejects.toThrow(new ConflictException(message));
    });
  });

  describe('login', () => {
    it('looks up a normalized email and returns a token for a valid password', async () => {
      const { service, prisma, jwtService } = createAuthService();
      prisma.user.findFirst.mockResolvedValue(databaseUser);

      await expect(
        service.login({ identifier: ' PERSON@Example.com ', password: 'secret' }),
      ).resolves.toEqual({
        user: { id: 23, email: 'person@example.com', name: 'Ada' },
        token: 'signed-token',
      });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: 'person@example.com' },
            { userId: 'PERSON@Example.com' },
            { mobile: 'PERSON@Example.com' },
          ],
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('secret', 'hashed-password');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '23',
        email: 'person@example.com',
      });
    });

    it('rejects an unknown database user without checking a password', async () => {
      const { service, prisma } = createAuthService();
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ identifier: 'missing', password: 'secret' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('rejects an incorrect database password', async () => {
      const { service, prisma, jwtService } = createAuthService();
      prisma.user.findFirst.mockResolvedValue(databaseUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      await expect(
        service.login({ identifier: 'person@example.com', password: 'wrong' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it.each(['demo@example.com', 'demo123', '+1234567890'])(
      'authenticates a mock user by %s',
      async (identifier) => {
        const { service, prisma, jwtService } = createAuthService('mock');

        await expect(
          service.login({ identifier, password: '123456' }),
        ).resolves.toEqual({
          user: { id: 1, email: 'demo@example.com', name: 'Demo User' },
          token: 'signed-token',
        });
        expect(jwtService.sign).toHaveBeenCalledWith({
          sub: '1',
          email: 'demo@example.com',
        });
        expect(prisma.user.findFirst).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['unknown identifier', 'missing', '123456'],
      ['incorrect password', 'demo@example.com', 'wrong'],
    ])('rejects mock login with an %s', async (_reason, identifier, password) => {
      const { service, jwtService } = createAuthService('mock');

      await expect(service.login({ identifier, password })).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('selects only public profile fields for a database user', async () => {
      const { service, prisma } = createAuthService();
      prisma.user.findUnique.mockResolvedValue({
        id: 23,
        email: 'person@example.com',
        name: 'Ada',
      });

      await expect(service.validateUser('23')).resolves.toEqual({
        id: 23,
        email: 'person@example.com',
        name: 'Ada',
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 23 },
        select: { id: true, email: true, name: true },
      });
    });

    it('rejects a database user that no longer exists', async () => {
      const { service, prisma } = createAuthService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser(99)).rejects.toThrow(
        new UnauthorizedException('User no longer exists'),
      );
    });

    it('matches mock user IDs numerically', async () => {
      const { service, prisma } = createAuthService('mock');

      await expect(service.validateUser('1')).resolves.toEqual({
        id: 1,
        email: 'demo@example.com',
        name: 'Demo User',
      });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a mock user that no longer exists', async () => {
      const { service } = createAuthService('mock');

      await expect(service.validateUser(99)).rejects.toThrow(
        new UnauthorizedException('User no longer exists'),
      );
    });
  });
});