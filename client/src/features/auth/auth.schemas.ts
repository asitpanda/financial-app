import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email, user ID, or mobile is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Enter a valid email address'),
  userId: z
    .string()
    .trim()
    .min(3, 'User ID must be at least 3 characters')
    .max(30, 'User ID must be at most 30 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'User ID can only contain letters, numbers, dot, underscore, and hyphen')
    .optional()
    .or(z.literal('')),
  mobile: z
    .string()
    .trim()
    .min(10, 'Mobile number must be at least 10 digits')
    .max(15, 'Mobile number must be at most 15 digits')
    .regex(/^\+?[0-9]+$/, 'Mobile number must contain only digits and optional leading +')
    .optional()
    .or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
