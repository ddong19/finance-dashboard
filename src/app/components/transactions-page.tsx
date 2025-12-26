import { useMemo, useState } from 'react';
import { Plus, Repeat, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Transaction, RecurringTransaction } from '../types';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface TransactionsPageProps {
  selectedMonth: string;
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  onAddTransaction: () => void;
  onDeleteRecurring: (id: string) => void;
  onToggleRecurring: (id: string) => void;
}

export function TransactionsPage({ 
  selectedMonth, 
  transactions, 
  recurringTransactions,
  onAddTransaction,
  onDeleteRecurring,
  onToggleRecurring
}: TransactionsPageProps) {
  const [expandedRecurring, setExpandedRecurring] = useState(true);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const txMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === selectedMonth;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, selectedMonth]);

  const formatDate = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const formatRecurringSchedule = (recurring: RecurringTransaction) => {
    if (recurring.frequency === 'monthly') {
      const suffix = recurring.dayOfMonth === 1 ? 'st' : recurring.dayOfMonth === 2 ? 'nd' : recurring.dayOfMonth === 3 ? 'rd' : 'th';
      return `Monthly on the ${recurring.dayOfMonth}${suffix}`;
    } else {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Weekly on ${days[recurring.dayOfWeek || 0]}`;
    }
  };

  const activeRecurring = recurringTransactions.filter(r => r.active);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-4 pb-24">
        {/* Recurring Transactions Section */}
        {activeRecurring.length > 0 && (
          <div className="pt-4 pb-3">
            <button
              onClick={() => setExpandedRecurring(!expandedRecurring)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-3 w-full"
            >
              <Repeat className="w-4 h-4" />
              Recurring Transactions ({activeRecurring.length})
            </button>
            
            {expandedRecurring && (
              <div className="space-y-2 mb-4">
                {activeRecurring.map((recurring) => (
                  <div
                    key={recurring.id}
                    className="bg-blue-50 border border-blue-200 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Repeat className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            {recurring.category}
                          </span>
                        </div>
                        <div className="font-medium text-slate-900 mb-1">{recurring.subcategory}</div>
                        <div className="text-sm text-slate-600">{formatRecurringSchedule(recurring)}</div>
                        {recurring.note && (
                          <div className="text-sm text-slate-500 mt-1">{recurring.note}</div>
                        )}
                      </div>
                      <div className="flex items-start gap-3 ml-4">
                        <div className="text-lg font-semibold text-slate-900">
                          ${recurring.amount.toFixed(2)}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-blue-100 rounded transition-colors">
                              <MoreVertical className="w-4 h-4 text-slate-600" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onToggleRecurring(recurring.id)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Pause
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDeleteRecurring(recurring.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Regular Transactions */}
        {filteredTransactions.length > 0 ? (
          <div className="space-y-3 pt-2">
            {activeRecurring.length > 0 && (
              <div className="text-sm font-medium text-slate-600 mb-3">
                This Month's Transactions
              </div>
            )}
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {transaction.recurringId && (
                        <Repeat className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                        {transaction.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(transaction.date)}
                      </span>
                    </div>
                    <div className="font-medium text-slate-900">{transaction.subcategory}</div>
                    {transaction.note && (
                      <div className="text-sm text-slate-500 mt-1">{transaction.note}</div>
                    )}
                  </div>
                  <div className="text-lg font-semibold text-slate-900 ml-4">
                    ${transaction.amount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-slate-400 mb-2">No transactions yet</div>
            <div className="text-sm text-slate-500">Add your first transaction to get started</div>
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none max-w-md mx-auto">
        <Button
          onClick={onAddTransaction}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-14 text-base shadow-lg pointer-events-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Transaction
        </Button>
      </div>
    </div>
  );
}
