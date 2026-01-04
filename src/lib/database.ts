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

export interface Month {
  id: number;
  year: number;
  month: number;
  label: string | null;
  user_id: string;
}

export interface MonthBudget {
  id: number;
  month_id: number;
  subcategory_id: number;
  budget_amount: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: number;
  month_id: number;
  subcategory_id: number;
  amount: number;
  user_id: string;
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
    .select('*, category:categories(*)')
    .order('display_order');

  if (error) throw error;
  return data as Subcategory[];
}

/**
 * Create a new subcategory
 */
export async function createSubcategory(categoryId: number, name: string, displayOrder: number) {
  const { data, error } = await supabase
    .from('subcategories')
    .insert({
      category_id: categoryId,
      name,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Subcategory;
}

/**
 * Update a subcategory
 */
export async function updateSubcategory(id: number, updates: Partial<Subcategory>) {
  const { data, error } = await supabase
    .from('subcategories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Subcategory;
}

/**
 * Delete a subcategory
 */
export async function deleteSubcategory(id: number) {
  const { error } = await supabase
    .from('subcategories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reorder subcategories within a category
 */
export async function reorderSubcategories(subcategoryIds: number[]) {
  const updates = subcategoryIds.map((id, index) => ({
    id,
    display_order: index + 1,
  }));

  const promises = updates.map(update =>
    supabase
      .from('subcategories')
      .update({ display_order: update.display_order })
      .eq('id', update.id)
  );

  await Promise.all(promises);
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
 * For November 2025 and earlier: Uses entries table
 * For December 2025 and later: Uses transactions table
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 */
export async function getMonthlySpendingByCategory(year: number, month: number) {
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

  // Use entries for Nov 2025 and earlier, transactions for Dec 2025 onwards
  const useEntries = year < 2025 || (year === 2025 && month < 12);

  if (useEntries) {
    // Use entries table for November 2025 and earlier
    const entries = await fetchEntriesForMonth(year, month);
    entries.forEach((entry: any) => {
      const categoryName = entry.category?.name;
      if (categoryName && totals[categoryName]) {
        totals[categoryName].total += Number(entry.amount);
      }
    });
  } else {
    // Use transactions table for December 2025 and later
    const transactions = await fetchTransactionsForMonth(year, month);
    transactions.forEach((transaction) => {
      const categoryName = transaction.category?.name;
      if (categoryName && totals[categoryName]) {
        totals[categoryName].total += Number(transaction.amount);
      }
    });
  }

  return totals;
}

/**
 * Get spending totals by subcategory for a specific month
 * For November 2025 and earlier: Uses entries table
 * For December 2025 and later: Uses transactions table
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 */
export async function getMonthlySpendingBySubcategory(year: number, month: number) {
  const subcategories = await fetchSubcategories();
  const categories = await fetchCategories();

  // Create a category lookup map for quick access
  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

  const totals: Record<string, { subcategoryId: number; subcategoryName: string; total: number; categoryName: string }> = {};

  // Initialize all subcategories with 0 and proper category name
  subcategories.forEach((sub) => {
    totals[sub.name] = {
      subcategoryId: sub.id,
      subcategoryName: sub.name,
      total: 0,
      categoryName: categoryMap.get(sub.category_id) || '', // Set category name from the subcategory's category_id
    };
  });

  // Use entries for Nov 2025 and earlier, transactions for Dec 2025 onwards
  const useEntries = year < 2025 || (year === 2025 && month < 12);

  if (useEntries) {
    // Use entries table for November 2025 and earlier
    const entries = await fetchEntriesForMonth(year, month);
    entries.forEach((entry: any) => {
      const subcategoryName = entry.subcategory?.name;
      if (subcategoryName && totals[subcategoryName]) {
        totals[subcategoryName].total += Number(entry.amount);
      }
    });
  } else {
    // Use transactions table for December 2025 and later
    const transactions = await fetchTransactionsForMonth(year, month);
    transactions.forEach((transaction) => {
      const subcategoryName = transaction.subcategory?.name;
      if (subcategoryName && totals[subcategoryName]) {
        totals[subcategoryName].total += Number(transaction.amount);
      }
    });
  }

  return totals;
}

/**
 * Fetch all transactions for the current user
 * Sorted by date, newest first
 */
export async function fetchAllTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      subcategory:subcategories (
        *,
        category:categories (*)
      )
    `)
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
 * Get all months that have transactions or entries
 * Returns array of month strings in YYYY-MM format, sorted newest first
 * Always includes the current month
 */
export async function getAvailableMonths() {
  const monthsSet = new Set<string>();

  // Get months from transactions (2026+)
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('occurred_at')
    .order('occurred_at', { ascending: false });

  if (txError) throw txError;

  (transactions || []).forEach((transaction) => {
    const dateStr = transaction.occurred_at;
    const monthStr = dateStr.substring(0, 7); // Extract YYYY-MM
    monthsSet.add(monthStr);
  });

  // Get months from entries (2025 and earlier)
  const { data: months, error: monthsError } = await supabase
    .from('months')
    .select('year, month')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (monthsError) throw monthsError;

  (months || []).forEach((month) => {
    const monthStr = `${month.year}-${String(month.month).padStart(2, '0')}`;
    monthsSet.add(monthStr);
  });

  // Always add the current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthsSet.add(currentMonth);

  return Array.from(monthsSet).sort().reverse();
}

/**
 * Get transactions or entries for a month based on the year
 * For November 2025 and earlier: Returns entries (no individual transactions to show)
 * For December 2025 and later: Returns transactions
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 */
export async function getMonthData(year: number, month: number) {
  // Use entries for Nov 2025 and earlier, transactions for Dec 2025 onwards
  const useEntries = year < 2025 || (year === 2025 && month < 12);

  if (useEntries) {
    // For Nov 2025 and earlier, return entries (these are monthly totals, not individual transactions)
    return await fetchEntriesForMonth(year, month);
  } else {
    // For Dec 2025 and later, return individual transactions
    return await fetchTransactionsForMonth(year, month);
  }
}

// ============================================================================
// MONTH MANAGEMENT
// ============================================================================

/**
 * Fetch a month record by year and month
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 */
export async function fetchMonth(year: number, month: number) {
  const { data, error } = await supabase
    .from('months')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) throw error;
  return data as Month | null;
}

/**
 * Create a new month record
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @param label - Optional label for the month
 */
export async function createMonth(year: number, month: number, label?: string) {
  const { data, error } = await supabase
    .from('months')
    .insert({
      year,
      month,
      label: label || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Month;
}

/**
 * Get or create a month record
 * If the month doesn't exist, it will be created
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 */
export async function getOrCreateMonth(year: number, month: number): Promise<Month> {
  // Try to fetch existing month
  let monthRecord = await fetchMonth(year, month);

  if (!monthRecord) {
    // Create new month
    monthRecord = await createMonth(year, month);
  }

  return monthRecord;
}

/**
 * Get the most recent month that has budgets defined
 * Used for rolling over budgets to new months
 */
export async function getMostRecentMonthWithBudgets(): Promise<Month | null> {
  const { data, error } = await supabase
    .from('month_budgets')
    .select('month_id, months(*)')
    .order('months(year)', { ascending: false })
    .order('months(month)', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return (data as any).months as Month;
}

// ============================================================================
// BUDGET MANAGEMENT
// ============================================================================

/**
 * Fetch all budgets for a specific month
 * @param monthId - The month ID
 */
export async function fetchBudgetsForMonth(monthId: number) {
  const { data, error } = await supabase
    .from('month_budgets')
    .select('*')
    .eq('month_id', monthId);

  if (error) throw error;
  return data as MonthBudget[];
}

/**
 * Fetch budgets grouped by category for a specific month
 * Returns budgets with subcategory and category information
 */
export async function fetchBudgetsWithDetails(monthId: number) {
  const { data, error } = await supabase
    .from('month_budgets')
    .select(`
      *,
      subcategory:subcategories (
        *,
        category:categories (*)
      )
    `)
    .eq('month_id', monthId);

  if (error) throw error;

  return (data || []).map((item: any) => ({
    ...item,
    subcategory: item.subcategory,
    category: item.subcategory?.category,
  }));
}

/**
 * Create or update a budget for a specific subcategory in a month
 * @param monthId - The month ID
 * @param subcategoryId - The subcategory ID
 * @param budgetAmount - The budget amount
 */
export async function upsertBudget(monthId: number, subcategoryId: number, budgetAmount: number) {
  const { data, error } = await supabase
    .from('month_budgets')
    .upsert({
      month_id: monthId,
      subcategory_id: subcategoryId,
      budget_amount: budgetAmount,
    }, {
      onConflict: 'month_id,subcategory_id,user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data as MonthBudget;
}

/**
 * Copy budgets from one month to another
 * Used when creating a new month to roll over previous budgets
 * @param fromMonthId - The source month ID
 * @param toMonthId - The destination month ID
 */
export async function copyBudgets(fromMonthId: number, toMonthId: number) {
  // Fetch budgets from source month
  const sourceBudgets = await fetchBudgetsForMonth(fromMonthId);

  // Create new budgets for destination month
  const newBudgets = sourceBudgets.map(budget => ({
    month_id: toMonthId,
    subcategory_id: budget.subcategory_id,
    budget_amount: budget.budget_amount,
  }));

  const { data, error } = await supabase
    .from('month_budgets')
    .insert(newBudgets)
    .select();

  if (error) throw error;
  return data as MonthBudget[];
}

/**
 * Get or create budgets for a month
 * If the month has no budgets, copy from the most recent month with budgets
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 */
export async function getOrCreateBudgetsForMonth(year: number, month: number) {
  // Get or create the month record
  const monthRecord = await getOrCreateMonth(year, month);

  // Check if this month already has budgets
  const existingBudgets = await fetchBudgetsForMonth(monthRecord.id);

  if (existingBudgets.length > 0) {
    return existingBudgets;
  }

  // No budgets exist, find most recent month with budgets
  const mostRecentMonth = await getMostRecentMonthWithBudgets();

  if (mostRecentMonth) {
    // Copy budgets from most recent month
    return await copyBudgets(mostRecentMonth.id, monthRecord.id);
  }

  // No previous budgets exist, return empty array
  return [];
}

// ============================================================================
// SUBCATEGORY VISIBILITY MANAGEMENT
// ============================================================================

/**
 * Fetch visible subcategories for a specific month
 * @param monthId - The month ID
 */
export async function fetchVisibleSubcategoriesForMonth(monthId: number) {
  const { data, error } = await supabase
    .from('month_subcategory_visibility')
    .select('*, subcategory:subcategories(*)')
    .eq('month_id', monthId)
    .eq('is_visible', true);

  if (error) throw error;
  return data || [];
}

/**
 * Toggle subcategory visibility for a specific month
 * @param monthId - The month ID
 * @param subcategoryId - The subcategory ID
 * @param isVisible - Whether the subcategory should be visible
 */
export async function setSubcategoryVisibility(monthId: number, subcategoryId: number, isVisible: boolean) {
  const { data, error } = await supabase
    .from('month_subcategory_visibility')
    .upsert({
      month_id: monthId,
      subcategory_id: subcategoryId,
      is_visible: isVisible,
    }, {
      onConflict: 'month_id,subcategory_id,user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Copy subcategory visibility from one month to another
 * @param fromMonthId - The source month ID
 * @param toMonthId - The destination month ID
 */
export async function copySubcategoryVisibility(fromMonthId: number, toMonthId: number) {
  // Fetch visibility settings from source month
  const { data: sourceVisibility, error: fetchError } = await supabase
    .from('month_subcategory_visibility')
    .select('*')
    .eq('month_id', fromMonthId);

  if (fetchError) throw fetchError;

  if (!sourceVisibility || sourceVisibility.length === 0) {
    return [];
  }

  // Create new visibility records for destination month
  const newVisibility = sourceVisibility.map(v => ({
    month_id: toMonthId,
    subcategory_id: v.subcategory_id,
    is_visible: v.is_visible,
  }));

  const { data, error } = await supabase
    .from('month_subcategory_visibility')
    .insert(newVisibility)
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Get the most recent month with visibility settings
 */
export async function getMostRecentMonthWithVisibility(): Promise<Month | null> {
  const { data, error } = await supabase
    .from('month_subcategory_visibility')
    .select('month_id, months(*)')
    .order('months(year)', { ascending: false })
    .order('months(month)', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return (data as any).months as Month;
}

/**
 * Make a subcategory visible in the current month and all future months
 * Used when a new subcategory is created
 * @param subcategoryId - The subcategory ID
 */
export async function addSubcategoryToCurrentAndFutureMonths(subcategoryId: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Get all months that are current or future
  const { data: months, error: monthsError } = await supabase
    .from('months')
    .select('*')
    .or(`year.gt.${currentYear},and(year.eq.${currentYear},month.gte.${currentMonth})`);

  if (monthsError) throw monthsError;

  if (!months || months.length === 0) {
    return [];
  }

  // Create visibility records for all current/future months
  const visibilityRecords = months.map(m => ({
    month_id: m.id,
    subcategory_id: subcategoryId,
    is_visible: true,
  }));

  const { data, error } = await supabase
    .from('month_subcategory_visibility')
    .upsert(visibilityRecords, {
      onConflict: 'month_id,subcategory_id,user_id'
    })
    .select();

  if (error) throw error;
  return data || [];
}

// ============================================================================
// ENTRY MANAGEMENT (for 2025 data)
// ============================================================================

/**
 * Fetch entries for a specific month (used for 2025 data)
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 */
export async function fetchEntriesForMonth(year: number, month: number) {
  const monthRecord = await fetchMonth(year, month);

  if (!monthRecord) {
    return [];
  }

  const { data, error } = await supabase
    .from('entries')
    .select(`
      *,
      subcategory:subcategories (
        *,
        category:categories (*)
      )
    `)
    .eq('month_id', monthRecord.id);

  if (error) throw error;

  return (data || []).map((item: any) => ({
    ...item,
    subcategory: item.subcategory,
    category: item.subcategory?.category,
  }));
}
