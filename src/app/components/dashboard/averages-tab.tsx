import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction } from '../../dashboard-types';
import { CATEGORIES, SUBCATEGORIES } from '../../dashboard-data';

interface AveragesTabProps {
  selectedYear: string;
  transactions: Transaction[];
  averageIncome: number;
}

export function AveragesTab({ selectedYear, transactions, averageIncome }: AveragesTabProps) {
  const yearlyAverages = useMemo(() => {
    const year = parseInt(selectedYear);
    
    // Filter transactions for the selected year
    const yearTransactions = transactions.filter((t) => t.date.getFullYear() === year);
    
    // Group by month
    const monthlyTotals: Record<string, Record<string, number>> = {};
    
    for (let month = 0; month < 12; month++) {
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      monthlyTotals[monthKey] = {};
      
      SUBCATEGORIES.forEach((sub) => {
        monthlyTotals[monthKey][sub.id] = 0;
      });
    }
    
    // Calculate monthly totals
    yearTransactions.forEach((t) => {
      const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTotals[monthKey]) {
        monthlyTotals[monthKey][t.subcategoryId] = (monthlyTotals[monthKey][t.subcategoryId] || 0) + t.amount;
      }
    });
    
    // Calculate averages
    const monthCount = Object.keys(monthlyTotals).length;
    const categoryData: Record<string, { subcategories: { id: string; name: string; average: number; budget: number }[]; total: number; budgetTotal: number }> = {};
    
    CATEGORIES.forEach((cat) => {
      const subs = SUBCATEGORIES.filter((s) => s.categoryId === cat.id).sort((a, b) => a.sortOrder - b.sortOrder);
      
      const subcategories = subs.map((sub) => {
        const totalForYear = Object.values(monthlyTotals).reduce((sum, month) => sum + (month[sub.id] || 0), 0);
        const average = monthCount > 0 ? totalForYear / monthCount : 0;
        
        return {
          id: sub.id,
          name: sub.name,
          average,
          budget: sub.budgetAmount || 0,
        };
      });
      
      categoryData[cat.id] = {
        subcategories,
        total: subcategories.reduce((sum, s) => sum + s.average, 0),
        budgetTotal: subcategories.reduce((sum, s) => sum + s.budget, 0),
      };
    });
    
    return categoryData;
  }, [selectedYear, transactions]);

  const chartData = useMemo(() => {
    return CATEGORIES.filter(cat => cat.name !== 'Income').map((cat) => ({
      name: cat.name,
      Average: yearlyAverages[cat.id].total,
      Budget: yearlyAverages[cat.id].budgetTotal,
    }));
  }, [yearlyAverages]);

  const totalAverageIncome = yearlyAverages['cat-income']?.total || 0;
  const totalAverage = CATEGORIES
    .filter(cat => cat.name !== 'Income')
    .reduce((sum, cat) => sum + yearlyAverages[cat.id].total, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2>Yearly Averages - {selectedYear}</h2>
        <p className="text-muted-foreground">Average monthly spending across all categories</p>
      </div>

      {/* Income and Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income Summary */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-accent/30 border-b border-border">
            <h3 className="text-sm font-medium">Average Income</h3>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg Monthly Income</span>
                <span className="text-2xl font-semibold text-green-700">${totalAverageIncome.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className="text-muted-foreground">Avg Total Spent</span>
                <span className="font-semibold">${totalAverage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg Remaining</span>
                <span className={`font-semibold ${totalAverageIncome - totalAverage >= 0 ? 'text-green-700' : 'text-destructive'}`}>
                  ${(totalAverageIncome - totalAverage).toFixed(2)}
                </span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-chart-1 rounded-full transition-all"
                    style={{ width: `${Math.min((totalAverage / totalAverageIncome) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {((totalAverage / totalAverageIncome) * 100).toFixed(1)}% of income used on average
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-accent/30 border-b border-border">
            <h3 className="text-sm font-medium">Average Spending Overview</h3>
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
                <Bar dataKey="Average" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CATEGORIES.filter(cat => cat.name !== 'Income').map((category) => {
          const data = yearlyAverages[category.id];
          const percentageOfIncome = totalAverageIncome > 0 
            ? (data.total / totalAverageIncome) * 100 
            : 0;

          return (
            <div key={category.id} className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-accent/30 border-b border-border flex justify-between items-center">
                <h3 className="text-sm font-medium">{category.name}</h3>
                <div className="text-xs">
                  <span className="font-semibold">${data.total.toFixed(2)}</span>
                  <span className="text-muted-foreground"> / ${data.budgetTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-accent/20 border-b border-border">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Subcategory</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.subcategories.map((sub) => {
                      const isOver = sub.average > sub.budget;
                      return (
                        <tr key={sub.id} className="hover:bg-accent/10">
                          <td className="px-4 py-2.5 text-sm">{sub.name}</td>
                          <td className="px-4 py-2.5 text-sm text-muted-foreground text-right">${sub.budget.toFixed(2)}</td>
                          <td className={`px-4 py-2.5 text-sm text-right font-medium ${isOver ? 'text-destructive' : ''}`}>
                            ${sub.average.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
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
