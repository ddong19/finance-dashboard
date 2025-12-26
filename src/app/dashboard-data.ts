import { Category, Subcategory, Transaction, MonthlyIncome } from './dashboard-types';

export const CATEGORIES: Category[] = [
  { id: 'cat-income', name: 'Income' },
  { id: 'cat-needs', name: 'Needs' },
  { id: 'cat-wants', name: 'Wants' },
  { id: 'cat-savings', name: 'Savings' },
  { id: 'cat-tithe', name: 'Tithe' },
];

export const SUBCATEGORIES: Subcategory[] = [
  // Income
  { id: 'sub-income-1', categoryId: 'cat-income', name: 'Base Salary', sortOrder: 1, budgetAmount: 5000 },
  { id: 'sub-income-2', categoryId: 'cat-income', name: 'Bonus', sortOrder: 2, budgetAmount: 300 },
  { id: 'sub-income-3', categoryId: 'cat-income', name: 'Side Income', sortOrder: 3, budgetAmount: 200 },
  
  // Needs
  { id: 'sub-1', categoryId: 'cat-needs', name: 'Rent', sortOrder: 1, budgetAmount: 1500 },
  { id: 'sub-2', categoryId: 'cat-needs', name: 'Utilities', sortOrder: 2, budgetAmount: 150 },
  { id: 'sub-3', categoryId: 'cat-needs', name: 'Groceries', sortOrder: 3, budgetAmount: 400 },
  { id: 'sub-4', categoryId: 'cat-needs', name: 'Transportation', sortOrder: 4, budgetAmount: 200 },
  { id: 'sub-5', categoryId: 'cat-needs', name: 'Insurance', sortOrder: 5, budgetAmount: 180 },
  { id: 'sub-6', categoryId: 'cat-needs', name: 'Healthcare', sortOrder: 6, budgetAmount: 100 },
  
  // Wants
  { id: 'sub-7', categoryId: 'cat-wants', name: 'Dining', sortOrder: 1, budgetAmount: 200 },
  { id: 'sub-8', categoryId: 'cat-wants', name: 'Entertainment', sortOrder: 2, budgetAmount: 100 },
  { id: 'sub-9', categoryId: 'cat-wants', name: 'Shopping', sortOrder: 3, budgetAmount: 150 },
  { id: 'sub-10', categoryId: 'cat-wants', name: 'Hobbies', sortOrder: 4, budgetAmount: 80 },
  { id: 'sub-11', categoryId: 'cat-wants', name: 'Travel', sortOrder: 5, budgetAmount: 300 },
  { id: 'sub-12', categoryId: 'cat-wants', name: 'Subscriptions', sortOrder: 6, budgetAmount: 50 },
  
  // Savings
  { id: 'sub-13', categoryId: 'cat-savings', name: 'Emergency Fund', sortOrder: 1, budgetAmount: 500 },
  { id: 'sub-14', categoryId: 'cat-savings', name: 'Investments', sortOrder: 2, budgetAmount: 400 },
  { id: 'sub-15', categoryId: 'cat-savings', name: 'Retirement', sortOrder: 3, budgetAmount: 600 },
  { id: 'sub-16', categoryId: 'cat-savings', name: 'General Savings', sortOrder: 4, budgetAmount: 300 },
  
  // Tithe
  { id: 'sub-17', categoryId: 'cat-tithe', name: 'Church', sortOrder: 1, budgetAmount: 400 },
  { id: 'sub-18', categoryId: 'cat-tithe', name: 'Charity', sortOrder: 2, budgetAmount: 100 },
  { id: 'sub-19', categoryId: 'cat-tithe', name: 'Donations', sortOrder: 3, budgetAmount: 50 },
];

// Mock income data
export const MOCK_INCOME: MonthlyIncome[] = [
  { month: '2025-12', amount: 5500 },
  { month: '2025-11', amount: 5500 },
  { month: '2025-10', amount: 5200 },
  { month: '2025-09', amount: 5500 },
  { month: '2025-08', amount: 5500 },
  { month: '2025-07', amount: 5500 },
  { month: '2025-06', amount: 5300 },
  { month: '2025-05', amount: 5500 },
  { month: '2025-04', amount: 5500 },
  { month: '2025-03', amount: 5500 },
  { month: '2025-02', amount: 5500 },
  { month: '2025-01', amount: 5200 },
];

// Generate mock transactions for the past 12 months
export function generateMockTransactions(): Transaction[] {
  const transactions: Transaction[] = [];
  const now = new Date();
  
  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    
    SUBCATEGORIES.forEach((sub) => {
      // Generate 1-5 transactions per subcategory per month
      const numTransactions = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < numTransactions; i++) {
        const day = Math.floor(Math.random() * 28) + 1;
        const baseAmount = (sub.budgetAmount || 100) / numTransactions;
        const variance = baseAmount * 0.3;
        const amount = baseAmount + (Math.random() * variance * 2 - variance);
        
        transactions.push({
          id: `tx-${sub.id}-${month.getFullYear()}-${month.getMonth()}-${i}`,
          categoryId: sub.categoryId,
          subcategoryId: sub.id,
          amount: Math.round(amount * 100) / 100,
          date: new Date(month.getFullYear(), month.getMonth(), day),
          note: `${sub.name} transaction`,
        });
      }
    });
  }
  
  return transactions;
}