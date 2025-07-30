// src/components/ExpenseTrackerView.tsx
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { X, Edit2, Trash2, Plus, Settings, Eye, EyeOff } from 'lucide-react';

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

export const ExpenseTrackerView: React.FC<ExpenseTrackerViewProps> = ({
  isOpen,
  onClose,
  transactions,
  onEdit,
  onDelete,
  onAddTransaction,
  expenseLimit
}) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Get unique categories and organize transactions
  const organizedData = useMemo(() => {
    // Filter transactions for selected month
    const monthTransactions = transactions.filter(t => {
      const transactionMonth = t.date.substring(0, 7); // YYYY-MM format
      return transactionMonth === selectedMonth;
    });

    // Separate into categories
    const expenseCategories = [
      'Rent', 'Groceries', 'Shopping', 'Dining', 'Transportation', 'Entertainment', 'Utilities', 'Healthcare', 'Other'
    ];

    const categorizedExpenses: Record<string, Transaction[]> = {};
    
    // Initialize categories
    expenseCategories.forEach(category => {
      categorizedExpenses[category] = [];
    });

    // Add "Other" for any categories not in our predefined list
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

    // Calculate totals for each category
    const categoryTotals: Record<string, number> = {};
    Object.entries(categorizedExpenses).forEach(([category, transactions]) => {
      categoryTotals[category] = transactions.reduce((sum, t) => sum + t.amount, 0);
    });

    return { categorizedExpenses, categoryTotals };
  }, [transactions, selectedMonth]);

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

  const toggleColumnVisibility = (category: string) => {
    const newHiddenColumns = new Set(hiddenColumns);
    if (newHiddenColumns.has(category)) {
      newHiddenColumns.delete(category);
    } else {
      newHiddenColumns.add(category);
    }
    setHiddenColumns(newHiddenColumns);
  };

  const visibleCategories = Object.entries(organizedData.categorizedExpenses)
    .filter(([category]) => !hiddenColumns.has(category));

  // Calculate total only from visible categories
  const visibleTotal = visibleCategories.reduce((sum, [category]) => {
    return sum + organizedData.categoryTotals[category];
  }, 0);

  const CategoryColumn: React.FC<{ 
    category: string; 
    transactions: Transaction[]; 
    total: number;
    color: string;
  }> = ({ category, transactions, total, color }) => (
    <div className="min-w-[160px] border-r border-gray-200">
      {/* Category Header */}
      <div className={`${color} text-white p-2 font-medium text-center text-sm border-b`}>
        <div>{category}</div>
        <div className="text-xs">{formatCurrency(total)}</div>
      </div>
      
      {/* Transactions */}
      <div className="space-y-1 p-1">
        {transactions
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Changed: b.date - a.date for newest first
          .map((transaction, index) => (
            <div 
              key={transaction.id}
              className={`text-xs p-1 rounded group hover:bg-gray-50 ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
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
                <div className="opacity-0 group-hover:opacity-100 flex ml-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(transaction)}
                    className="h-5 w-5 p-0"
                  >
                    <Edit2 className="h-2 w-2" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(transaction.id)}
                    className="h-5 w-5 p-0 text-red-500"
                  >
                    <Trash2 className="h-2 w-2" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Expense Tracker View</span>
            <div className="flex items-center gap-4">
              {/* Month Selector */}
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1 border rounded text-sm"
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
              
              <Button size="sm" onClick={onAddTransaction}>
                <Plus className="h-4 w-4 mr-1" />
                Add Expense
              </Button>
              
              <div className="relative">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Columns
                </Button>
                
                {/* Column Selector Dropdown */}
                {showColumnSelector && (
                  <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
                    <div className="text-sm font-medium mb-2">Show/Hide Columns</div>
                    <div className="space-y-2">
                      {Object.keys(organizedData.categorizedExpenses).map(category => (
                        <label key={category} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!hiddenColumns.has(category)}
                            onChange={() => toggleColumnVisibility(category)}
                            className="w-4 h-4"
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
                        onClick={() => setHiddenColumns(new Set())}
                        className="text-xs"
                      >
                        Show All
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Bar */}
        <div className="bg-gray-100 p-3 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Monthly Summary - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</h3>
            <div className="text-right">
              <div className="text-lg font-bold text-red-600">Total: {formatCurrency(visibleTotal)}</div>
              <div className="text-sm text-gray-600">
                Limit: {formatCurrency(expenseLimit)} • Remaining: {formatCurrency(expenseLimit - visibleTotal)}
              </div>
              {hiddenColumns.size > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  (Excluding {hiddenColumns.size} hidden column{hiddenColumns.size > 1 ? 's' : ''}: {formatCurrency(grandTotal - visibleTotal)})
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expense Tracker Table */}
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
              <div className="flex-1 p-8 text-center text-gray-500">
                <p>All columns are hidden</p>
                <p className="text-sm mt-1">Use the "Columns" button to show categories</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t text-sm text-gray-600">
          <div>
            {visibleCategories.reduce((sum, [, transactions]) => sum + transactions.length, 0)} visible transactions this month
            {hiddenColumns.size > 0 && (
              <span className="ml-2 text-gray-400">
                • {hiddenColumns.size} column{hiddenColumns.size > 1 ? 's' : ''} hidden
              </span>
            )}
          </div>
          <div className="font-semibold">
            Visible Total: {formatCurrency(visibleTotal)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};