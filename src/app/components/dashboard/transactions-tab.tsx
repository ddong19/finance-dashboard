import { useMemo } from 'react';
import { Transaction } from '../../dashboard-types';
import { CATEGORIES, SUBCATEGORIES } from '../../dashboard-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface TransactionsTabProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
  transactions: Transaction[];
}

export function TransactionsTab({
  selectedMonth,
  onMonthChange,
  availableMonths,
  transactions,
}: TransactionsTabProps) {
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const txMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === selectedMonth;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, selectedMonth]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const getCategoryName = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  const getSubcategoryName = (subcategoryId: string) => {
    return SUBCATEGORIES.find((s) => s.id === subcategoryId)?.name || 'Unknown';
  };

  const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2>Transactions</h2>
          <p className="text-muted-foreground">All transactions for {formatMonth(selectedMonth)}</p>
        </div>
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

      {/* Summary Card */}
      <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-muted-foreground">Total Transactions</div>
            <div className="text-2xl font-semibold">{filteredTransactions.length}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Amount</div>
            <div className="text-2xl font-semibold">${totalSpent.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent/30 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Subcategory</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Note</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-accent/10">
                    <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <span className="px-2 py-1 bg-accent text-accent-foreground rounded-full text-xs">
                        {getCategoryName(transaction.categoryId)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium">
                      {getSubcategoryName(transaction.subcategoryId)}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground max-w-xs truncate">
                      {transaction.note || '-'}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-right whitespace-nowrap">
                      ${transaction.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    No transactions for this month
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}