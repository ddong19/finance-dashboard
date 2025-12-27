import { supabase } from './supabase';

export interface Category {
  id: number;
  name: string;
  user_id: string;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  display_order: number;
  user_id: string;
}

export interface Transaction {
  id: number;
  user_id: string;
  local_id: string;
  occurred_at: string;
  amount: number;
  subcategory_id: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithDetails extends Transaction {
  subcategory: Subcategory;
  category: Category;
}

/**
 * Fetch all categories for the current user
 */
export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) throw error;
  return data as Category[];
}

/**
 * Fetch all subcategories for the current user
 */
export async function fetchSubcategories() {
  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .order('display_order');

  if (error) throw error;
  return data as Subcategory[];
}

/**
 * Fetch transactions for a specific month
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 */
export async function fetchTransactionsForMonth(year: number, month: number) {
  // Calculate the date range for the month
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      subcategory:subcategories (
        *,
        category:categories (*)
      )
    `)
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate)
    .order('occurred_at', { ascending: false });

  if (error) throw error;

  // Flatten the nested structure
  return (data || []).map((item: any) => ({
    ...item,
    subcategory: item.subcategory,
    category: item.subcategory?.category,
  })) as TransactionWithDetails[];
}

/**
 * Get spending totals by category for a specific month
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 */
export async function getMonthlySpendingByCategory(year: number, month: number) {
  const transactions = await fetchTransactionsForMonth(year, month);
  const categories = await fetchCategories();

  const totals: Record<string, { categoryId: number; categoryName: string; total: number }> = {};

  // Initialize all categories with 0
  categories.forEach((cat) => {
    totals[cat.name] = {
      categoryId: cat.id,
      categoryName: cat.name,
      total: 0,
    };
  });

  // Sum up transactions by category
  transactions.forEach((transaction) => {
    const categoryName = transaction.category?.name;
    if (categoryName && totals[categoryName]) {
      totals[categoryName].total += Number(transaction.amount);
    }
  });

  return totals;
}

/**
 * Get spending totals by subcategory for a specific month
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 */
export async function getMonthlySpendingBySubcategory(year: number, month: number) {
  const transactions = await fetchTransactionsForMonth(year, month);
  const subcategories = await fetchSubcategories();

  const totals: Record<string, { subcategoryId: number; subcategoryName: string; total: number; categoryName: string }> = {};

  // Initialize all subcategories with 0
  subcategories.forEach((sub) => {
    totals[sub.name] = {
      subcategoryId: sub.id,
      subcategoryName: sub.name,
      total: 0,
      categoryName: '', // Will be filled when we process transactions
    };
  });

  // Sum up transactions by subcategory
  transactions.forEach((transaction) => {
    const subcategoryName = transaction.subcategory?.name;
    if (subcategoryName && totals[subcategoryName]) {
      totals[subcategoryName].total += Number(transaction.amount);
      totals[subcategoryName].categoryName = transaction.category?.name || '';
    }
  });

  return totals;
}

/**
 * Get all months that have transactions
 * Returns array of month strings in YYYY-MM format, sorted newest first
 * Always includes the current month even if there are no transactions
 */
export async function getAvailableMonths() {
  const { data, error } = await supabase
    .from('transactions')
    .select('occurred_at')
    .order('occurred_at', { ascending: false });

  if (error) throw error;

  // Extract unique months from transactions
  const monthsSet = new Set<string>();
  (data || []).forEach((transaction) => {
    // Parse the date string directly (YYYY-MM-DD format from database)
    const dateStr = transaction.occurred_at;
    const monthStr = dateStr.substring(0, 7); // Extract YYYY-MM
    monthsSet.add(monthStr);
  });

  // Always add the current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthsSet.add(currentMonth);

  return Array.from(monthsSet).sort().reverse();
}
