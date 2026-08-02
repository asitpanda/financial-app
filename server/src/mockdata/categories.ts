import { withAuditFields } from './shared';
import type { CategoryRecord } from './types';

export const mockCategoriesData: CategoryRecord[] = [
  { id: 1, name: 'Groceries', type: 'expense', icon: 'cart', color: '#FF6B6B', isSystem: true },
  { id: 2, name: 'Salary', type: 'income', icon: 'cash', color: '#4ECDC4', isSystem: true },
  { id: 3, name: 'Transportation', type: 'expense', icon: 'car', color: '#95E1D3', isSystem: true },
  { id: 4, name: 'Entertainment', type: 'expense', icon: 'movie', color: '#F38181', isSystem: true },
  { id: 5, name: 'Utilities', type: 'expense', icon: 'flash', color: '#AA96DA', isSystem: true },
  { id: 6, name: 'Freelance', type: 'income', icon: 'briefcase', color: '#FCBAD3', isSystem: true },
  { id: 7, name: 'Dining', type: 'expense', icon: 'food', color: '#F4A261', isSystem: true },
  { id: 8, name: 'Rent', type: 'expense', icon: 'home', color: '#2A9D8F', isSystem: true },
  { id: 9, name: 'Internet', type: 'expense', icon: 'wifi', color: '#3A86FF', isSystem: true },
  { id: 10, name: 'Healthcare', type: 'expense', icon: 'medical', color: '#E76F51', isSystem: true },
  { id: 11, name: 'Education', type: 'expense', icon: 'book', color: '#577590', isSystem: true },
  { id: 12, name: 'Gifts', type: 'expense', icon: 'gift', color: '#C77DFF', isSystem: true },
  { id: 13, name: 'Savings', type: 'income', icon: 'wallet', color: '#38B000', isSystem: true },
  { id: 14, name: 'Travel Fund', type: 'income', icon: 'airplane', color: '#00B4D8', isSystem: true },
  { id: 15, name: 'Home Savings', type: 'income', icon: 'home', color: '#2A9D8F', isSystem: true },
  { id: 16, name: 'Transport Upgrade', type: 'income', icon: 'bike', color: '#F4A261', isSystem: true },
  { id: 17, name: 'Health Reserve', type: 'income', icon: 'medical', color: '#E76F51', isSystem: true },
  { id: 18, name: 'Personal', type: 'goal', icon: 'account', color: '#7C3AED', isSystem: true },
  { id: 19, name: 'Travel', type: 'goal', icon: 'airplane', color: '#00B4D8', isSystem: true },
  { id: 20, name: 'Housing', type: 'goal', icon: 'home', color: '#2A9D8F', isSystem: true },
  { id: 21, name: 'Lifestyle', type: 'goal', icon: 'star', color: '#FB8500', isSystem: true },
  { id: 22, name: 'Health', type: 'goal', icon: 'medical', color: '#E63946', isSystem: true },
  { id: 23, name: 'Investment Contribution', type: 'expense', icon: 'chart-line', color: '#8B5CF6', isSystem: true },
].map((category) => withAuditFields(category, 1));
