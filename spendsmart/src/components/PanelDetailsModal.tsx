import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, TrendingUp, TrendingDown, AlertTriangle, Target, CheckCircle, Info, AlertCircle, Loader2, BarChart3, PieChart, Calculator, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

const Toast: React.FC<{ 
  notification: ToastNotification; 
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(notification.id);
    }, notification.duration || 3500);

    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, onRemove]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success': return 'bg-green-50 text-green-800 border-green-200';
      case 'error': return 'bg-red-50 text-red-800 border-red-200';
      case 'info': return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${getStyles()}`}>
      {getIcon()}
      <span className="text-sm font-medium">{notification.message}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(notification.id)}
        className="ml-2 h-4 w-4 p-0 opacity-70 hover:opacity-100 transition-opacity duration-200"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

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
  const { userId, isAuthenticated, isLoading } = useAuth();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [isExporting, setIsExporting] = useState(false);

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    if (isOpen && panelType && isAuthenticated && userId) {
      setIsContentLoading(true);
      setActiveSection('overview');
      
      const panelTitle = getPanelTitle();
      addToast({
        type: 'info',
        message: `Loading ${panelTitle.toLowerCase()}...`,
        duration: 2000
      });

      const timer = setTimeout(() => {
        setIsContentLoading(false);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isOpen, panelType, isAuthenticated, userId]);

  const handleClose = () => {
    addToast({
      type: 'info',
      message: 'Modal closed',
      duration: 1500
    });
    onClose();
  };

  const handleExport = async () => {
    if (isExporting || !isAuthenticated || !userId) return;
    
    setIsExporting(true);
    const panelTitle = getPanelTitle();
    
    addToast({
      type: 'info',
      message: `Exporting ${panelTitle.toLowerCase()}...`,
      duration: 2000
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      addToast({
        type: 'success',
        message: `${panelTitle} exported successfully!`
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Export failed. Please try again.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSectionChange = (section: string) => {
    if (section === activeSection) return;
    
    setActiveSection(section);
    addToast({
      type: 'info',
      message: `Switched to ${section} view`,
      duration: 2000
    });
  };

  if (!panelType) return null;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto transition-all duration-300">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isAuthenticated || !userId) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md transition-all duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Authentication Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Please log in to view detailed financial information.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const renderIncomeDetails = () => {
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const incomeByCategory = incomeTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-4 transition-all duration-300">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                Income by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(incomeByCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center p-2 rounded-lg transition-all duration-200 hover:bg-green-50">
                  <span className="text-sm">{category}</span>
                  <span className="font-medium text-green-600">{formatCurrency(amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-blue-500" />
                Income Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between p-2 rounded-lg transition-all duration-200 hover:bg-blue-50">
                <span className="text-sm">Total Transactions:</span>
                <span className="font-medium">{incomeTransactions.length}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg transition-all duration-200 hover:bg-blue-50">
                <span className="text-sm">Average Amount:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(incomeTransactions.length > 0 ? totalIncome / incomeTransactions.length : 0)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg transition-all duration-200 hover:bg-blue-50">
                <span className="text-sm">Largest Transaction:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(Math.max(...incomeTransactions.map(t => t.amount), 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <Calculator className="h-4 w-4 mr-2 text-purple-500" />
              Recent Income Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incomeTransactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg transition-all duration-200 hover:bg-green-100 hover:scale-[1.005]">
                  <div>
                    <div className="font-medium text-sm">{transaction.note}</div>
                    <div className="text-xs text-gray-500">{transaction.category} - {formatDate(transaction.date)}</div>
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
      <div className="space-y-4 transition-all duration-300">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
                Expenses by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(expenseByCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center p-2 rounded-lg transition-all duration-200 hover:bg-red-50">
                  <span className="text-sm">{category}</span>
                  <span className="font-medium text-red-600">{formatCurrency(amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-orange-500" />
                Expense Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between p-2 rounded-lg transition-all duration-200 hover:bg-orange-50">
                <span className="text-sm">Total Transactions:</span>
                <span className="font-medium">{expenseTransactions.length}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg transition-all duration-200 hover:bg-orange-50">
                <span className="text-sm">Average Amount:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(expenseTransactions.length > 0 ? totalExpenses / expenseTransactions.length : 0)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg transition-all duration-200 hover:bg-orange-50">
                <span className="text-sm">Largest Expense:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(Math.max(...expenseTransactions.map(t => t.amount), 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <Calculator className="h-4 w-4 mr-2 text-purple-500" />
              Recent Expense Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {expenseTransactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg transition-all duration-200 hover:bg-red-100 hover:scale-[1.005]">
                  <div>
                    <div className="font-medium text-sm">{transaction.note}</div>
                    <div className="text-xs text-gray-500">{transaction.category} - {formatDate(transaction.date)}</div>
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
      <div className="space-y-4 transition-all duration-300">
        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className={`h-4 w-4 mr-2 ${isOverBudget ? 'text-red-500' : 'text-green-500'}`} />
              Budget Status Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Budget Used</span>
                <span className={`font-medium transition-colors duration-200 ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                  {expensePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ease-out ${
                    isOverBudget ? 'bg-red-500' : expensePercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(expensePercentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg transition-all duration-200 hover:bg-blue-100 hover:scale-[1.02]">
                <div className="text-xs text-gray-500">Expense Limit</div>
                <div className="font-bold text-blue-600">{formatCurrency(expenseLimit)}</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg transition-all duration-200 hover:bg-red-100 hover:scale-[1.02]">
                <div className="text-xs text-gray-500">Total Spent</div>
                <div className="font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
              </div>
            </div>

            <div className={`text-center p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
              isOverBudget ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}>
              <div className="text-xs">
                {isOverBudget ? 'Over Budget by' : 'Remaining Budget'}
              </div>
              <div className="font-bold text-lg">
                {formatCurrency(Math.abs(remainingBudget))}
              </div>
            </div>

            {isOverBudget && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-3 transition-all duration-200">
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
      <div className="space-y-4 transition-all duration-300">
        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
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
                <span className={`font-medium transition-colors duration-200 ${isOnTrack ? 'text-green-600' : 'text-gray-900'}`}>
                  {savingsPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ease-out ${
                    isOnTrack ? 'bg-green-500' : savingsPercentage > 50 ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(Math.max(savingsPercentage, 0), 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg transition-all duration-200 hover:bg-blue-100 hover:scale-[1.02]">
                <div className="text-xs text-gray-500">Savings Goal</div>
                <div className="font-bold text-blue-600">{formatCurrency(monthlySavings)}</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg transition-all duration-200 hover:bg-green-100 hover:scale-[1.02]">
                <div className="text-xs text-gray-500">Current Savings</div>
                <div className={`font-bold transition-colors duration-200 ${currentSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(currentSavings)}
                </div>
              </div>
            </div>

            <div className={`text-center p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
              isOnTrack ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}>
              <div className="text-xs">
                {isOnTrack ? 'Goal Exceeded by' : 'Need to Save'}
              </div>
              <div className="font-bold text-lg">
                {formatCurrency(Math.abs(savingsShortfall))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center">
                <PieChart className="h-4 w-4 mr-2 text-purple-500" />
                Savings Breakdown
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm p-2 rounded-lg transition-all duration-200 hover:bg-green-50">
                  <span>Total Income:</span>
                  <span className="text-green-600">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between text-sm p-2 rounded-lg transition-all duration-200 hover:bg-red-50">
                  <span>Total Expenses:</span>
                  <span className="text-red-600">-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between text-sm font-medium p-2 rounded-lg transition-all duration-200 hover:bg-gray-50">
                  <span>Net Savings:</span>
                  <span className={`transition-colors duration-200 ${currentSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(currentSavings)}
                  </span>
                </div>
              </div>
            </div>

            {!isOnTrack && currentSavings >= 0 && (
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 transition-all duration-200">
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
      case 'budget': return 'Budget Status Details';
      case 'savings': return 'Savings Goal Details';
      default: return 'Details';
    }
  };

  const renderContent = () => {
    if (isContentLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading {getPanelTitle().toLowerCase()}...</p>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      );
    }

    switch (panelType) {
      case 'income': return renderIncomeDetails();
      case 'expenses': return renderExpenseDetails();
      case 'budget': return renderBudgetDetails();
      case 'savings': return renderSavingsDetails();
      default: return null;
    }
  };

  return (
    <>
      {toasts.map(toast => (
        <Toast key={toast.id} notification={toast} onRemove={removeToast} />
      ))}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto transition-all duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {panelType === 'income' && <TrendingUp className="h-5 w-5 text-green-500" />}
                {panelType === 'expenses' && <TrendingDown className="h-5 w-5 text-red-500" />}
                {panelType === 'budget' && <Target className="h-5 w-5 text-blue-500" />}
                {panelType === 'savings' && <Target className="h-5 w-5 text-purple-500" />}
                {getPanelTitle()}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="transition-all duration-200 hover:scale-[1.05] hover:shadow-md"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClose}
                  className="transition-all duration-200 hover:scale-[1.05] hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 transition-all duration-300">
            {renderContent()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};