import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { TransactionForm } from './TransactionForm';
import AllTransactions from './AllTransactions';
import { PanelDetailsModal } from './PanelDetailsModal';
import { ExpenseTrackerView } from './ExpenseTrackerView';
import { ExportImportModal } from './ExportImportModal';
import SpendingAlertsNotification from './SpendingAlertsNotification';
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Eye,
  Pencil,
  Trash2,
  Table,
  Download,
  Settings,
  GripVertical,
  EyeOff,
  RotateCcw,
  Save,
  X,
  Bell,
  Calendar,
  BarChart3,
  Calculator,
  PiggyBank
} from 'lucide-react';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
  date: string;
  timestamp: string;
}

interface DashboardProps {
  monthlySavings: number;
  expenseLimit: number;
}

// Widget definition
interface Widget {
  id: string;
  title: string;
  visible: boolean;
  size: 'small' | 'medium' | 'large';
  order: number;
}

// Widget size mapping
const sizeMap = {
  'small': 'col-span-1 row-span-1',
  'medium': 'col-span-1 row-span-2',
  'large': 'col-span-2 row-span-1'
};

export const Dashboard: React.FC<DashboardProps> = ({ monthlySavings, expenseLimit }) => {
  // Transaction management state
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<'income' | 'expenses' | 'budget' | 'savings' | null>(null);
  const [returnToAllTransactions, setReturnToAllTransactions] = useState(false);
  const [showExpenseTracker, setShowExpenseTracker] = useState(false);
  const [returnToExpenseTracker, setReturnToExpenseTracker] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  
  // Month selection state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Dashboard customization state
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Default widgets configuration
  const defaultWidgets: Widget[] = [
    { id: 'income', title: 'Total Income', visible: true, size: 'small', order: 1 },
    { id: 'expenses', title: 'Total Expenses', visible: true, size: 'small', order: 2 },
    { id: 'budget-status', title: 'Budget Status', visible: true, size: 'small', order: 3 },
    { id: 'savings', title: 'Savings Goal', visible: true, size: 'small', order: 4 },
    { id: 'recent-transactions', title: 'Recent Transactions', visible: true, size: 'medium', order: 5 },
    { id: 'expense-categories', title: 'Top Expense Categories', visible: true, size: 'medium', order: 6 },
    { id: 'monthly-trends', title: 'Monthly Trends', visible: false, size: 'large', order: 7 },
    { id: 'daily-spending', title: 'Daily Spending', visible: false, size: 'small', order: 8 },
    { id: 'savings-forecast', title: 'Savings Forecast', visible: false, size: 'large', order: 9 },
    { id: 'budget-calendar', title: 'Budget Calendar', visible: false, size: 'medium', order: 10 }
  ];

  // Load dashboard configuration from localStorage
  useEffect(() => {
    try {
      const savedWidgets = localStorage.getItem('spendsmart_dashboard_widgets');
      if (savedWidgets) {
        setWidgets(JSON.parse(savedWidgets));
      } else {
        setWidgets(defaultWidgets);
      }
    } catch (error) {
      console.error('Error loading dashboard configuration:', error);
      setWidgets(defaultWidgets);
    }
  }, []);

  // Save dashboard configuration to localStorage
  const saveDashboardLayout = () => {
    try {
      localStorage.setItem('spendsmart_dashboard_widgets', JSON.stringify(widgets));
      setIsCustomizing(false);
    } catch (error) {
      console.error('Error saving dashboard configuration:', error);
    }
  };

  // Reset to default layout
  const resetToDefault = () => {
    if (window.confirm('Reset dashboard to default layout? This will remove your customizations.')) {
      setWidgets(defaultWidgets);
      localStorage.removeItem('spendsmart_dashboard_widgets');
      setIsCustomizing(false);
    }
  };

  // Toggle widget visibility
  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, visible: !widget.visible }
          : widget
      )
    );
  };

  // Change widget size
  const changeWidgetSize = (widgetId: string, newSize: 'small' | 'medium' | 'large') => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, size: newSize }
          : widget
      )
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    
    if (!draggedWidget || draggedWidget === targetWidgetId) {
      setDraggedWidget(null);
      return;
    }

    setWidgets(prev => {
      const draggedIndex = prev.findIndex(w => w.id === draggedWidget);
      const targetIndex = prev.findIndex(w => w.id === targetWidgetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newWidgets = [...prev];
      const [draggedWidgetObj] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(targetIndex, 0, draggedWidgetObj);
      
      // Update order
      return newWidgets.map((widget, index) => ({
        ...widget,
        order: index + 1
      }));
    });
    
    setDraggedWidget(null);
  };

  // Fetch transactions from your backend
  const { data: transactions = [], refetch, isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: async (): Promise<Transaction[]> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/records`);
        if (!response.ok) throw new Error('Failed to fetch transactions');
        return response.json();
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
    },
  });

  // Calculate totals - FILTERED BY MONTH
  const totalIncome = useMemo(() => {
    return transactions
      .filter((transaction: Transaction) => {
        const transactionMonth = transaction.date.substring(0, 7);
        return transaction.type === 'income' && transactionMonth === selectedMonth;
      })
      .reduce((sum: number, transaction: Transaction) => sum + Number(transaction.amount), 0);
  }, [transactions, selectedMonth]);

  const totalExpenses = useMemo(() => {
    return transactions
      .filter((transaction: Transaction) => {
        const transactionMonth = transaction.date.substring(0, 7);
        return transaction.type === 'expense' && transactionMonth === selectedMonth;
      })
      .reduce((sum: number, transaction: Transaction) => sum + Number(transaction.amount), 0);
  }, [transactions, selectedMonth]);

  const currentSavings = totalIncome - totalExpenses;
  const budgetPercentage = expenseLimit > 0 ? Math.min((totalExpenses / expenseLimit) * 100, 100) : 0;
  const savingsProgress = monthlySavings > 0 ? Math.min((currentSavings / monthlySavings) * 100, 100) : 0;

  // Daily average spending
  const dailyAverageSpending = useMemo(() => {
    const daysInMonth = new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate();
    return totalExpenses / daysInMonth;
  }, [totalExpenses, selectedMonth]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const currentMonth = selectedMonth;
    const [year, month] = currentMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const previousMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    const previousExpenses = transactions
      .filter((t: Transaction) => {
        const transactionMonth = t.date.substring(0, 7);
        return t.type === 'expense' && transactionMonth === previousMonth;
      })
      .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);
    
    const trend = previousExpenses > 0 ? ((totalExpenses - previousExpenses) / previousExpenses) * 100 : 0;
    
    return {
      currentMonth: totalExpenses,
      previousMonth: previousExpenses,
      trend: trend,
      isUp: trend > 0
    };
  }, [transactions, totalExpenses, selectedMonth]);

  const formatCurrency = (amount: number): string => {
    const numAmount = Number(amount) || 0;
    return `$${numAmount.toLocaleString()}`;
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionForm(true);
    
    if (showAllTransactions) {
      setShowAllTransactions(false);
      setReturnToAllTransactions(true);
    }
    
    if (showExpenseTracker) {
      setShowExpenseTracker(false);
      setReturnToExpenseTracker(true);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/records/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        refetch();
      } else {
        console.error('Error deleting transaction: Server responded with status', response.status);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleDeleteTransactionSync = (id: number) => {
    handleDeleteTransaction(id);
  };

  const handleFormClose = () => {
    setShowTransactionForm(false);
    setEditingTransaction(null);
    
    if (returnToAllTransactions) {
      setShowAllTransactions(true);
      setReturnToAllTransactions(false);
    }
    
    if (returnToExpenseTracker) {
      setShowExpenseTracker(true);
      setReturnToExpenseTracker(false);
    }
  };

  const handleFormSuccess = () => {
    refetch();
    setShowTransactionForm(false);
    setEditingTransaction(null);
    
    if (returnToAllTransactions) {
      setShowAllTransactions(true);
      setReturnToAllTransactions(false);
    }
    
    if (returnToExpenseTracker) {
      setShowExpenseTracker(true);
      setReturnToExpenseTracker(false);
    }
  };

  const handleImportSuccess = () => {
    refetch();
  };

  // Get top expense categories - FILTERED BY MONTH
  const getExpensesByCategory = () => {
    const expenseTransactions = transactions.filter((t: Transaction) => {
      const transactionMonth = t.date.substring(0, 7);
      return t.type === 'expense' && transactionMonth === selectedMonth;
    });
    const categoryTotals: Record<string, number> = {};
    
    expenseTransactions.forEach((transaction: Transaction) => {
      const amount = Number(transaction.amount) || 0;
      categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const topExpenseCategories = getExpensesByCategory();
  
  // Get recent transactions - FILTERED BY MONTH
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .filter((t: Transaction) => {
        const transactionMonth = t.date.substring(0, 7);
        return transactionMonth === selectedMonth;
      })
      .sort((a: Transaction, b: Transaction) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [transactions, selectedMonth]);

  // Get available months from transactions
  const getAvailableMonths = () => {
    const months = new Set<string>();
    transactions.forEach(t => {
      months.add(t.date.substring(0, 7));
    });
    // Ensure current month is available
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentMonth);
    
    return Array.from(months).sort().reverse();
  };

  // Customizable widget component wrapper
  const CustomizableWidget: React.FC<{
    widget: Widget;
    children: React.ReactNode;
  }> = ({ widget, children }) => (
    <div
      className={`relative ${sizeMap[widget.size]} ${
        isCustomizing ? 'ring-2 ring-blue-200 ring-dashed' : ''
      }`}
      draggable={isCustomizing}
      onDragStart={(e) => handleDragStart(e, widget.id)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, widget.id)}
    >
      {isCustomizing && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0 bg-white/90"
            onClick={() => toggleWidgetVisibility(widget.id)}
            title={widget.visible ? 'Hide widget' : 'Show widget'}
          >
            {widget.visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0 bg-white/90 cursor-move"
            title="Drag to reorder"
          >
            <GripVertical className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      {isCustomizing && (
        <div className="absolute bottom-2 left-2 z-10">
          <select
            value={widget.size}
            onChange={(e) => changeWidgetSize(widget.id, e.target.value as 'small' | 'medium' | 'large')}
            className="text-xs border rounded px-1 py-0.5 bg-white/90"
          >
            <option value="small">Small</option>
            <option value="medium">Tall</option>
            <option value="large">Wide</option>
          </select>
        </div>
      )}
      
      <div className={`h-full ${!widget.visible ? 'opacity-30' : ''} ${
        isCustomizing && !widget.visible ? 'pointer-events-none' : ''
      }`}>
        {children}
      </div>
    </div>
  );

  // Clickable panel component
  const ClickableStatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ComponentType<any>;
    className?: string;
    panelType: 'income' | 'expenses' | 'budget' | 'savings';
    children?: React.ReactNode;
  }> = ({ title, value, icon: Icon, className = '', panelType, children }) => (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-0 shadow-md bg-gradient-to-br from-card to-card/95 h-full ${className}`}
      onClick={() => !isCustomizing && setSelectedPanel(panelType)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {children}
      </CardContent>
    </Card>
  );

  // Widget renderer
  const renderWidget = (widget: Widget) => {
    switch (widget.id) {
      case 'income':
        return (
          <ClickableStatCard
            title="Total Income"
            value={formatCurrency(totalIncome)}
            icon={TrendingUp}
            className="border-l-4 border-l-green-500"
            panelType="income"
          />
        );
      
      case 'expenses':
        return (
          <ClickableStatCard
            title="Total Expenses"
            value={formatCurrency(totalExpenses)}
            icon={TrendingDown}
            className="border-l-4 border-l-red-500"
            panelType="expenses"
          />
        );
      
      case 'budget-status':
        return (
          <ClickableStatCard
            title="Budget Status"
            value={`${budgetPercentage.toFixed(1)}%`}
            icon={Target}
            className={`border-l-4 ${
              budgetPercentage > 100 ? 'border-l-red-500' : 
              budgetPercentage > 80 ? 'border-l-yellow-500' : 'border-l-green-500'
            }`}
            panelType="budget"
          >
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    budgetPercentage > 100 ? 'bg-red-500' : 
                    budgetPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(totalExpenses)} of {formatCurrency(expenseLimit)}
              </p>
            </div>
          </ClickableStatCard>
        );
      
      case 'savings':
        return (
          <ClickableStatCard
            title="Savings Goal"
            value={formatCurrency(currentSavings)}
            icon={DollarSign}
            className={`border-l-4 ${currentSavings >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}
            panelType="savings"
          >
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, savingsProgress)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {savingsProgress.toFixed(1)}% of {formatCurrency(monthlySavings)}
              </p>
            </div>
          </ClickableStatCard>
        );

      case 'recent-transactions':
        return (
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <div className="flex gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short' 
                  })}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => !isCustomizing && setShowAllTransactions(true)}
                  disabled={isCustomizing}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {selectedMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` 
                        ? "No transactions yet this month."
                        : `No transactions found for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`
                      }
                    </p>
                  </div>
                ) : (
                  recentTransactions.map((transaction: Transaction) => (
                    <div 
                      key={transaction.id}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 group h-auto"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{transaction.note}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.category} - {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!isCustomizing && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTransaction(transaction);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTransaction(transaction.id);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        
                        <div className={`font-medium text-sm ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );
      
      case 'expense-categories':
        return (
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 h-full">
            <CardHeader>
              <CardTitle>Top Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topExpenseCategories.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No expense categories yet this month.
                    </p>
                  </div>
                ) : (
                  topExpenseCategories.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{category.category}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(category.amount)} ({category.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'monthly-trends':
        return (
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Monthly Spending Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-2xl font-bold">
                      {monthlyTrend.isUp ? '+' : ''}{monthlyTrend.trend.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">vs last month</p>
                  </div>
                  <div className={`p-3 rounded-full ${
                    monthlyTrend.isUp ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {monthlyTrend.isUp ? (
                      <TrendingUp className={`h-6 w-6 text-red-500`} />
                    ) : (
                      <TrendingDown className={`h-6 w-6 text-green-500`} />
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Month</span>
                    <span className="font-medium">{formatCurrency(monthlyTrend.currentMonth)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Previous Month</span>
                    <span className="font-medium">{formatCurrency(monthlyTrend.previousMonth)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Difference</span>
                    <span className={`font-medium ${
                      monthlyTrend.isUp ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {monthlyTrend.isUp ? '+' : ''}{formatCurrency(monthlyTrend.currentMonth - monthlyTrend.previousMonth)}
                    </span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden mt-2">
                  <div className="relative h-full w-full">
                    <div className="absolute inset-0 flex">
                      <div className="bg-blue-300 h-full" style={{ width: '50%' }}></div>
                      <div className={`h-full ${monthlyTrend.isUp ? 'bg-red-400' : 'bg-green-400'}`} 
                        style={{ 
                          width: `${Math.min(Math.abs(monthlyTrend.trend) / 2, 50)}%`, 
                          marginLeft: monthlyTrend.isUp ? '0' : 'auto',
                          marginRight: monthlyTrend.isUp ? 'auto' : '0'
                        }}>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'daily-spending':
        return (
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{formatCurrency(dailyAverageSpending)}</div>
              <p className="text-xs text-muted-foreground">Average daily spending</p>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span>Month Total:</span>
                  <span className="font-medium">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Days:</span>
                  <span className="font-medium">
                    {new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'savings-forecast':
        return (
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                Savings Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(currentSavings)}
                    </div>
                    <p className="text-sm text-muted-foreground">Current savings</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-500">
                      {formatCurrency(monthlySavings)}
                    </div>
                    <p className="text-sm text-muted-foreground">Monthly goal</p>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-300 ${
                      currentSavings >= monthlySavings ? 'bg-green-500' :
                      currentSavings >= 0 ? 'bg-blue-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(currentSavings / monthlySavings * 100, 100))}%` }}
                  />
                </div>
                
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Income:</span>
                    <span className="font-medium text-green-600">{formatCurrency(totalIncome)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Expenses:</span>
                    <span className="font-medium text-red-600">{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium pt-1 border-t">
                    <span>Net Savings:</span>
                    <span className={currentSavings >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(currentSavings)}
                    </span>
                  </div>
                </div>
                
                {currentSavings < monthlySavings && currentSavings >= 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-700">
                    <p>You need {formatCurrency(monthlySavings - currentSavings)} more to reach your goal.</p>
                  </div>
                )}
                {currentSavings < 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                    <p>You're spending more than you earn this month.</p>
                  </div>
                )}
                {currentSavings >= monthlySavings && (
                  <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-700">
                    <p>Congratulations! You've reached your monthly savings goal!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'budget-calendar':
        return (
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Budget Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-medium text-lg">
                    {new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </h3>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-1">{day}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const firstDay = new Date(year, month - 1, 1);
                    const lastDay = new Date(year, month, 0);
                    const daysInMonth = lastDay.getDate();
                    const startOffset = firstDay.getDay(); // 0 = Sunday
                    
                    // Group transactions by date
                    const transactionsByDate: Record<string, {income: number, expense: number}> = {};
                    transactions
                      .filter(t => t.date.startsWith(selectedMonth))
                      .forEach(t => {
                        const day = t.date.split('-')[2];
                        if (!transactionsByDate[day]) {
                          transactionsByDate[day] = { income: 0, expense: 0 };
                        }
                        if (t.type === 'income') {
                          transactionsByDate[day].income += t.amount;
                        } else {
                          transactionsByDate[day].expense += t.amount;
                        }
                      });
                    
                    const calendarDays = [];
                    
                    // Add empty cells for days before the 1st
                    for (let i = 0; i < startOffset; i++) {
                      calendarDays.push(
                        <div key={`empty-${i}`} className="p-1 h-14 bg-gray-50 rounded opacity-50"></div>
                      );
                    }
                    
                    // Add days of the month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dayStr = String(day).padStart(2, '0');
                      const dayData = transactionsByDate[dayStr];
                      const hasIncome = dayData && dayData.income > 0;
                      const hasExpense = dayData && dayData.expense > 0;
                      const isToday = `${selectedMonth}-${dayStr}` === new Date().toISOString().split('T')[0];
                      
                      calendarDays.push(
                        <div 
                          key={day} 
                          className={`p-1 rounded flex flex-col ${
                            isToday ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{day}</div>
                          <div className="flex-1 flex flex-col justify-center items-center">
                            {hasIncome && (
                              <div className="text-green-600 text-xs">
                                +{formatCurrency(dayData.income)}
                              </div>
                            )}
                            {hasExpense && (
                              <div className="text-red-600 text-xs">
                                -{formatCurrency(dayData.expense)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    return calendarDays;
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        );
        
      default:
        return <div>Unknown widget: {widget.id}</div>;
    }
  };

  // Get visible widgets sorted by order
  const visibleWidgets = useMemo(() => {
    return widgets
      .filter(widget => widget.visible)
      .sort((a, b) => a.order - b.order);
  }, [widgets]);

  // Get hidden widgets
  const hiddenWidgets = useMemo(() => {
    return widgets.filter(widget => !widget.visible);
  }, [widgets]);

  // Error handling
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground">Overview of your financial activity</p>
          </div>
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardContent className="p-4">
              <h3 className="font-medium text-red-800 mb-2">Error Loading Data</h3>
              <p className="text-sm text-red-700">
                There was a problem connecting to the server. Please check your connection or try again later.
              </p>
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                className="mt-4"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">
                Dashboard
              </h1>
              <p className="text-muted-foreground">
                {isCustomizing ? 'Customizing your dashboard - drag widgets to reorder' : 'Overview of your financial activity'}
              </p>
            </div>
            
            {/* Dashboard Customization Controls */}
            <div className="flex gap-2">
              {isCustomizing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={resetToDefault}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button
                    onClick={saveDashboardLayout}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save & Done
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIsCustomizing(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Customize
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Customization Instructions */}
        {isCustomizing && (
          <Card className="border-blue-200 bg-blue-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-800">Dashboard Customization Mode</h3>
                  <p className="text-sm text-blue-700">
                    - Drag widgets to reorder - Use eye icon to show/hide - Change size with dropdown - Save when done
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Spending Alerts Notification */}
        {!isCustomizing && (
          <SpendingAlertsNotification 
            month={selectedMonth} 
            onAlertAction={() => {
              refetch();
            }}
          />
        )}

        {/* Action Buttons and Month Selector */}
        {!isCustomizing && (
          <div className="flex justify-between items-center mb-8">
            {/* Month Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">View Month:</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm min-w-[140px] bg-card"
              >
                {getAvailableMonths().map(month => (
                  <option key={month} value={month}>
                    {new Date(month + '-01').toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowExportImport(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                Export/Import
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowExpenseTracker(true)}
              >
                <Table className="mr-2 h-4 w-4" />
                Expense Tracker
              </Button>
              <Button onClick={() => setShowTransactionForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full inline-block mb-4"></div>
              <p className="text-muted-foreground">Loading your financial data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Customizable Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {visibleWidgets.map((widget) => (
                <CustomizableWidget
                  key={widget.id}
                  widget={widget}
                >
                  {renderWidget(widget)}
                </CustomizableWidget>
              ))}
            </div>

            {/* Hidden Widgets Panel (only in customization mode) */}
            {isCustomizing && hiddenWidgets.length > 0 && (
              <Card className="border-gray-200 bg-gray-50 mb-8">
                <CardHeader>
                  <CardTitle className="text-lg">Hidden Widgets</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Click the eye icon to show these widgets on your dashboard
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {hiddenWidgets.map((widget) => (
                      <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                        <div>
                          <h4 className="font-medium text-sm">{widget.title}</h4>
                          <p className="text-xs text-muted-foreground">Size: {widget.size}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleWidgetVisibility(widget.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Show
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Modals */}
        {showTransactionForm && (
          <TransactionForm
            onClose={handleFormClose}
            onTransactionAdded={handleFormSuccess}
            editingTransaction={editingTransaction}
          />
        )}

        {showAllTransactions && (
          <AllTransactions
            transactions={transactions}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransactionSync}
            onClose={() => setShowAllTransactions(false)}
          />
        )}

        {showExpenseTracker && (
          <ExpenseTrackerView
            isOpen={showExpenseTracker}
            onClose={() => setShowExpenseTracker(false)}
            transactions={transactions}
            expenseLimit={expenseLimit}
            onEdit={(transaction) => {
              setShowExpenseTracker(false);
              setReturnToExpenseTracker(true);
              handleEditTransaction(transaction);
            }}
            onDelete={handleDeleteTransactionSync}
            onAddTransaction={() => {
              setShowExpenseTracker(false);
              setShowTransactionForm(true);
              setReturnToExpenseTracker(true);
            }}
          />
        )}

        {showExportImport && (
          <ExportImportModal
            isOpen={showExportImport}
            onClose={() => setShowExportImport(false)}
            transactions={transactions}
            onImportSuccess={handleImportSuccess}
          />
        )}

        {selectedPanel && !isCustomizing && (
          <PanelDetailsModal
            isOpen={!!selectedPanel}
            onClose={() => setSelectedPanel(null)}
            panelType={selectedPanel}
            transactions={transactions.filter((t: Transaction) => {
              const transactionMonth = t.date.substring(0, 7);
              return transactionMonth === selectedMonth;
            })}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            expenseLimit={expenseLimit}
            monthlySavings={monthlySavings}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;