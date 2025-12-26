export interface Transaction {
  id: string;
  category: string;
  subcategory: string;
  amount: number;
  date: Date;
  note: string;
  recurringId?: string; // Links to the recurring transaction that generated this
}

export interface RecurringTransaction {
  id: string;
  category: string;
  subcategory: string;
  amount: number;
  frequency: 'weekly' | 'monthly';
  startDate: Date;
  dayOfMonth?: number; // For monthly (1-31)
  dayOfWeek?: number; // For weekly (0-6, Sunday-Saturday)
  note: string;
  active: boolean;
}
