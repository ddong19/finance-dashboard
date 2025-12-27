import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { Transaction, Subcategory } from '../../dashboard-types';
import { CATEGORIES, SUBCATEGORIES } from '../../dashboard-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TransactionWithDetails } from '../../../lib/database';

interface DashboardTabProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
  transactions: Transaction[];
  income: number;
  onNavigateToTransactions?: () => void;
  spendingByCategory?: Record<string, { categoryId: number; categoryName: string; total: number }>;
  spendingBySubcategory?: Record<string, { subcategoryId: number; subcategoryName: string; total: number; categoryName: string }>;
  monthTransactions?: TransactionWithDetails[];
}

export function DashboardTab({ currentMonth, onMonthChange, availableMonths, transactions, income, onNavigateToTransactions, spendingByCategory, spendingBySubcategory, monthTransactions }: DashboardTabProps) {
  const monthlyData = useMemo(() => {
    const filtered = transactions.filter((t) => {
      const txMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      return txMonth === currentMonth;
    });

    const categoryTotals: Record<string, { spent: number; budget: number }> = {};

    CATEGORIES.forEach((cat) => {
      const subs = SUBCATEGORIES.filter((s) => s.categoryId === cat.id);
      const budget = subs.reduce((sum, s) => sum + (s.budgetAmount || 0), 0);
      const spent = filtered
        .filter((t) => t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);

      categoryTotals[cat.id] = { spent, budget };
    });

    const totalSpent = Object.values(categoryTotals)
      .filter((_, idx) => CATEGORIES[idx].name !== 'Income')
      .reduce((sum, c) => sum + c.spent, 0);
    const totalBudget = Object.values(categoryTotals)
      .filter((_, idx) => CATEGORIES[idx].name !== 'Income')
      .reduce((sum, c) => sum + c.budget, 0);

    return { categoryTotals, totalSpent, totalBudget, filtered };
  }, [currentMonth, transactions]);

  const remaining = income - monthlyData.totalSpent;
  const budgetRemaining = monthlyData.totalBudget - monthlyData.totalSpent;

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Welcome and Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome, Daniel</h1>
          <p className="text-muted-foreground mt-1">Here is your financial overview for the month</p>
        </div>
        <Select value={currentMonth} onValueChange={onMonthChange}>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Income */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#4a7c59]/10 rounded-full mb-4">
            <div className="w-8 h-8 bg-[#4a7c59] rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-muted-foreground text-sm mb-2">Total Income</div>
          <div className="text-foreground text-3xl font-bold mb-2">
            ${(spendingByCategory?.['Income']?.total || 0).toLocaleString()}
          </div>
          <div className="text-[#4a7c59] text-sm">From transactions</div>
        </div>

        {/* Total Needs */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-full mb-4">
            <div className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="text-muted-foreground text-sm mb-2">Total Needs</div>
          <div className="text-foreground text-3xl font-bold mb-2">
            ${(spendingByCategory?.['Needs']?.total || 0).toLocaleString()}
          </div>
          <div className="text-muted-foreground text-sm">
            {spendingByCategory?.['Income']?.total
              ? ((spendingByCategory['Needs']?.total / spendingByCategory['Income']?.total) * 100).toFixed(0)
              : 0}% of income
          </div>
        </div>

        {/* Total Wants */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
          <div className="text-muted-foreground text-sm mb-2">Total Wants</div>
          <div className="text-foreground text-3xl font-bold mb-2">
            ${(spendingByCategory?.['Wants']?.total || 0).toLocaleString()}
          </div>
          <div className="text-muted-foreground text-sm">
            {spendingByCategory?.['Income']?.total
              ? ((spendingByCategory['Wants']?.total / spendingByCategory['Income']?.total) * 100).toFixed(0)
              : 0}% of income
          </div>
        </div>
      </div>

      {/* Monthly Budget Progress */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-foreground text-xl font-bold">Monthly Expense Budget</h3>
            <p className="text-muted-foreground text-sm mt-1">
              You have spent ${((spendingByCategory?.['Needs']?.total || 0) + (spendingByCategory?.['Wants']?.total || 0)).toLocaleString()} of your $3,000 budget.
            </p>
          </div>
          <div className="text-muted-foreground text-sm">
            {(() => {
              const now = new Date();
              const [year, month] = currentMonth.split('-');
              const currentMonthDate = new Date(parseInt(year), parseInt(month) - 1);
              const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
              const currentDay = now.getMonth() === currentMonthDate.getMonth() && now.getFullYear() === currentMonthDate.getFullYear()
                ? now.getDate()
                : daysInMonth;
              const daysLeft = daysInMonth - currentDay;
              return `${daysLeft} Days Left`;
            })()}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="bg-chart-1 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((((spendingByCategory?.['Needs']?.total || 0) + (spendingByCategory?.['Wants']?.total || 0)) / 3000) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-muted-foreground text-sm">
            <span>$0</span>
            <span>{(((spendingByCategory?.['Needs']?.total || 0) + (spendingByCategory?.['Wants']?.total || 0)) / 3000 * 100).toFixed(0)}%</span>
            <span>$3,000</span>
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Spending Breakdown - Pie Chart */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col">
          <h3 className="mb-4">Spending Breakdown</h3>
          <div className="flex-1 flex flex-col items-center justify-center py-2">
            <div className="relative w-[100%] max-w-[400px] aspect-square mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Needs', value: spendingByCategory?.['Needs']?.total || 0, color: '#9b8578' },
                      { name: 'Wants', value: spendingByCategory?.['Wants']?.total || 0, color: '#b89f8a' },
                      { name: 'Savings', value: spendingByCategory?.['Savings']?.total || 0, color: '#8b7d6b' },
                      { name: 'Tithe', value: spendingByCategory?.['Tithe']?.total || 0, color: '#a68968' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="85%"
                    fill="#8884d8"
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {[
                      { name: 'Needs', value: spendingByCategory?.['Needs']?.total || 0, color: '#9b8578' },
                      { name: 'Wants', value: spendingByCategory?.['Wants']?.total || 0, color: '#b89f8a' },
                      { name: 'Savings', value: spendingByCategory?.['Savings']?.total || 0, color: '#8b7d6b' },
                      { name: 'Tithe', value: spendingByCategory?.['Tithe']?.total || 0, color: '#a68968' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xs text-muted-foreground mb-1">Total</div>
                <div className="text-2xl font-bold">
                  ${(
                    (spendingByCategory?.['Needs']?.total || 0) +
                    (spendingByCategory?.['Wants']?.total || 0) +
                    (spendingByCategory?.['Savings']?.total || 0) +
                    (spendingByCategory?.['Tithe']?.total || 0)
                  ).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-6 w-full px-4">
              {[
                { name: 'Needs', value: spendingByCategory?.['Needs']?.total || 0, color: '#9b8578' },
                { name: 'Wants', value: spendingByCategory?.['Wants']?.total || 0, color: '#b89f8a' },
                { name: 'Savings', value: spendingByCategory?.['Savings']?.total || 0, color: '#8b7d6b' },
                { name: 'Tithe', value: spendingByCategory?.['Tithe']?.total || 0, color: '#a68968' },
              ].map((item) => {
                const total = (spendingByCategory?.['Needs']?.total || 0) +
                  (spendingByCategory?.['Wants']?.total || 0) +
                  (spendingByCategory?.['Savings']?.total || 0) +
                  (spendingByCategory?.['Tithe']?.total || 0);
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <span className="text-lg font-bold">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Budget Status */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col">
          <h3 className="mb-6">Budget Status</h3>
          <div className="flex-1 space-y-5">
            {/* Categories */}
            {['Needs', 'Wants', 'Savings', 'Tithe'].map((categoryName) => {
              const spent = spendingByCategory?.[categoryName]?.total || 0;
              // Placeholder budgets - will be replaced with real budget data later
              const budgetMap: Record<string, number> = {
                'Needs': 1500,
                'Wants': 1500,
                'Savings': 500,
                'Tithe': 300
              };
              const budget = budgetMap[categoryName] || 1000;
              const percentage = budget > 0 ? (spent / budget) * 100 : 0;
              const isOver = percentage > 100;

              return (
                <div key={categoryName} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium text-sm">{categoryName}</span>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        ${spent.toFixed(0)} / ${budget.toFixed(0)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isOver ? 'bg-destructive' : 'bg-chart-1'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-semibold min-w-[45px] text-right ${isOver ? 'text-destructive' : 'text-foreground'}`}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Subcategories - Dining, Groceries, Clothes */}
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-4 text-muted-foreground">Key Subcategories</h4>
              <div className="space-y-5">
                {['Dining', 'Groceries', 'Clothes'].map((subName) => {
                  const spent = spendingBySubcategory?.[subName]?.total || 0;
                  // Placeholder budgets - will be replaced with real budget data later
                  const budgetMap: Record<string, number> = {
                    'Dining': 400,
                    'Groceries': 500,
                    'Clothes': 200
                  };
                  const budget = budgetMap[subName] || 300;
                  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
                  const isOver = percentage > 100;

                  return (
                    <div key={subName} className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm">{subName}</span>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            ${spent.toFixed(0)} / ${budget.toFixed(0)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isOver ? 'bg-destructive' : 'bg-chart-2'}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold min-w-[45px] text-right ${isOver ? 'text-destructive' : 'text-foreground'}`}>
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3>Recent Transactions</h3>
            <button
              onClick={onNavigateToTransactions}
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 space-y-1 overflow-hidden">
            {(() => {
              // Use real transactions if available, otherwise fall back to mock data
              const recentTransactions = monthTransactions && monthTransactions.length > 0
                ? monthTransactions
                    .filter(t => t.category?.name !== 'Income')
                    .slice(0, 8)
                : monthlyData.filtered
                    .filter(t => t.categoryId !== 'cat-income')
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .slice(0, 8);

              const formatDate = (dateStr: string | Date) => {
                const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              };

              // Check if we're using real transactions
              const isRealData = monthTransactions && monthTransactions.length > 0;

              return recentTransactions.length > 0 ? (
                recentTransactions.map((transaction: any) => {
                  const subcategoryName = isRealData ? transaction.subcategory?.name : SUBCATEGORIES.find((s) => s.id === transaction.subcategoryId)?.name || 'Unknown';
                  const categoryName = isRealData ? transaction.category?.name : CATEGORIES.find((c) => c.id === transaction.categoryId)?.name || 'Unknown';
                  const date = isRealData ? formatDate(transaction.occurred_at) : formatDate(transaction.date);
                  const note = isRealData ? transaction.notes : null;

                  return (
                    <div key={transaction.id} className="flex items-start justify-between py-3 border-b border-border/50 last:border-0">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{subcategoryName}</span>
                          {note && (
                            <span className="text-xs text-muted-foreground italic truncate">"{note}"</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {date} • {categoryName}
                        </div>
                      </div>
                      <div className="text-sm font-semibold whitespace-nowrap">${Number(transaction.amount).toFixed(2)}</div>
                    </div>
                  );
                })
              ) : (
                <div className="text-muted-foreground text-sm text-center py-8">No transactions this month</div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}