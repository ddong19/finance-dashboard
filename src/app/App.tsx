import { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Calendar, TrendingUp, Receipt, FolderTree, LogOut } from 'lucide-react';
import { DashboardTab } from './components/dashboard/dashboard-tab';
import { MonthsTab } from './components/dashboard/months-tab';
import { AveragesTab } from './components/dashboard/averages-tab';
import { TransactionsTab } from './components/dashboard/transactions-tab';
import { CategoriesTab } from './components/dashboard/categories-tab';
import { LoginPage } from './components/auth/LoginPage';
import { Transaction, Subcategory, MonthlyIncome } from './dashboard-types';
import { SUBCATEGORIES as INITIAL_SUBCATEGORIES, generateMockTransactions, MOCK_INCOME } from './dashboard-data';
import { supabase } from '../lib/supabase';
import { fetchTransactionsForMonth, getMonthlySpendingByCategory, getMonthlySpendingBySubcategory, getAvailableMonths, fetchAllTransactions, TransactionWithDetails, getOrCreateBudgetsForMonth, fetchSubcategories, createSubcategory, updateSubcategory, deleteSubcategory, reorderSubcategories, fetchCategories, addSubcategoryToCurrentAndFutureMonths, Subcategory as DbSubcategory } from '../lib/database';
import type { User } from '@supabase/supabase-js';

