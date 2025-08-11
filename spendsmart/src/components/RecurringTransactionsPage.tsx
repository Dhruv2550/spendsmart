// src/components/RecurringTransactionsPage.tsx
import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Clock, 
  Play, 
  Pause,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Repeat,
  Bell,
  CreditCard,
  Home,
  Zap,
  Car,
  Check,
  X
} from 'lucide-react';

interface RecurringTransaction {
  id: string;
  name: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;          // CHANGED: was note
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string | null;
  next_execution: string;       // Already changed
  is_active: boolean;
  last_executed: string | null; // CHANGED: was last_processed
  created_at: string;
  updated_at: string;           // ADD: your API returns this
  execution_count: number;      // ADD: your API returns this
  reminder_days?: number;
}

const RecurringTransactionsPage: React.FC = () => {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedView, setSelectedView] = useState<'all' | 'bills' | 'income'>('all');

  const categories = {
    expense: ["Rent", "Groceries", "Shopping", "Dining", "Transportation", "Entertainment", "Utilities", "Healthcare", "Other"],
    income: ["Salary", "Freelance", "Investment", "Bonus", "Gift", "Other"]
  };

  // Load recurring transactions
  const loadRecurringTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recurring`);
      if (!response.ok) throw new Error('Failed to load recurring transactions');
      const data = await response.json();
      setRecurringTransactions(data);
    } catch (error) {
      console.error('Error loading recurring transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecurringTransactions();
  }, []);

  // Process due recurring transactions manually
  const processRecurringTransactions = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/recurring/execute-due`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to process recurring transactions');
      
      const result = await response.json();
      console.log('Processed recurring transactions:', result);
      
      // Reload data
      await loadRecurringTransactions();
      
      // Show success message
      if (result.executed_count > 0) {
        alert(`Successfully processed ${result.executed_count} recurring transactions!`);
      } else {
        alert(result.message || 'No recurring transactions were due for processing.');
      }
    } catch (error) {
      console.error('Error processing recurring transactions:', error);
      alert('Failed to process recurring transactions');
    } finally {
      setProcessing(false);
    }
  };

// Replace the markAsPaid function with this debug version to see what's happening:

