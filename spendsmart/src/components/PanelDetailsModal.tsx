// src/components/PanelDetailsModal.tsx - Corrected for your data structure
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
  date: string;
  timestamp: string;
}

interface PanelDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  panelType: 'income' | 'expenses' | 'budget' | 'savings' | null;
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  expenseLimit: number;
  monthlySavings: number;
}

export const PanelDetailsModal: React.FC<PanelDetailsModalProps> = ({
  isOpen,
  onClose,
  panelType,
  transactions,
  totalIncome,
  totalExpenses,
  expenseLimit,
  monthlySavings
}) => {
  if (!panelType) return null;

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const renderIncomeDetails = () => {
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const incomeByCategory = incomeTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                Income by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(incomeByCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm">{category}</span>
                  <span className="font-medium text-green-600">{formatCurrency(amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Income Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Transactions:</span>
                <span className="font-medium">{incomeTransactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Average Amount:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(incomeTransactions.length > 0 ? totalIncome / incomeTransactions.length : 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Largest Transaction:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(Math.max(...incomeTransactions.map(t => t.amount), 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Income Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incomeTransactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{transaction.note}</div>
                    <div className="text-xs text-gray-500">{transaction.category} • {formatDate(transaction.date)}</div>
                  </div>
                  <div className="font-medium text-green-600">{formatCurrency(transaction.amount)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderExpenseDetails = () => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const expenseByCategory = expenseTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
                Expenses by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(expenseByCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm">{category}</span>
                  <span className="font-medium text-red-600">{formatCurrency(amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Expense Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Transactions:</span>
                <span className="font-medium">{expenseTransactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Average Amount:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(expenseTransactions.length > 0 ? totalExpenses / expenseTransactions.length : 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Largest Expense:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(Math.max(...expenseTransactions.map(t => t.amount), 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Expense Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {expenseTransactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{transaction.note}</div>
                    <div className="text-xs text-gray-500">{transaction.category} • {formatDate(transaction.date)}</div>
                  </div>
                  <div className="font-medium text-red-600">{formatCurrency(transaction.amount)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderBudgetDetails = () => {
    const expensePercentage = (totalExpenses / expenseLimit) * 100;
    const remainingBudget = expenseLimit - totalExpenses;
    const isOverBudget = totalExpenses > expenseLimit;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>

          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Budget Used</span>
                <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                  {expensePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    isOverBudget ? 'bg-red-500' : expensePercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(expensePercentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-gray-500">Expense Limit</div>
                <div className="font-bold text-blue-600">{formatCurrency(expenseLimit)}</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-xs text-gray-500">Total Spent</div>
                <div className="font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
              </div>
            </div>

            <div className={`text-center p-3 rounded-lg ${
              isOverBudget ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              <div className="text-xs">
                {isOverBudget ? 'Over Budget by' : 'Remaining Budget'}
              </div>
              <div className="font-bold text-lg">
                {formatCurrency(Math.abs(remainingBudget))}
              </div>
            </div>

            {isOverBudget && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-sm text-red-700 font-medium">Budget Exceeded</span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Consider reviewing your expenses or adjusting your budget limit in Settings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSavingsDetails = () => {
    const currentSavings = totalIncome - totalExpenses;
    const savingsPercentage = (currentSavings / monthlySavings) * 100;
    const savingsShortfall = monthlySavings - currentSavings;
    const isOnTrack = currentSavings >= monthlySavings;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className={`h-4 w-4 mr-2 ${isOnTrack ? 'text-green-500' : 'text-blue-500'}`} />
              Savings Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Goal Progress</span>
                <span className={`font-medium ${isOnTrack ? 'text-green-600' : 'text-gray-900'}`}>
                  {savingsPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    isOnTrack ? 'bg-green-500' : savingsPercentage > 50 ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(Math.max(savingsPercentage, 0), 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-gray-500">Savings Goal</div>
                <div className="font-bold text-blue-600">{formatCurrency(monthlySavings)}</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xs text-gray-500">Current Savings</div>
                <div className={`font-bold ${currentSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(currentSavings)}
                </div>
              </div>
            </div>

            <div className={`text-center p-3 rounded-lg ${
              isOnTrack ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
            }`}>
              <div className="text-xs">
                {isOnTrack ? 'Goal Exceeded by' : 'Need to Save'}
              </div>
              <div className="font-bold text-lg">
                {formatCurrency(Math.abs(savingsShortfall))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Savings Breakdown</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total Income:</span>
                  <span className="text-green-600">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Expenses:</span>
                  <span className="text-red-600">-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between text-sm font-medium">
                  <span>Net Savings:</span>
                  <span className={currentSavings >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(currentSavings)}
                  </span>
                </div>
              </div>
            </div>

            {!isOnTrack && currentSavings >= 0 && (
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-sm text-blue-700 font-medium">Savings Tip</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  You're {formatCurrency(savingsShortfall)} away from your goal. Consider reducing expenses or increasing income.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const getPanelTitle = () => {
    switch (panelType) {
      case 'income': return 'Income Details';
      case 'expenses': return 'Expense Details';
      case 'budget': return 'Limit Status Details';
      case 'savings': return 'Savings Goal Details';
      default: return 'Details';
    }
  };

  const renderContent = () => {
    switch (panelType) {
      case 'income': return renderIncomeDetails();
      case 'expenses': return renderExpenseDetails();
      case 'budget': return renderBudgetDetails();
      case 'savings': return renderSavingsDetails();
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {getPanelTitle()}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};