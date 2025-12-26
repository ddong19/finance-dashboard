import { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Calendar, TrendingUp, Receipt, FolderTree } from 'lucide-react';
import { DashboardTab } from './components/dashboard/dashboard-tab';
import { MonthsTab } from './components/dashboard/months-tab';
import { AveragesTab } from './components/dashboard/averages-tab';
import { TransactionsTab } from './components/dashboard/transactions-tab';
import { CategoriesTab } from './components/dashboard/categories-tab';
import { Transaction, Subcategory, MonthlyIncome } from './dashboard-types';
import { SUBCATEGORIES as INITIAL_SUBCATEGORIES, generateMockTransactions, MOCK_INCOME } from './dashboard-data';

type Tab = 'dashboard' | 'months' | 'averages' | 'transactions' | 'categories';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(INITIAL_SUBCATEGORIES);
  const [income, setIncome] = useState<MonthlyIncome[]>(MOCK_INCOME);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    return now.getFullYear().toString();
  });

  // Load data from localStorage
  useEffect(() => {
    const storedTransactions = localStorage.getItem('dashboard-transactions');
    const storedSubcategories = localStorage.getItem('dashboard-subcategories');
    const storedIncome = localStorage.getItem('dashboard-income');

    if (storedTransactions) {
      try {
        const parsed = JSON.parse(storedTransactions);
        const withDates = parsed.map((t: any) => ({
          ...t,
          date: new Date(t.date),
        }));
        setTransactions(withDates);
      } catch (e) {
        console.error('Failed to load transactions', e);
        setTransactions(generateMockTransactions());
      }
    } else {
      setTransactions(generateMockTransactions());
    }

    if (storedSubcategories) {
      try {
        setSubcategories(JSON.parse(storedSubcategories));
      } catch (e) {
        console.error('Failed to load subcategories', e);
      }
    }

    if (storedIncome) {
      try {
        setIncome(JSON.parse(storedIncome));
      } catch (e) {
        console.error('Failed to load income', e);
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('dashboard-subcategories', JSON.stringify(subcategories));
  }, [subcategories]);

  useEffect(() => {
    localStorage.setItem('dashboard-income', JSON.stringify(income));
  }, [income]);

  // Calculate available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    
    transactions.forEach((t) => {
      const month = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      months.add(month);
    });
    
    // Add current month if not present
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const currentMonthIncome = useMemo(() => {
    const filtered = transactions.filter((t) => {
      const txMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      return txMonth === selectedMonth && t.categoryId === 'cat-income';
    });
    return filtered.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedMonth]);

  const averageIncome = useMemo(() => {
    if (availableMonths.length === 0) return 0;
    
    let total = 0;
    availableMonths.forEach((month) => {
      const filtered = transactions.filter((t) => {
        const txMonth = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === month && t.categoryId === 'cat-income';
      });
      total += filtered.reduce((sum, t) => sum + t.amount, 0);
    });
    
    return total / availableMonths.length;
  }, [transactions, availableMonths]);

  // Category handlers
  const handleAddSubcategory = (subcategory: Omit<Subcategory, 'id'>) => {
    const newSubcategory: Subcategory = {
      ...subcategory,
      id: `sub-${Date.now()}`,
    };
    setSubcategories((prev) => [...prev, newSubcategory]);
  };

  const handleUpdateSubcategory = (id: string, updates: Partial<Subcategory>) => {
    setSubcategories((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub))
    );
  };

  const handleDeleteSubcategory = (id: string) => {
    setSubcategories((prev) => prev.filter((sub) => sub.id !== id));
  };

  const handleReorderSubcategories = (categoryId: string, orderedIds: string[]) => {
    setSubcategories((prev) =>
      prev.map((sub) => {
        if (sub.categoryId === categoryId) {
          const newOrder = orderedIds.indexOf(sub.id);
          return { ...sub, sortOrder: newOrder + 1 };
        }
        return sub;
      })
    );
  };

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'months' as const, label: 'Months', icon: Calendar },
    { id: 'averages' as const, label: 'Averages', icon: TrendingUp },
    { id: 'transactions' as const, label: 'Transactions', icon: Receipt },
    { id: 'categories' as const, label: 'Categories', icon: FolderTree },
  ];

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-[#3d3328] flex flex-col border-r border-[#5a4a3a]">
        {/* Logo/Header */}
        <div className="p-6 border-b border-[#5a4a3a]">
          <h1 className="text-xl font-bold text-[#faf8f5]">FinanceFlow</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#5a4a3a] text-[#faf8f5] font-medium'
                      : 'text-[#8b7d6b] hover:text-[#faf8f5] hover:bg-[#4a3d30]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-background">
        {activeTab === 'dashboard' && (
          <DashboardTab
            currentMonth={selectedMonth}
            transactions={transactions}
            income={currentMonthIncome}
          />
        )}
        {activeTab === 'months' && (
          <MonthsTab
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            availableMonths={availableMonths}
            transactions={transactions}
            income={currentMonthIncome}
          />
        )}
        {activeTab === 'averages' && (
          <AveragesTab
            selectedYear={selectedYear}
            transactions={transactions}
            averageIncome={averageIncome}
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsTab
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            availableMonths={availableMonths}
            transactions={transactions}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesTab
            subcategories={subcategories}
            onAddSubcategory={handleAddSubcategory}
            onUpdateSubcategory={handleUpdateSubcategory}
            onDeleteSubcategory={handleDeleteSubcategory}
            onReorderSubcategories={handleReorderSubcategories}
          />
        )}
      </div>
    </div>
  );
}