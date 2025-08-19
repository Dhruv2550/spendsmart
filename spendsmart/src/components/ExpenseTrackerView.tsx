import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { X, Edit2, Trash2, Plus, Settings, Eye, EyeOff, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
  date: string;
  timestamp: string;
}

interface ExpenseTrackerViewProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
  onAddTransaction: () => void;
  expenseLimit: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContainer = ({ toasts, removeToast }: { 
  toasts: Toast[]; 
  removeToast: (id: number) => void;
}) => (
  <div className="fixed top-4 right-4 z-50 space-y-2">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`max-w-md px-4 py-3 rounded-lg shadow-lg border flex items-center justify-between animate-in slide-in-from-right-full duration-300 ${
          toast.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}
      >
        <div className="flex items-center gap-2">
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="ml-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ))}
  </div>
);

export const ExpenseTrackerView: React.FC<ExpenseTrackerViewProps> = ({
  isOpen,
  onClose,
  transactions,
  onEdit,
  onDelete,
  onAddTransaction,
  expenseLimit
}) => {
  const { userId, isAuthenticated, isLoading } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<Set<number>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const toastIdRef = useRef(0);

  const addToast = (message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const id = ++toastIdRef.current;
    const newToast: Toast = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => removeToast(id), duration);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const optimisticMonthChange = (newMonth: string) => {
    const monthName = new Date(newMonth + '-01').toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    
    setSelectedMonth(newMonth);
    addToast(`Switched to ${monthName} expenses`, 'info', 2000);
  };

  const optimisticColumnToggle = (category: string) => {
    const newHiddenColumns = new Set(hiddenColumns);
    const isCurrentlyHidden = newHiddenColumns.has(category);
    
    if (isCurrentlyHidden) {
      newHiddenColumns.delete(category);
    } else {
      newHiddenColumns.add(category);
    }
    
    setHiddenColumns(newHiddenColumns);
    addToast(
      `${category} column ${isCurrentlyHidden ? 'shown' : 'hidden'}`, 
      'info', 
      2000
    );
  };

  const optimisticShowAllColumns = () => {
    const hiddenCount = hiddenColumns.size;
    setHiddenColumns(new Set());
    
    if (hiddenCount > 0) {
      addToast(`All ${hiddenCount} hidden columns now visible`, 'info', 3000);
    }
  };

  const optimisticDeleteTransaction = (id: number, transaction: Transaction) => {
    if (!isAuthenticated || !userId) {
      addToast('Please log in to delete transactions', 'error');
      return;
    }

    setPendingDeletes(prev => new Set([...prev, id]));
    addToast(
      `Deleted ${transaction.category} expense ($${transaction.amount})`, 
      'success', 
      3000
    );
    
    setTimeout(() => {
      onDelete(id);
      setPendingDeletes(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 500);
  };

  const optimisticEditTransaction = (transaction: Transaction) => {
    if (!isAuthenticated || !userId) {
      addToast('Please log in to edit transactions', 'error');
      return;
    }

    onEdit(transaction);
    addToast(`Editing ${transaction.category} expense`, 'info', 2000);
  };

  const optimisticAddTransaction = () => {
    if (!isAuthenticated || !userId) {
      addToast('Please log in to add transactions', 'error');
      return;
    }

    onAddTransaction();
    addToast('Opening transaction form', 'info', 2000);
  };

  const organizedData = useMemo(() => {
    const monthTransactions = transactions
      .filter(t => {
        const transactionMonth = t.date.substring(0, 7);
        return transactionMonth === selectedMonth && !pendingDeletes.has(t.id);
      });

    const expenseCategories = [
      'Rent', 'Groceries', 'Shopping', 'Dining', 'Transportation', 'Entertainment', 'Utilities', 'Healthcare', 'Other'
    ];

    const categorizedExpenses: Record<string, Transaction[]> = {};
    
    expenseCategories.forEach(category => {
      categorizedExpenses[category] = [];
    });

    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const category = expenseCategories.includes(transaction.category) 
          ? transaction.category 
          : 'Other';
        
        if (!categorizedExpenses[category]) {
          categorizedExpenses[category] = [];
        }
        categorizedExpenses[category].push(transaction);
      });

    const categoryTotals: Record<string, number> = {};
    Object.entries(categorizedExpenses).forEach(([category, transactions]) => {
      categoryTotals[category] = transactions.reduce((sum, t) => sum + t.amount, 0);
    });

    return { categorizedExpenses, categoryTotals };
  }, [transactions, selectedMonth, pendingDeletes]);

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading expense tracker...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isAuthenticated || !userId) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Authentication Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Please log in to view your expense tracker.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getAvailableMonths = () => {
    const months = new Set<string>();
    transactions.forEach(t => {
      months.add(t.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  };

  const visibleCategories = Object.entries(organizedData.categorizedExpenses)
    .filter(([category]) => !hiddenColumns.has(category));

  const visibleTotal = visibleCategories.reduce((sum, [category]) => {
    return sum + organizedData.categoryTotals[category];
  }, 0);

  const CategoryColumn: React.FC<{ 
    category: string; 
    transactions: Transaction[]; 
    total: number;
    color: string;
  }> = ({ category, transactions, total, color }) => (
    <div className="min-w-[160px] border-r border-gray-200 transition-all duration-300 hover:shadow-sm">
      <div className={`${color} text-white p-2 font-medium text-center text-sm border-b transition-all duration-300`}>
        <div>{category}</div>
        <div className="text-xs">{formatCurrency(total)}</div>
      </div>
      
      <div className="space-y-1 p-1">
        {transactions
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((transaction, index) => {
            const isDeleting = pendingDeletes.has(transaction.id);
            
            return (
              <div 
                key={transaction.id}
                className={`text-xs p-1 rounded group transition-all duration-300 ${
                  isDeleting 
                    ? 'bg-red-50 opacity-60' 
                    : index % 2 === 0 
                    ? 'bg-white hover:bg-gray-50' 
                    : 'bg-gray-25 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{transaction.note}</div>
                    <div className="text-gray-500">
                      <span>{formatDate(transaction.date)}</span>
                    </div>
                  </div>
                  <div className="font-medium text-right self-center ml-2 mr-1">
                    {formatCurrency(transaction.amount)}
                  </div>
                  {!isDeleting && isAuthenticated && userId && (
                    <div className="opacity-0 group-hover:opacity-100 flex ml-1 transition-all duration-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => optimisticEditTransaction(transaction)}
                        className="h-5 w-5 p-0 transition-all duration-200 hover:bg-blue-100"
                      >
                        <Edit2 className="h-2 w-2" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => optimisticDeleteTransaction(transaction.id, transaction)}
                        className="h-5 w-5 p-0 text-red-500 transition-all duration-200 hover:bg-red-100"
                      >
                        <Trash2 className="h-2 w-2" />
                      </Button>
                    </div>
                  )}
                  {isDeleting && (
                    <div className="text-xs text-red-600 ml-1">Deleting...</div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  const categoryColors = {
    'Rent': 'bg-red-600',
    'Groceries': 'bg-green-600',
    'Utilities': 'bg-blue-600', 
    'Transportation': 'bg-yellow-600',
    'Entertainment': 'bg-purple-600',
    'Healthcare': 'bg-pink-600',
    'Shopping': 'bg-indigo-600',
    'Dining': 'bg-orange-600',
    'Other': 'bg-gray-600'
  };

  const grandTotal = Object.values(organizedData.categoryTotals).reduce((sum, total) => sum + total, 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Expense Tracker View</span>
              <div className="flex items-center gap-4">
                <select 
                  value={selectedMonth}
                  onChange={(e) => optimisticMonthChange(e.target.value)}
                  className="px-3 py-1 border rounded text-sm transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary"
                  disabled={!isAuthenticated || !userId}
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
                
                <Button 
                  size="sm" 
                  onClick={optimisticAddTransaction}
                  disabled={!isAuthenticated || !userId}
                  className="transition-all duration-200 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Expense
                </Button>
                
                <div className="relative">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowColumnSelector(!showColumnSelector)}
                    disabled={!isAuthenticated || !userId}
                    className="transition-all duration-200 hover:bg-primary/10 disabled:opacity-50"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Columns
                  </Button>
                  
                  {showColumnSelector && isAuthenticated && userId && (
                    <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 min-w-[200px] animate-in fade-in-0 slide-in-from-top-2 duration-200">
                      <div className="text-sm font-medium mb-2">Show/Hide Columns</div>
                      <div className="space-y-2">
                        {Object.keys(organizedData.categorizedExpenses).map(category => (
                          <label 
                            key={category} 
                            className="flex items-center space-x-2 text-sm cursor-pointer transition-all duration-200 hover:bg-gray-50 p-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={!hiddenColumns.has(category)}
                              onChange={() => optimisticColumnToggle(category)}
                              className="w-4 h-4 transition-all duration-200"
                            />
                            <span className="flex items-center">
                              {hiddenColumns.has(category) ? (
                                <EyeOff className="h-3 w-3 mr-1 text-gray-400" />
                              ) : (
                                <Eye className="h-3 w-3 mr-1 text-green-500" />
                              )}
                              {category}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 pt-2 border-t">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={optimisticShowAllColumns}
                          className="text-xs transition-all duration-200"
                        >
                          Show All
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  className="transition-all duration-200 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="bg-gray-100 p-3 rounded-lg mb-4 transition-all duration-300">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Monthly Summary - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</h3>
              <div className="text-right">
                <div className="text-lg font-bold text-red-600 transition-all duration-300">Total: {formatCurrency(visibleTotal)}</div>
                <div className="text-sm text-gray-600">
                  Limit: {formatCurrency(expenseLimit)} - Remaining: <span className={`font-medium ${(expenseLimit - visibleTotal) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(expenseLimit - visibleTotal)}
                  </span>
                </div>
                {hiddenColumns.size > 0 && (
                  <div className="text-xs text-gray-500 mt-1 transition-all duration-300">
                    (Excluding {hiddenColumns.size} hidden column{hiddenColumns.size > 1 ? 's' : ''}: {formatCurrency(grandTotal - visibleTotal)})
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto border rounded-lg">
            <div className="flex w-full">
              {visibleCategories.map(([category, transactions]) => (
                <CategoryColumn
                  key={category}
                  category={category}
                  transactions={transactions}
                  total={organizedData.categoryTotals[category]}
                  color={categoryColors[category as keyof typeof categoryColors] || 'bg-gray-600'}
                />
              ))}
              {visibleCategories.length === 0 && (
                <div className="flex-1 p-8 text-center text-gray-500 transition-all duration-300">
                  <EyeOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">All columns are hidden</p>
                  <p className="text-sm mt-1">Use the "Columns" button to show categories</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t text-sm text-gray-600 transition-all duration-300">
            <div>
              {visibleCategories.reduce((sum, [, transactions]) => sum + transactions.length, 0)} visible transactions this month
              {hiddenColumns.size > 0 && (
                <span className="ml-2 text-gray-400">
                  - {hiddenColumns.size} column{hiddenColumns.size > 1 ? 's' : ''} hidden
                </span>
              )}
              {pendingDeletes.size > 0 && (
                <span className="ml-2 text-red-500">
                  ({pendingDeletes.size} pending deletion)
                </span>
              )}
            </div>
            <div className="font-semibold">
              Visible Total: {formatCurrency(visibleTotal)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};