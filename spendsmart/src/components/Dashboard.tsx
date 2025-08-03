import React, { useState } from 'react';
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
  Download
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

export const Dashboard: React.FC<DashboardProps> = ({ monthlySavings, expenseLimit }) => {
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<'income' | 'expenses' | 'budget' | 'savings' | null>(null);
  const [returnToAllTransactions, setReturnToAllTransactions] = useState(false);
  const [showExpenseTracker, setShowExpenseTracker] = useState(false);
  const [returnToExpenseTracker, setReturnToExpenseTracker] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  
  // Add month selection state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch transactions from your backend
  const { data: transactions = [], refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: async (): Promise<Transaction[]> => {
      const response = await fetch('http://localhost:3001/api/records');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });

  // Calculate totals with proper error handling - FILTERED BY MONTH
  const totalIncome = React.useMemo(() => {
    return transactions
      .filter((transaction: Transaction) => {
        const transactionMonth = transaction.date.substring(0, 7);
        return transaction.type === 'income' && transactionMonth === selectedMonth;
      })
      .reduce((sum: number, transaction: Transaction) => sum + Number(transaction.amount), 0);
  }, [transactions, selectedMonth]);

  const totalExpenses = React.useMemo(() => {
    return transactions
      .filter((transaction: Transaction) => {
        const transactionMonth = transaction.date.substring(0, 7);
        return transaction.type === 'expense' && transactionMonth === selectedMonth;
      })
      .reduce((sum: number, transaction: Transaction) => sum + Number(transaction.amount), 0);
  }, [transactions, selectedMonth]);

  const currentSavings = totalIncome - totalExpenses;
  const budgetPercentage = expenseLimit > 0 ? Math.min((totalExpenses / expenseLimit) * 100, 100) : 0;

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
      const response = await fetch(`http://localhost:3001/api/records/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        refetch();
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
  const recentTransactions = React.useMemo(() => {
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
    return Array.from(months).sort().reverse();
  };

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
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-0 shadow-md bg-gradient-to-br from-card to-card/95 ${className}`}
      onClick={() => setSelectedPanel(panelType)}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Overview of your financial activity</p>
        </div>

        {/* Spending Alerts Notification */}
        <SpendingAlertsNotification 
          month={selectedMonth} 
          onAlertAction={() => {
            refetch();
          }}
        />

        {/* Action Buttons and Month Selector */}
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
              {/* Always ensure current month is available */}
              {!getAvailableMonths().includes(selectedMonth) && (
                <option value={selectedMonth}>
                  {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </option>
              )}
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

        {/* Stats Cards - Now Clickable */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <ClickableStatCard
            title="Total Income"
            value={formatCurrency(totalIncome)}
            icon={TrendingUp}
            className="border-l-4 border-l-green-500"
            panelType="income"
          />
          
          <ClickableStatCard
            title="Total Expenses"
            value={formatCurrency(totalExpenses)}
            icon={TrendingDown}
            className="border-l-4 border-l-red-500"
            panelType="expenses"
          />
          
          <ClickableStatCard
            title="Limit Status"
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
          
          <ClickableStatCard
            title="Savings"
            value={formatCurrency(currentSavings)}
            icon={DollarSign}
            className={`border-l-4 ${currentSavings >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}
            panelType="savings"
          >
            <p className="text-xs text-muted-foreground">
              Goal: {formatCurrency(monthlySavings)}
            </p>
          </ClickableStatCard>
        </div>

        {/* Recent Transactions and Top Categories */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Transactions */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
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
                  onClick={() => setShowAllTransactions(true)}
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
                        ? "No transactions yet this month. Add your first transaction to get started."
                        : `No transactions found for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`
                      }
                    </p>
                    {selectedMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` && (
                      <Button 
                        className="mt-3" 
                        onClick={() => setShowTransactionForm(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add First Transaction
                      </Button>
                    )}
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
                          {transaction.category} • {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Buttons - hidden by default, show on hover */}
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
                        
                        {/* Amount - always visible */}
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

          {/* Top Expense Categories */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader>
              <CardTitle>Top Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topExpenseCategories.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {selectedMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` 
                        ? "No expense categories yet this month."
                        : `No expenses found for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`
                      }
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
        </div>

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

        {selectedPanel && (
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