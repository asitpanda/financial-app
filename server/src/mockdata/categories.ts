import { withAuditFields } from './shared';
import type { CategoryRecord } from './types';

export const mockCategoriesData: CategoryRecord[] = [
  // INCOME CATEGORIES
  { id: 1, name: 'Salary', type: 'income', icon: 'briefcase', color: '#4ECDC4', isSystem: true },
  { id: 2, name: 'Investment Returns', type: 'income', icon: 'trending-up', color: '#00B4D8', isSystem: true },

  // CORE LIFE EXPENSES
  { id: 3, name: 'Housing', type: 'expense', icon: 'home', color: '#2A9D8F', isSystem: true },
  { id: 4, name: 'Transportation', type: 'expense', icon: 'car', color: '#95E1D3', isSystem: true },
  { id: 5, name: 'Education', type: 'expense', icon: 'book', color: '#577590', isSystem: true },
  { id: 6, name: 'Healthcare', type: 'expense', icon: 'medical', color: '#E76F51', isSystem: true },
  { id: 7, name: 'Travel', type: 'expense', icon: 'movie', color: '#F4A261', isSystem: true },
  { id: 8, name: 'Groceries', type: 'expense', icon: 'food', color: '#FF6B6B', isSystem: true },
  { id: 9, name: 'Utilities', type: 'expense', icon: 'flash', color: '#AA96DA', isSystem: true },
  { id: 10, name: 'Emergency Fund', type: 'expense', icon: 'cash', color: '#38B000', isSystem: true },
  { id: 11, name: 'Gifts & Events', type: 'expense', icon: 'gift', color: '#C77DFF', isSystem: true },
  { id: 12, name: 'Shopping', type: 'expense', icon: 'cart', color: '#FFB703', isSystem: true },
  { id: 13, name: 'Work & Equipment', type: 'expense', icon: 'briefcase', color: '#6A4C93', isSystem: true },

  // INVESTMENT & WEALTH CATEGORIES
  { id: 14, name: 'Investments', type: 'expense', icon: 'briefcase', color: '#8B5CF6', isSystem: true },
  { id: 15, name: 'Stock Market', type: 'expense', icon: 'chart-line', color: '#7C3AED', isSystem: true },
  { id: 16, name: 'Mutual Funds/ETFs', type: 'expense', icon: 'chart-area', color: '#6366F1', isSystem: true },
  { id: 17, name: 'Real Estate Investment', type: 'expense', icon: 'home', color: '#34D399', isSystem: true },
  { id: 18, name: 'Retirement Savings', type: 'expense', icon: 'cash', color: '#14B8A6', isSystem: true },
].map((category) => withAuditFields(category, 1));
