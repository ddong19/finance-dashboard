export interface Category {
  id: string;
  name: 'Income' | 'Needs' | 'Wants' | 'Savings' | 'Tithe';
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  budgetAmount?: number;
}

export interface Transaction {
  id: string;
  categoryId: string;
  subcategoryId: string;
  amount: number;
  date: Date;
  note: string;
}

export interface MonthlyIncome {
  month: string; // YYYY-MM format
  amount: number;
}

export interface MonthlySpending {
  month: string;
  categoryId: string;
  subcategoryId: string;
  total: number;
}