const markAsPaid = async (transaction: RecurringTransaction) => {
  console.log('Starting markAsPaid for:', transaction.name);
  console.log('Current next_execution:', transaction.next_execution);
  
  try {
    // Calculate next due date FIRST to see what we expect
    const nextDueDate = calculateNextDueDate(transaction.next_execution, transaction.frequency);
    console.log('Calculated next due date:', nextDueDate);
    
    // Create the transaction
    console.log('Creating transaction...');
    const response = await fetch(`${API_BASE_URL}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        note: `${transaction.description} (Manually paid: ${transaction.name})`,
        date: new Date().toISOString().split('T')[0]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Transaction creation failed:', errorText);
      throw new Error('Failed to create payment transaction');
    }
    
    const transactionResult = await response.json();
    console.log('Transaction created successfully:', transactionResult);

    // Update the next_execution date
    console.log('Updating next_execution to:', nextDueDate);
    const updateResponse = await fetch(`${API_BASE_URL}/api/recurring/${transaction.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        next_execution: nextDueDate
      })
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      console.error('Update response error:', errorData);
      throw new Error('Failed to update next due date');
    }

    const updateResult = await updateResponse.json();
    console.log('Update result:', updateResult);

    // Reload the data
    console.log('Reloading recurring transactions...');
    await loadRecurringTransactions();
    console.log('Data reloaded');

    alert(`Marked "${transaction.name}" as paid!\n Next due date: ${new Date(nextDueDate).toLocaleDateString()}`);
    
  } catch (error) {
    console.error('Error in markAsPaid:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    alert('Failed to mark as paid: ' + errorMessage);
  }
};

  // Skip this occurrence (just update next due date without creating transaction)
  const skipThisMonth = async (transaction: RecurringTransaction) => {
    if (!window.confirm(`Skip this month's "${transaction.name}"? This will move the due date to next occurrence without creating a transaction.`)) {
      return;
    }

    try {
      const nextDueDate = calculateNextDueDate(transaction.next_execution, transaction.frequency);
      
      const response = await fetch(`${API_BASE_URL}/api/recurring/${transaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transaction,
          next_execution: nextDueDate
        })
      });

      if (!response.ok) throw new Error('Failed to skip transaction');

      await loadRecurringTransactions();
      alert(`Skipped "${transaction.name}" and updated next due date!`);
    } catch (error) {
      console.error('Error skipping transaction:', error);
      alert('Failed to skip transaction');
    }
  };

  // Helper function to calculate next due date
  const calculateNextDueDate = (currentDate: string, frequency: string): string => {
    const date = new Date(currentDate);
    
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    
    return date.toISOString().split('T')[0];
  };

  // Toggle active status
  const toggleActive = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recurring/${id}/toggle`, {
          method: 'PUT'
      });
      
      if (!response.ok) throw new Error('Failed to toggle recurring transaction');
      
      await loadRecurringTransactions();
    } catch (error) {
      console.error('Error toggling recurring transaction:', error);
    }
  };

  // Delete recurring transaction
  const deleteRecurringTransaction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this recurring transaction?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/recurring/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete recurring transaction');
      
      await loadRecurringTransactions();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      weekly: 'Weekly',
      monthly: 'Monthly', 
      quarterly: 'Quarterly',
      yearly: 'Yearly'
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const getDaysUntilDue = (dueDateString: string) => {
    const today = new Date();
    const dueDate = new Date(dueDateString);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: React.ComponentType<any> } = {
      'Rent': Home,
      'Utilities': Zap,
      'Transportation': Car,
      'Healthcare': AlertCircle,
      'Other': DollarSign
    };
    return icons[category] || DollarSign;
  };

  const activeTransactions = recurringTransactions.filter(t => t.is_active);
  const inactiveTransactions = recurringTransactions.filter(t => !t.is_active);
  const bills = activeTransactions.filter(t => t.type === 'expense');
  const incomeTransactions = activeTransactions.filter(t => t.type === 'income');
  
  // Get upcoming bills (next 30 days)
  const upcomingBills = bills.filter(t => {
    const daysUntil = getDaysUntilDue(t.next_execution);
    return daysUntil <= 30 && daysUntil >= -7; // Include overdue bills up to 7 days
  }).sort((a, b) => getDaysUntilDue(a.next_execution) - getDaysUntilDue(b.next_execution));

  const dueTransactions = activeTransactions.filter(t => getDaysUntilDue(t.next_execution) <= 0);
  const dueSoon = activeTransactions.filter(t => {
    const days = getDaysUntilDue(t.next_execution);
    return days > 0 && days <= 7;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-lg">Loading bills and recurring transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Bills & Recurring
          </h1>
          <p className="text-muted-foreground">Manage your bills, recurring transactions, and payment reminders</p>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Recurring Transaction
            </Button>
            <Button 
              variant="outline" 
              onClick={processRecurringTransactions}
              disabled={processing}
            >
              {processing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Process Due Now
                </>
              )}
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            {dueSoon.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-blue-700">
                  {dueSoon.length} due within 7 days
                </span>
              </div>
            )}
            {dueTransactions.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-orange-700">
                  {dueTransactions.length} due now
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bills</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bills.length}</div>
              <p className="text-xs text-muted-foreground">
                {dueTransactions.filter(t => t.type === 'expense').length} due now
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{dueSoon.length}</div>
              <p className="text-xs text-muted-foreground">
                Next 7 days
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Bills</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  bills
                    .filter(t => t.frequency === 'monthly')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Monthly obligations
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  incomeTransactions
                    .filter(t => t.frequency === 'monthly')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Monthly income
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Bills Dashboard */}
        {upcomingBills.length > 0 && (
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Bills (Next 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingBills.map((bill) => {
                  const daysUntilDue = getDaysUntilDue(bill.next_execution);
                  const isDue = daysUntilDue <= 0;
                  const isOverdue = daysUntilDue < 0;
                  const dueSoon = daysUntilDue > 0 && daysUntilDue <= 7;
                  const CategoryIcon = getCategoryIcon(bill.category);

                  return (
                    <div key={bill.id} className={`p-4 rounded-lg border ${
                      isOverdue ? 'border-red-200 bg-red-50' :
                      isDue ? 'border-orange-200 bg-orange-50' :
                      dueSoon ? 'border-blue-200 bg-blue-50' :
                      'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CategoryIcon className={`h-5 w-5 ${
                            isOverdue ? 'text-red-600' :
                            isDue ? 'text-orange-600' :
                            dueSoon ? 'text-blue-600' :
                            'text-gray-600'
                          }`} />
                          <div>
                            <h4 className="font-medium">{bill.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(bill.amount)} - {bill.category} - {getFrequencyLabel(bill.frequency)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`font-medium text-sm ${
                              isOverdue ? 'text-red-600' :
                              isDue ? 'text-orange-600' :
                              dueSoon ? 'text-blue-600' :
                              'text-gray-600'
                            }`}>
                              {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` :
                               isDue ? 'Due today' :
                               daysUntilDue === 1 ? 'Due tomorrow' :
                               `Due in ${daysUntilDue} days`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(bill.next_execution)}
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => markAsPaid(bill)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark Paid
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => skipThisMonth(bill)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Skip
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for different views */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              All Recurring
            </TabsTrigger>
            <TabsTrigger value="bills" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Bills Only
            </TabsTrigger>
            <TabsTrigger value="income" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Income Only
            </TabsTrigger>
          </TabsList>

          {/* All Recurring Transactions */}
          <TabsContent value="all" className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">All Active Recurring Transactions</h2>
              
              {activeTransactions.length > 0 ? (
                <div className="grid gap-4">
                  {activeTransactions.map((transaction) => {
                    const daysUntilDue = getDaysUntilDue(transaction.next_execution);
                    const isDue = daysUntilDue <= 0;
                    const isOverdue = daysUntilDue < 0;

                    return (
                      <Card key={transaction.id} className={`border-0 shadow-md bg-gradient-to-br from-card to-card/95 ${
                        isDue ? 'ring-2 ring-orange-200' : ''
                      }`}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                                <h3 className="font-semibold text-lg">{transaction.name}</h3>
                                <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                                  {getFrequencyLabel(transaction.frequency)}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Category:</span>
                                  <p className="font-medium">{transaction.category}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Amount:</span>
                                  <p className={`font-medium ${
                                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Next Due:</span>
                                  <p className={`font-medium ${
                                    isDue ? 'text-orange-600' : 'text-gray-700'
                                  }`}>
                                    {formatDate(transaction.next_execution)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <p className="font-medium">
                                    {isOverdue ? (
                                      <span className="text-red-600">Overdue</span>
                                    ) : isDue ? (
                                      <span className="text-orange-600">Due Today</span>
                                    ) : (
                                      <span className="text-gray-600">
                                        {daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue} days`}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              
                              {transaction.description && (
                                <p className="text-sm text-muted-foreground mt-2">{transaction.description}</p>
                              )}
                            </div>

                            <div className="flex gap-2 ml-4">
                              {transaction.type === 'expense' && isDue && (
                                <Button
                                  size="sm"
                                  onClick={() => markAsPaid(transaction)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleActive(transaction.id)}
                              >
                                <Pause className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingTransaction(transaction);
                                  setShowForm(true);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteRecurringTransaction(transaction.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {isDue && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 text-orange-500 mr-2" />
                                  <span className="text-sm font-medium text-orange-700">
                                    This {transaction.type} is {isOverdue ? 'overdue' : 'due today'}
                                  </span>
                                </div>
                                {transaction.type === 'expense' && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => markAsPaid(transaction)}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <Check className="h-3 w-3 mr-1" />
                                      Mark Paid
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => skipThisMonth(transaction)}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Skip
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                  <CardContent className="text-center py-12">
                    <Repeat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No recurring transactions yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Set up automatic transactions for bills, salary, and other regular payments
                    </p>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Recurring Transaction
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Bills Only View */}
          <TabsContent value="bills" className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Bills & Expenses</h2>
              
              {bills.length > 0 ? (
                <div className="grid gap-4">
                  {bills.map((bill) => {
                    const daysUntilDue = getDaysUntilDue(bill.next_execution);
                    const isDue = daysUntilDue <= 0;
                    const isOverdue = daysUntilDue < 0;
                    const CategoryIcon = getCategoryIcon(bill.category);

                    return (
                      <Card key={bill.id} className={`border-0 shadow-md bg-gradient-to-br from-card to-card/95 ${
                        isDue ? 'ring-2 ring-orange-200' : ''
                      }`}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4 flex-1">
                              <CategoryIcon className="h-8 w-8 text-red-500" />
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-lg">{bill.name}</h3>
                                  <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded">
                                    {getFrequencyLabel(bill.frequency)}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Amount:</span>
                                    <p className="font-medium text-red-600">
                                      {formatCurrency(bill.amount)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Due Date:</span>
                                    <p className={`font-medium ${
                                      isDue ? 'text-orange-600' : 'text-gray-700'
                                    }`}>
                                      {formatDate(bill.next_execution)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Status:</span>
                                    <p className="font-medium">
                                      {isOverdue ? (
                                        <span className="text-red-600">Overdue</span>
                                      ) : isDue ? (
                                        <span className="text-orange-600">Due Today</span>
                                      ) : (
                                        <span className="text-gray-600">
                                          {daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue} days`}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {isDue && (
                                <Button
                                  size="sm"
                                  onClick={() => markAsPaid(bill)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Mark Paid
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingTransaction(bill);
                                  setShowForm(true);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                  <CardContent className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No bills set up yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your regular bills like rent, utilities, and credit card payments
                    </p>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Bill
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Income Only View */}
          <TabsContent value="income" className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Recurring Income</h2>
              
              {incomeTransactions.length > 0 ? (
                <div className="grid gap-4">
                  {incomeTransactions.map((income) => {
                    const daysUntilDue = getDaysUntilDue(income.next_execution);

                    return (
                      <Card key={income.id} className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4 flex-1">
                              <DollarSign className="h-8 w-8 text-green-500" />
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-lg">{income.name}</h3>
                                  <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                                    {getFrequencyLabel(income.frequency)}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Amount:</span>
                                    <p className="font-medium text-green-600">
                                      +{formatCurrency(income.amount)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Next Expected:</span>
                                    <p className="font-medium text-gray-700">
                                      {formatDate(income.next_execution)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">In:</span>
                                    <p className="font-medium text-gray-600">
                                      {daysUntilDue <= 0 ? 'Available now' :
                                       daysUntilDue === 1 ? 'Tomorrow' :
                                       `${daysUntilDue} days`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingTransaction(income);
                                  setShowForm(true);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                  <CardContent className="text-center py-12">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No recurring income set up</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your regular income like salary, freelance payments, and investments
                    </p>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Recurring Income
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Inactive Transactions */}
        {inactiveTransactions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Inactive Recurring Transactions</h3>
            <div className="grid gap-4">
              {inactiveTransactions.map((transaction) => (
                <Card key={transaction.id} className="border-0 shadow-md bg-gradient-to-br from-gray-50 to-gray-100 opacity-75">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          transaction.type === 'income' ? 'bg-green-300' : 'bg-red-300'
                        }`} />
                        <div>
                          <h4 className="font-medium text-gray-700">{transaction.name}</h4>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(transaction.amount)} - {getFrequencyLabel(transaction.frequency)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive(transaction.id)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTransaction(transaction);
                            setShowForm(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteRecurringTransaction(transaction.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recurring Transaction Form */}
        {showForm && (
          <RecurringTransactionForm
            transaction={editingTransaction}
            onClose={() => {
              setShowForm(false);
              setEditingTransaction(null);
            }}
            onSave={async () => {
              await loadRecurringTransactions();
              setShowForm(false);
              setEditingTransaction(null);
            }}
            categories={categories}
          />
        )}
      </div>
    </div>
  );
};

// Enhanced Recurring Transaction Form Component
interface RecurringTransactionFormProps {
  transaction?: RecurringTransaction | null;
  onClose: () => void;
  onSave: () => void;
  categories: {
    expense: string[];
    income: string[];
  };
}

const RecurringTransactionForm: React.FC<RecurringTransactionFormProps> = ({
  transaction,
  onClose,
  onSave,
  categories
}) => {
  const [formData, setFormData] = useState({
    name: transaction?.name || '',
    type: transaction?.type || '',
    category: transaction?.category || '',
    amount: transaction?.amount?.toString() || '',
    description: transaction?.description || '',
    frequency: transaction?.frequency || '',
    start_date: transaction?.start_date || new Date().toISOString().split('T')[0],
    end_date: transaction?.end_date || '',
    is_active: transaction?.is_active ?? true,
    reminder_days: transaction?.reminder_days || 3
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const recurringData = {
        name: formData.name,
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        reminder_days: parseInt(formData.reminder_days.toString())
      };

      let response;

      if (transaction) {
        // Update existing
        response = await fetch(`${API_BASE_URL}/api/recurring/${transaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...recurringData,
            next_execution: transaction.next_execution // Preserve next due date when editing
          })
        });
        } else {
          // Create new
          response = await fetch(`${API_BASE_URL}/api/recurring`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...recurringData,
              next_execution: formData.start_date // Set next_execution to start_date for new transactions
            })
          });
        }

      if (!response.ok) {
        throw new Error(transaction ? 'Failed to update recurring transaction' : 'Failed to create recurring transaction');
      }

      onSave();
    } catch (error) {
      console.error('Error saving recurring transaction:', error);
      setError('Failed to save recurring transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const isEditing = !!transaction;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Recurring Transaction' : 'Create Recurring Transaction'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Monthly Rent"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Bill/Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange('category', value)}
                disabled={!formData.type}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {formData.type && categories[formData.type as keyof typeof categories]?.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="1200.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={formData.frequency} onValueChange={(value) => handleInputChange('frequency', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Bill Reminder Settings */}
          {formData.type === 'expense' && (
            <div className="space-y-2">
              <Label>Reminder Days Before Due</Label>
              <Select value={formData.reminder_days.toString()} onValueChange={(value) => handleInputChange('reminder_days', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reminder days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day before</SelectItem>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="5">5 days before</SelectItem>
                  <SelectItem value="7">7 days before</SelectItem>
                  <SelectItem value="14">14 days before</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You'll get notifications this many days before the bill is due
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>End Date (Optional)</Label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
              placeholder="Leave empty for no end date"
            />
          </div>

          <div className="space-y-2">
            <Label>description (Optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional details about this recurring transaction..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
            <Label>Transaction is active</Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={!formData.name || !formData.type || !formData.category || !formData.amount || !formData.frequency || loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {isEditing ? 'Update' : 'Create'} {formData.type === 'expense' ? 'Bill' : 'Recurring Transaction'}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecurringTransactionsPage;