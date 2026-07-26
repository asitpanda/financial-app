import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email, user ID, or mobile is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Enter a valid email address'),
  userId: z.string().optional(),
  mobile: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
