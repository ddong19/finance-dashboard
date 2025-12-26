import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Transaction, Subcategory } from '../../dashboard-types';
import { CATEGORIES, SUBCATEGORIES } from '../../dashboard-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface DashboardTabProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
  transactions: Transaction[];
  income: number;
}

export function DashboardTab({ currentMonth, onMonthChange, availableMonths, transactions, income }: DashboardTabProps) {
  const monthlyData = useMemo(() => {
    const filtered = transactions.filter((t) => {
      const txMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      return txMonth === currentMonth;
    });

    const categoryTotals: Record<string, { spent: number; budget: number }> = {};
    
    CATEGORIES.filter(cat => cat.name !== 'Income').forEach((cat) => {
      const subs = SUBCATEGORIES.filter((s) => s.categoryId === cat.id);
      const budget = subs.reduce((sum, s) => sum + (s.budgetAmount || 0), 0);
      const spent = filtered
        .filter((t) => t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      
      categoryTotals[cat.id] = { spent, budget };
    });

    const totalSpent = Object.values(categoryTotals).reduce((sum, c) => sum + c.spent, 0);
    const totalBudget = Object.values(categoryTotals).reduce((sum, c) => sum + c.budget, 0);

    return { categoryTotals, totalSpent, totalBudget };
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
          <div className="text-sm text-muted-foreground mb-1">Income</div>
          <div className="text-2xl font-semibold">${income.toFixed(2)}</div>
        </div>

        <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
          <div className="text-sm text-muted-foreground mb-1">Total Budget</div>
          <div className="text-2xl font-semibold">${monthlyData.totalBudget.toFixed(2)}</div>
        </div>

        <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
          <div className="text-sm text-muted-foreground mb-1">Total Spent</div>
          <div className="text-2xl font-semibold">${monthlyData.totalSpent.toFixed(2)}</div>
          <div className="flex items-center gap-1 text-sm mt-1">
            {budgetRemaining >= 0 ? (
              <>
                <TrendingDown className="w-4 h-4 text-green-700" />
                <span className="text-green-700">${budgetRemaining.toFixed(2)} under budget</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 text-destructive" />
                <span className="text-destructive">${Math.abs(budgetRemaining).toFixed(2)} over budget</span>
              </>
            )}
          </div>
        </div>

        <div className={`rounded-lg border p-5 shadow-sm ${remaining >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="text-sm text-muted-foreground mb-1">Remaining</div>
          <div className={`text-2xl font-semibold ${remaining >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            ${remaining.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {((remaining / income) * 100).toFixed(1)}% of income
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
        <h3>Budget vs Actual by Category</h3>
        <div className="space-y-4 mt-4">
          {CATEGORIES.filter(cat => cat.name !== 'Income').map((category) => {
            const data = monthlyData.categoryTotals[category.id];
            const percentage = data.budget > 0 ? (data.spent / data.budget) * 100 : 0;
            const isOver = percentage > 100;

            return (
              <div key={category.id}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{category.name}</span>
                  <div className="text-sm">
                    <span className={isOver ? 'text-destructive font-semibold' : ''}>
                      ${data.spent.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground"> / ${data.budget.toFixed(2)}</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOver ? 'bg-destructive' : 'bg-chart-1'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {percentage.toFixed(1)}% of budget
                  {isOver && (
                    <span className="text-destructive ml-2">
                      (${(data.spent - data.budget).toFixed(2)} over)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Spending Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <h3>Top Spending Subcategories</h3>
          <div className="space-y-3 mt-4">
            {(() => {
              const subcategorySpending = SUBCATEGORIES.filter(sub => sub.categoryId !== 'cat-income').map((sub) => ({
                ...sub,
                spent: transactions
                  .filter((t) => {
                    const txMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
                    return txMonth === currentMonth && t.subcategoryId === sub.id;
                  })
                  .reduce((sum, t) => sum + t.amount, 0),
              }))
                .filter((s) => s.spent > 0)
                .sort((a, b) => b.spent - a.spent)
                .slice(0, 5);

              return subcategorySpending.map((sub) => (
                <div key={sub.id} className="flex justify-between items-center">
                  <span>{sub.name}</span>
                  <span className="font-semibold">${sub.spent.toFixed(2)}</span>
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <h3>Budget Status</h3>
          <div className="space-y-3 mt-4">
            {(() => {
              const subcategoryStatus = SUBCATEGORIES.filter(sub => sub.categoryId !== 'cat-income').map((sub) => {
                const spent = transactions
                  .filter((t) => {
                    const txMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
                    return txMonth === currentMonth && t.subcategoryId === sub.id;
                  })
                  .reduce((sum, t) => sum + t.amount, 0);
                const budget = sub.budgetAmount || 0;
                const percentage = budget > 0 ? (spent / budget) * 100 : 0;
                return { ...sub, spent, percentage };
              })
                .filter((s) => s.percentage > 90)
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 5);

              return subcategoryStatus.length > 0 ? (
                subcategoryStatus.map((sub) => (
                  <div key={sub.id} className="flex justify-between items-center">
                    <span>{sub.name}</span>
                    <span className={`font-semibold ${sub.percentage > 100 ? 'text-destructive' : 'text-orange-700'}`}>
                      {sub.percentage.toFixed(0)}% used
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">All categories within budget!</div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}