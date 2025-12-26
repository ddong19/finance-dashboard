import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction, Subcategory } from '../../dashboard-types';
import { CATEGORIES, SUBCATEGORIES } from '../../dashboard-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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

  const monthlyData = useMemo(() => {
    const filtered = transactions.filter((t) => {
      const txMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      return txMonth === selectedMonth;
    });

    const categoryData: Record<string, { subcategories: { id: string; name: string; spent: number; budget: number }[]; total: number; budgetTotal: number }> = {};

    CATEGORIES.forEach((cat) => {
      const subs = SUBCATEGORIES.filter((s) => s.categoryId === cat.id).sort((a, b) => a.sortOrder - b.sortOrder);
      
      const subcategories = subs.map((sub) => ({
        id: sub.id,
        name: sub.name,
        spent: filtered.filter((t) => t.subcategoryId === sub.id).reduce((sum, t) => sum + t.amount, 0),
        budget: sub.budgetAmount || 0,
      }));

      categoryData[cat.id] = {
        subcategories,
        total: subcategories.reduce((sum, s) => sum + s.spent, 0),
        budgetTotal: subcategories.reduce((sum, s) => sum + s.budget, 0),
      };
    });

    return categoryData;
  }, [selectedMonth, transactions]);

  const chartData = useMemo(() => {
    return CATEGORIES.filter(cat => cat.name !== 'Income').map((cat) => ({
      name: cat.name,
      Spent: monthlyData[cat.id].total,
      Budget: monthlyData[cat.id].budgetTotal,
    }));
  }, [monthlyData]);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const filterSubcategories = (subcategories: { id: string; name: string; spent: number; budget: number }[]) => {
    if (subcategoryFilter === 'all') return subcategories;
    if (subcategoryFilter === 'active') return subcategories.filter((s) => s.spent > 0);
    if (subcategoryFilter === 'over-budget') return subcategories.filter((s) => s.spent > s.budget);
    return subcategories;
  };

  // Calculate max rows for equal table heights
  const maxRows = useMemo(() => {
    const categoryRows = CATEGORIES.filter(cat => cat.name !== 'Income').map((cat) => {
      const subs = filterSubcategories(monthlyData[cat.id].subcategories);
      return subs.length;
    });
    return Math.max(...categoryRows, 1);
  }, [monthlyData, subcategoryFilter]);

  const totalSpent = CATEGORIES
    .filter(cat => cat.name !== 'Income')
    .reduce((sum, cat) => sum + monthlyData[cat.id].total, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2>Monthly Analysis</h2>
          <p className="text-muted-foreground">Detailed breakdown by category</p>
        </div>
        <div className="flex gap-3">
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
                  const incomeSubs = filterSubcategories(monthlyData['cat-income'].subcategories);
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
                    ${monthlyData['cat-income'].total.toFixed(2)}
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
        {CATEGORIES.filter(cat => cat.name !== 'Income').map((category) => {
          const data = monthlyData[category.id];
          const filteredSubs = filterSubcategories(data.subcategories);
          const percentageOfIncome = monthlyData['cat-income'].total > 0 
            ? (data.total / monthlyData['cat-income'].total) * 100 
            : 0;

          return (
            <div key={category.id} className="bg-card rounded-lg border border-border overflow-hidden shadow-sm flex flex-col">
              <div className="px-4 py-3 bg-accent/30 border-b border-border flex justify-between items-center">
                <h3 className="text-sm font-medium">{category.name}</h3>
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
                        rows.push(
                          <tr key={sub.id} className="hover:bg-accent/10">
                            <td className="px-4 py-2.5 text-sm">{sub.name}</td>
                            <td className="px-4 py-2.5 text-sm text-muted-foreground text-right">${sub.budget.toFixed(2)}</td>
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
