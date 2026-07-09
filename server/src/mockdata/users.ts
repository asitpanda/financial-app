import type { MockUser } from './types';

// Mock user for authentication
export const mockUser: MockUser & { userId: string; mobile: string } = {
  id: 1,
  userId: 'demo123',
  email: 'demo@example.com',
  mobile: '+1234567890',
  name: 'Demo User',
  password: '$2b$10$mockHashedPassword', // This would be a real bcrypt hash
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// Mock credentials (hardcoded for demo)
// Login accepts: email OR userId OR mobile
export const mockCredentials = {
  email: 'demo@example.com',
  userId: 'demo123',
  mobile: '+1234567890',
  password: 'password123',
};

// Mock JWT token
export const mockToken = 'mock-jwt-token-demo-user';

// In-memory store for registered users (mock mode only)
// This will be reset when server restarts
export const registeredUsers: Array<{
  id: number;
  userId?: string;
  email: string;
  mobile?: string;
  name?: string;
  password: string;
  createdAt: Date;
}> = [
  {
    id: 1,
    userId: mockUser.userId,
    email: mockUser.email,
    mobile: mockUser.mobile,
    name: mockUser.name,
    password: mockCredentials.password, // In mock mode, we store plain password
    createdAt: mockUser.createdAt,
  },
];
