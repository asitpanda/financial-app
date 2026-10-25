import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth.schemas';

describe('auth schemas', () => {
  it('accepts valid login credentials', () => {
    expect(loginSchema.parse({ identifier: 'user@example.com', password: 'password' })).toEqual({
      identifier: 'user@example.com',
      password: 'password',
    });
  });

  it('requires both login identifier and password', () => {
    const result = loginSchema.safeParse({ identifier: '', password: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Email, user ID, or mobile is required',
      'Password is required',
    ]);
  });

  it('accepts registration without optional login identifiers', () => {
    expect(
      registerSchema.parse({ email: 'user@example.com', password: 'password' }),
    ).toEqual({ email: 'user@example.com', password: 'password' });
  });

  it('trims valid optional user id and mobile values', () => {
    expect(
      registerSchema.parse({
        name: 'Test User',
        email: 'user@example.com',
        userId: '  testuser  ',
        mobile: '  +1234567890  ',
        password: 'password',
      }),
    ).toEqual({
      name: 'Test User',
      email: 'user@example.com',
      userId: 'testuser',
      mobile: '+1234567890',
      password: 'password',
    });
  });

  it('rejects invalid email and short password', () => {
    const result = registerSchema.safeParse({ email: 'invalid-email', password: '12345' });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Enter a valid email address' }),
        expect.objectContaining({ message: 'Password must be at least 6 characters' }),
      ]),
    );
  });

  it('enforces user id and mobile boundaries and formats', () => {
    expect(registerSchema.safeParse({ email: 'user@example.com', password: 'password', userId: 'ab' }).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'user@example.com', password: 'password', userId: 'invalid user' }).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'user@example.com', password: 'password', mobile: '123456789' }).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'user@example.com', password: 'password', mobile: '12345abcde' }).success).toBe(false);
  });
});