type Tab = 'dashboard' | 'months' | 'averages' | 'transactions' | 'categories';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [dbSubcategories, setDbSubcategories] = useState<DbSubcategory[]>([]);
  const [income, setIncome] = useState<MonthlyIncome[]>(MOCK_INCOME);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    return now.getFullYear().toString();
  });

  // Data from database
  const [spendingByCategory, setSpendingByCategory] = useState<Record<string, { categoryId: number; categoryName: string; total: number }>>({});
  const [spendingBySubcategory, setSpendingBySubcategory] = useState<Record<string, { subcategoryId: number; subcategoryName: string; total: number; categoryName: string }>>({});
  const [monthTransactions, setMonthTransactions] = useState<TransactionWithDetails[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionWithDetails[]>([]);
  const [monthBudgets, setMonthBudgets] = useState<any[]>([]);

  // Check authentication status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load available months, transactions, and subcategories when user logs in
  useEffect(() => {
    if (!user) return;

    const loadInitialData = async () => {
      try {
        const [months, transactions, categories, subs] = await Promise.all([
          getAvailableMonths(),
          fetchAllTransactions(),
          fetchCategories(),
          fetchSubcategories()
        ]);

        setAvailableMonths(months);
        setAllTransactions(transactions);
        setDbSubcategories(subs);

        // Map database category names to UI category IDs
        const categoryNameToId: Record<string, string> = {
          'Income': 'cat-income',
          'Needs': 'cat-needs',
          'Wants': 'cat-wants',
          'Savings': 'cat-savings',
          'Tithe': 'cat-tithe',
        };

        // Convert database subcategories to UI format
        const uiSubcategories: Subcategory[] = subs.map((sub) => {
          const categoryName = categories.find(c => c.id === sub.category_id)?.name || '';
          const categoryId = categoryNameToId[categoryName] || '';

          return {
            id: sub.id.toString(),
            categoryId: categoryId,
            name: sub.name,
            sortOrder: sub.display_order,
            budgetAmount: 0, // Budgets are now per-month in month_budgets table
          };
        });
        setSubcategories(uiSubcategories);

        // If current selected month doesn't exist in available months, set to first available
        if (months.length > 0 && !months.includes(selectedMonth)) {
          setSelectedMonth(months[0]);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [user]);

  // Load spending data and budgets when user is logged in or month changes
  useEffect(() => {
    if (!user) return;

    const loadSpendingData = async () => {
      try {
        const [year, month] = selectedMonth.split('-');
        const [categoryData, subcategoryData, transactionsData, budgets] = await Promise.all([
          getMonthlySpendingByCategory(parseInt(year), parseInt(month)),
          getMonthlySpendingBySubcategory(parseInt(year), parseInt(month)),
          fetchTransactionsForMonth(parseInt(year), parseInt(month)),
          getOrCreateBudgetsForMonth(parseInt(year), parseInt(month))
        ]);
        setSpendingByCategory(categoryData);
        setSpendingBySubcategory(subcategoryData);
        setMonthTransactions(transactionsData);
        setMonthBudgets(budgets);
      } catch (error) {
        console.error('Error loading spending data:', error);
      }
    };

    loadSpendingData();
  }, [user, selectedMonth]);

  // Load data from localStorage (mock data for old features)
  useEffect(() => {
    const storedTransactions = localStorage.getItem('dashboard-transactions');
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

    if (storedIncome) {
      try {
        setIncome(JSON.parse(storedIncome));
      } catch (e) {
        console.error('Failed to load income', e);
      }
    }
  }, []);

  // Save data to localStorage (mock data for old features)
  useEffect(() => {
    localStorage.setItem('dashboard-transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('dashboard-income', JSON.stringify(income));
  }, [income]);


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
  const handleAddSubcategory = async (subcategory: Omit<Subcategory, 'id'>) => {
    try {
      // Map UI category ID to category name
      const categoryIdToName: Record<string, string> = {
        'cat-income': 'Income',
        'cat-needs': 'Needs',
        'cat-wants': 'Wants',
        'cat-savings': 'Savings',
        'cat-tithe': 'Tithe',
      };

      const categoryName = categoryIdToName[subcategory.categoryId];

      // Find the category in database by name
      const categories = await fetchCategories();
      const category = categories.find(c => c.name === categoryName);

      if (!category) {
        console.error('Category not found:', subcategory.categoryId, categoryName);
        return;
      }

      // Create in database
      const newSub = await createSubcategory(
        category.id,
        subcategory.name,
        subcategory.sortOrder
      );

      // Add to current and future months
      await addSubcategoryToCurrentAndFutureMonths(newSub.id);

      // Update UI
      const newSubcategory: Subcategory = {
        id: newSub.id.toString(),
        categoryId: subcategory.categoryId,
        name: newSub.name,
        sortOrder: newSub.display_order,
        budgetAmount: 0,
      };
      setSubcategories((prev) => [...prev, newSubcategory]);
      setDbSubcategories((prev) => [...prev, newSub]);
    } catch (error) {
      console.error('Error adding subcategory:', error);
    }
  };

  const handleUpdateSubcategory = async (id: string, updates: Partial<Subcategory>) => {
    try {
      const dbUpdates: Partial<DbSubcategory> = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.sortOrder) dbUpdates.display_order = updates.sortOrder;

      await updateSubcategory(parseInt(id), dbUpdates);

      // Update UI
      setSubcategories((prev) =>
        prev.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub))
      );
    } catch (error) {
      console.error('Error updating subcategory:', error);
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    try {
      await deleteSubcategory(parseInt(id));

      // Update UI
      setSubcategories((prev) => prev.filter((sub) => sub.id !== id));
      setDbSubcategories((prev) => prev.filter((sub) => sub.id !== parseInt(id)));
    } catch (error) {
      console.error('Error deleting subcategory:', error);
    }
  };

  const handleReorderSubcategories = async (categoryId: string, orderedIds: string[]) => {
    try {
      // Convert string IDs to numbers
      const numericIds = orderedIds.map(id => parseInt(id));

      await reorderSubcategories(numericIds);

      // Update UI
      setSubcategories((prev) =>
        prev.map((sub) => {
          if (sub.categoryId === categoryId) {
            const newOrder = orderedIds.indexOf(sub.id);
            return { ...sub, sortOrder: newOrder + 1 };
          }
          return sub;
        })
      );
    } catch (error) {
      console.error('Error reordering subcategories:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleLogin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    setLoading(false);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground mb-2">Finance Dashboard</div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

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
          <h1 className="text-xl font-bold text-[#faf8f5]">Finance Dashboard</h1>
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

        {/* Logout Button */}
        <div className="p-4 border-t border-[#5a4a3a]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg transition-all text-[#8b7d6b] hover:text-[#faf8f5] hover:bg-[#4a3d30]"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-background">
        {activeTab === 'dashboard' && (
          <DashboardTab
            currentMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            availableMonths={availableMonths}
            transactions={transactions}
            income={currentMonthIncome}
            onNavigateToTransactions={() => setActiveTab('transactions')}
            spendingByCategory={spendingByCategory}
            spendingBySubcategory={spendingBySubcategory}
            monthTransactions={monthTransactions}
            monthBudgets={monthBudgets}
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
            allTransactions={allTransactions}
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