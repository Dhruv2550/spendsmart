// src/components/RecurringTransactionsPage.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Switch } from './ui/switch';
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
  Repeat
} from 'lucide-react';

interface RecurringTransaction {
  id: string;
  name: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: boolean;
  last_processed: string | null;
  created_at: string;
}

const RecurringTransactionsPage: React.FC = () => {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const categories = {
    expense: ["Rent", "Groceries", "Shopping", "Dining", "Transportation", "Entertainment", "Utilities", "Healthcare", "Other"],
    income: ["Salary", "Freelance", "Investment", "Bonus", "Gift", "Other"]
  };

  // Load recurring transactions
  const loadRecurringTransactions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/recurring');
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
      const response = await fetch('http://localhost:3001/api/recurring/process', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to process recurring transactions');
      
      const result = await response.json();
      console.log('Processed recurring transactions:', result);
      
      // Reload data
      await loadRecurringTransactions();
      
      // Show success message
      if (result.processed.length > 0) {
        alert(`Successfully processed ${result.processed.length} recurring transactions!`);
      } else {
        alert('No recurring transactions were due for processing.');
      }
    } catch (error) {
      console.error('Error processing recurring transactions:', error);
      alert('Failed to process recurring transactions');
    } finally {
      setProcessing(false);
    }
  };

  // Toggle active status
  const toggleActive = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/recurring/${id}/toggle`, {
        method: 'PATCH'
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
      const response = await fetch(`http://localhost:3001/api/recurring/${id}`, {
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

  const activeTransactions = recurringTransactions.filter(t => t.is_active);
  const inactiveTransactions = recurringTransactions.filter(t => !t.is_active);
  const dueTransactions = activeTransactions.filter(t => getDaysUntilDue(t.next_due_date) <= 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-lg">Loading recurring transactions...</p>
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
            Recurring Transactions
          </h1>
          <p className="text-muted-foreground">Automate your regular income and expenses</p>
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
          
          {dueTransactions.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-yellow-700">
                {dueTransactions.length} transaction{dueTransactions.length > 1 ? 's' : ''} due
              </span>
            </div>
          )}
        </div>

        {/* Overview Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Repeat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTransactions.length}</div>
              <p className="text-xs text-muted-foreground">
                {inactiveTransactions.length} inactive
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Today</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{dueTransactions.length}</div>
              <p className="text-xs text-muted-foreground">
                Need processing
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
                  activeTransactions
                    .filter(t => t.type === 'income' && t.frequency === 'monthly')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                From recurring income
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  activeTransactions
                    .filter(t => t.type === 'expense' && t.frequency === 'monthly')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                From recurring expenses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Recurring Transactions */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Active Recurring Transactions</h2>
          
          {activeTransactions.length > 0 ? (
            <div className="grid gap-4">
              {activeTransactions.map((transaction) => {
                const daysUntilDue = getDaysUntilDue(transaction.next_due_date);
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
                                {formatDate(transaction.next_due_date)}
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
                          
                          {transaction.note && (
                            <p className="text-sm text-muted-foreground mt-2">{transaction.note}</p>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
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
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-orange-500 mr-2" />
                            <span className="text-sm font-medium text-orange-700">
                              This transaction is {isOverdue ? 'overdue' : 'due today'}. 
                              Click "Process Due Now" to create the transaction.
                            </span>
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
                              {formatCurrency(transaction.amount)} • {getFrequencyLabel(transaction.frequency)}
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
        </div>

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

// Recurring Transaction Form Component
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
    note: transaction?.note || '',
    frequency: transaction?.frequency || '',
    start_date: transaction?.start_date || new Date().toISOString().split('T')[0],
    end_date: transaction?.end_date || '',
    is_active: transaction?.is_active ?? true
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
        note: formData.note,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        is_active: formData.is_active
      };

      let response;

      if (transaction) {
        // Update existing
        response = await fetch(`http://localhost:3001/api/recurring/${transaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...recurringData,
            next_due_date: transaction.next_due_date // Preserve next due date when editing
          })
        });
      } else {
        // Create new
        response = await fetch('http://localhost:3001/api/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recurringData)
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

  const handleInputChange = (field: string, value: string | boolean) => {
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
                  <SelectItem value="expense">Expense</SelectItem>
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
            <Label>Note (Optional)</Label>
            <Textarea
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
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
                  {isEditing ? 'Update' : 'Create'} Recurring Transaction
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