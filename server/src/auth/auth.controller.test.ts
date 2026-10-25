import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const authService = {
  register: vi.fn(),
  login: vi.fn(),
  validateUser: vi.fn(),
};

const controller = new AuthController(authService as unknown as AuthService);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AuthController', () => {
  describe('register', () => {
    it('forwards the registration data and returns the service result', async () => {
      const registerDto: RegisterDto = {
        email: 'person@example.com',
        password: 'strong-password',
      };
      const result = {
        user: { id: 7, email: 'person@example.com', name: 'Person' },
        token: 'signed-token',
      };
      authService.register.mockResolvedValue(result);

      await expect(controller.register(registerDto)).resolves.toBe(result);
      expect(authService.register).toHaveBeenCalledExactlyOnceWith(registerDto);
    });
  });

  describe('login', () => {
    it('forwards the login data and returns the service result', async () => {
      const loginDto: LoginDto = {
        identifier: 'person@example.com',
        password: 'strong-password',
      };
      const result = {
        user: { id: 7, email: 'person@example.com', name: 'Person' },
        token: 'signed-token',
      };
      authService.login.mockResolvedValue(result);

      await expect(controller.login(loginDto)).resolves.toBe(result);
      expect(authService.login).toHaveBeenCalledExactlyOnceWith(loginDto);
    });
  });

  describe('getProfile', () => {
    it('forwards the current user ID and returns the service result', async () => {
      const userId = 7;
      const result = { id: userId, email: 'person@example.com', name: 'Person' };
      authService.validateUser.mockResolvedValue(result);

      await expect(controller.getProfile(userId)).resolves.toBe(result);
      expect(authService.validateUser).toHaveBeenCalledExactlyOnceWith(userId);
    });
  });
});
