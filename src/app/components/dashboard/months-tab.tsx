import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Pencil, Check } from 'lucide-react';
import { Transaction, Subcategory } from '../../dashboard-types';
import { CATEGORIES, SUBCATEGORIES } from '../../dashboard-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  getMonthlySpendingByCategory,
  getMonthlySpendingBySubcategory,
  getOrCreateBudgetsForMonth,
  getOrCreateMonth,
  upsertBudget,
  fetchCategories,
  fetchSubcategories
} from '../../../lib/database';

interface MonthsTabProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
  transactions: Transaction[];
  income: number;
}

export function MonthsTab({
  selectedMonth,
  onMonthChange,
  availableMonths,
  transactions,
  income,
}: MonthsTabProps) {
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBudgets, setEditingBudgets] = useState<Record<number, string>>({});
  const [savingBudgets, setSavingBudgets] = useState<Set<number>>(new Set());

  // Real data from database
  const [spendingByCategory, setSpendingByCategory] = useState<Record<string, { categoryId: number; categoryName: string; total: number }>>({});
  const [spendingBySubcategory, setSpendingBySubcategory] = useState<Record<string, { subcategoryId: number; subcategoryName: string; total: number; categoryName: string }>>({});
  const [monthBudgets, setMonthBudgets] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbSubcategories, setDbSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data when month changes
  useEffect(() => {
    const loadMonthData = async () => {
      try {
        setLoading(true);
        const [year, month] = selectedMonth.split('-');
        const [categoryData, subcategoryData, budgets, categories, subcategories] = await Promise.all([
          getMonthlySpendingByCategory(parseInt(year), parseInt(month)),
          getMonthlySpendingBySubcategory(parseInt(year), parseInt(month)),
          getOrCreateBudgetsForMonth(parseInt(year), parseInt(month)),
          fetchCategories(),
          fetchSubcategories()
        ]);

        setSpendingByCategory(categoryData);
        setSpendingBySubcategory(subcategoryData);
        setMonthBudgets(budgets);
        setDbCategories(categories);
        setDbSubcategories(subcategories);
      } catch (error) {
        console.error('Error loading month data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMonthData();
  }, [selectedMonth]);

  // Helper to get budget for a subcategory
  const getBudgetForSubcategory = (subcategoryId: number) => {
    const budget = monthBudgets.find((b: any) => b.subcategory_id === subcategoryId);
    return budget ? Number(budget.budget_amount) : 0;
  };

  // Handle budget input change
  const handleBudgetChange = (subcategoryId: number, value: string) => {
    setEditingBudgets(prev => ({
      ...prev,
      [subcategoryId]: value
    }));
  };

  // Auto-save budget when user finishes typing (debounced)
  const saveBudget = async (subcategoryId: number, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    try {
      setSavingBudgets(prev => new Set(prev).add(subcategoryId));

      const [year, month] = selectedMonth.split('-');
      const monthRecord = await getOrCreateMonth(parseInt(year), parseInt(month));

      await upsertBudget(monthRecord.id, subcategoryId, numValue);

      // Update local state
      setMonthBudgets(prev => {
        const existing = prev.find((b: any) => b.subcategory_id === subcategoryId);
        if (existing) {
          return prev.map((b: any) =>
            b.subcategory_id === subcategoryId
              ? { ...b, budget_amount: numValue }
              : b
          );
        } else {
          return [...prev, {
            month_id: monthRecord.id,
            subcategory_id: subcategoryId,
            budget_amount: numValue
          }];
        }
      });

      // Clear editing state
      setEditingBudgets(prev => {
        const next = { ...prev };
        delete next[subcategoryId];
        return next;
      });
    } catch (error) {
      console.error('Error saving budget:', error);
    } finally {
      setSavingBudgets(prev => {
        const next = new Set(prev);
        next.delete(subcategoryId);
        return next;
      });
    }
  };

  // Handle blur event for auto-save
  const handleBudgetBlur = (subcategoryId: number) => {
    const value = editingBudgets[subcategoryId];
    if (value !== undefined) {
      saveBudget(subcategoryId, value);
    }
  };

  // Handle enter key for auto-save
  const handleBudgetKeyDown = (subcategoryId: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const value = editingBudgets[subcategoryId];
      if (value !== undefined) {
        saveBudget(subcategoryId, value);
      }
    }
  };

  const monthlyData = useMemo(() => {
    if (loading) return {};

    const categoryData: Record<string, { subcategories: { id: number; name: string; spent: number; budget: number }[]; total: number; budgetTotal: number }> = {};

    // Map category names to IDs for UI compatibility
    const categoryNameToId: Record<string, string> = {
      'Income': 'cat-income',
      'Needs': 'cat-needs',
      'Wants': 'cat-wants',
      'Savings': 'cat-savings',
      'Tithe': 'cat-tithe',
    };

    dbCategories.forEach((cat) => {
      const catId = categoryNameToId[cat.name] || cat.name;
      const subs = dbSubcategories
        .filter((s) => s.category_id === cat.id)
        .sort((a, b) => a.display_order - b.display_order);

      const subcategories = subs.map((sub) => {
        const spendingData = spendingBySubcategory[sub.name];
        return {
          id: sub.id,
          name: sub.name,
          spent: spendingData?.total || 0,
          budget: getBudgetForSubcategory(sub.id),
        };
      });

      const categorySpending = spendingByCategory[cat.name];

      categoryData[catId] = {
        subcategories,
        total: categorySpending?.total || 0,
        budgetTotal: subcategories.reduce((sum, s) => sum + s.budget, 0),
      };
    });

    return categoryData;
  }, [loading, dbCategories, dbSubcategories, spendingByCategory, spendingBySubcategory, monthBudgets]);

  const chartData = useMemo(() => {
    if (loading || !monthlyData['cat-needs']) return [];
    return ['cat-needs', 'cat-wants', 'cat-savings', 'cat-tithe'].map((catId) => {
      const data = monthlyData[catId];
      if (!data) return null;
      return {
        name: catId.replace('cat-', '').charAt(0).toUpperCase() + catId.replace('cat-', '').slice(1),
        Spent: data.total,
        Budget: data.budgetTotal,
      };
    }).filter(Boolean) as { name: string; Spent: number; Budget: number }[];
  }, [monthlyData, loading]);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const filterSubcategories = (subcategories: { id: number; name: string; spent: number; budget: number }[]) => {
    if (subcategoryFilter === 'all') return subcategories;
    if (subcategoryFilter === 'active') return subcategories.filter((s) => s.spent > 0);
    if (subcategoryFilter === 'over-budget') return subcategories.filter((s) => s.spent > s.budget);
    return subcategories;
  };

  // Calculate max rows for equal table heights
  const maxRows = useMemo(() => {
    if (loading) return 1;
    const categoryRows = ['cat-needs', 'cat-wants', 'cat-savings', 'cat-tithe'].map((catId) => {
      const data = monthlyData[catId];
      if (!data) return 0;
      const subs = filterSubcategories(data.subcategories);
      return subs.length;
    });
    return Math.max(...categoryRows, 1);
  }, [monthlyData, subcategoryFilter, loading]);

  const totalSpent = useMemo(() => {
    if (loading) return 0;
    return ['cat-needs', 'cat-wants', 'cat-savings', 'cat-tithe']
      .reduce((sum, catId) => sum + (monthlyData[catId]?.total || 0), 0);
  }, [monthlyData, loading]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2>Monthly Analysis</h2>
          <p className="text-muted-foreground">Detailed breakdown by category</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`h-9 px-3 py-2 rounded-md text-sm transition-all flex items-center justify-center gap-2 w-[140px] whitespace-nowrap ${
              isEditMode
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-input-background text-foreground hover:bg-accent hover:text-accent-foreground border border-input'
            }`}
          >
            {isEditMode ? (
              <>
                <Check className="w-4 h-4" />
                Done Editing
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                Edit Budgets
              </>
            )}
          </button>
          <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subcategories</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="over-budget">Over Budget</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonth(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Income and Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-accent/30 border-b border-border">
            <h3 className="text-sm font-medium">Income</h3>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-accent/20 border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(() => {
                  const incomeData = monthlyData['cat-income'];
                  if (!incomeData) return null;
                  const incomeSubs = filterSubcategories(incomeData.subcategories);
                  const rows = [];

                  for (let i = 0; i < Math.max(incomeSubs.length, 1); i++) {
                    const sub = incomeSubs[i];
                    if (sub) {
                      rows.push(
                        <tr key={sub.id} className="hover:bg-accent/10">
                          <td className="px-4 py-2.5 text-sm">{sub.name}</td>
                          <td className="px-4 py-2.5 text-sm text-right font-medium">
                            ${sub.spent.toFixed(2)}
                          </td>
                        </tr>
                      );
                    }
                  }

                  return rows;
                })()}
              </tbody>
              <tfoot className="bg-accent/30 border-t border-border">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold">Total</td>
                  <td className="px-4 py-3 text-sm font-semibold text-right">
                    ${(monthlyData['cat-income']?.total || 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-accent/30 border-b border-border">
            <h3 className="text-sm font-medium">Spending Overview</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem'
                  }}
                />
                <Legend />
                <Bar dataKey="Budget" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {['cat-needs', 'cat-wants', 'cat-savings', 'cat-tithe'].map((categoryId) => {
          const data = monthlyData[categoryId];
          if (!data) return null;

          const categoryName = categoryId.replace('cat-', '').charAt(0).toUpperCase() + categoryId.replace('cat-', '').slice(1);
          const filteredSubs = filterSubcategories(data.subcategories);
          const incomeTotal = monthlyData['cat-income']?.total || 0;
          const percentageOfIncome = incomeTotal > 0
            ? (data.total / incomeTotal) * 100
            : 0;

          return (
            <div key={categoryId} className="bg-card rounded-lg border border-border overflow-hidden shadow-sm flex flex-col">
              <div className="px-4 py-3 bg-accent/30 border-b border-border flex justify-between items-center">
                <h3 className="text-sm font-medium">{categoryName}</h3>
                <div className="text-xs">
                  <span className="font-semibold">${data.total.toFixed(2)}</span>
                  <span className="text-muted-foreground"> / ${data.budgetTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full h-full">
                  <thead className="bg-accent/20 border-b border-border">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Subcategory</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(() => {
                      const rows = [];

                      // Render actual data rows
                      for (let i = 0; i < filteredSubs.length; i++) {
                        const sub = filteredSubs[i];
                        const isOver = sub.spent > sub.budget;
                        const isEditing = editingBudgets[sub.id] !== undefined;
                        const isSaving = savingBudgets.has(sub.id);

                        rows.push(
                          <tr key={sub.id} className="hover:bg-accent/10">
                            <td className="px-4 py-2.5 text-sm">{sub.name}</td>
                            <td className="px-4 py-2.5 text-sm text-right text-muted-foreground">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={isEditing ? editingBudgets[sub.id] : sub.budget}
                                  onChange={(e) => handleBudgetChange(sub.id, e.target.value)}
                                  onBlur={() => handleBudgetBlur(sub.id)}
                                  onKeyDown={(e) => handleBudgetKeyDown(sub.id, e)}
                                  className="w-20 px-1 py-0.5 text-right text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  disabled={isSaving}
                                />
                              ) : (
                                `$${sub.budget.toFixed(2)}`
                              )}
                            </td>
                            <td className={`px-4 py-2.5 text-sm text-right font-medium ${isOver ? 'text-destructive' : ''}`}>
                              ${sub.spent.toFixed(2)}
                            </td>
                          </tr>
                        );
                      }

                      // Add empty rows to match maxRows
                      const emptyRowsNeeded = maxRows - filteredSubs.length;
                      for (let i = 0; i < emptyRowsNeeded; i++) {
                        rows.push(
                          <tr key={`empty-${i}`}>
                            <td className="px-4 py-2.5 text-sm">&nbsp;</td>
                            <td className="px-4 py-2.5 text-sm">&nbsp;</td>
                            <td className="px-4 py-2.5 text-sm">&nbsp;</td>
                          </tr>
                        );
                      }

                      return rows.length > 0 ? rows : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No subcategories match the filter
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                  <tfoot className="bg-accent/30 border-t border-border">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold">Total</td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">${data.budgetTotal.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${data.total > data.budgetTotal ? 'text-destructive' : ''}`}>
                        ${data.total.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-xs text-muted-foreground text-right">
                        {percentageOfIncome.toFixed(1)}% of total income
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
