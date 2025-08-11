import { API_BASE_URL } from '../config/api';
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Calendar, DollarSign, Save, X, Loader2, Edit, Bell } from "lucide-react";

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
  date: string;
  timestamp: string;
}

interface SpendingAlert {
  id: string;
  alert_type: string;
  category: string | null;
  threshold_percentage: number;
  current_amount: number;
  budget_amount: number;
  month: string;
  template_name: string | null;
  message: string;
}

interface TransactionFormProps {
  onClose: () => void;
  onTransactionAdded: () => void;
  editingTransaction?: Transaction | null;
}

export const TransactionForm = ({ onClose, onTransactionAdded, editingTransaction }: TransactionFormProps) => {
  const [formData, setFormData] = useState({
    type: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    description: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newAlerts, setNewAlerts] = useState<SpendingAlert[]>([]);

  const categories = {
    Expense: ["Rent", "Groceries", "Shopping", "Dining", "Transportation", "Entertainment", "Utilities", "Healthcare",  "Other"],
    Income: ["Salary", "Freelance", "Investment", "Bonus", "Gift", "Other"]
  };

  // Populate form when editing
  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        type: editingTransaction.type,
        category: editingTransaction.category,
        amount: editingTransaction.amount.toString(),
        date: editingTransaction.date,
        description: editingTransaction.note || ""
      });
    } else {
      // Reset form for new transaction
      setFormData({
        type: "",
        category: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        description: ""
      });
    }
  }, [editingTransaction]);

  // Show browser notification for alerts
  const showBrowserNotification = (alert: SpendingAlert) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('SpendSmart Budget Alert', {
        body: alert.message,
        icon: '/favicon.ico',
        tag: alert.id
      });
      
      setTimeout(() => notification.close(), 5000);
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setNewAlerts([]);

      // Prepare transaction data
      const transactionData = {
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        note: formData.description,
        date: formData.date
      };

      if (editingTransaction) {
        // EDITING: Keep existing behavior for updates
        setLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/records/${editingTransaction.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(transactionData)
          });

          if (!response.ok) {
            throw new Error('Failed to update transaction');
          }

          const result = await response.json();
          console.log('Transaction updated successfully:', result);
          
          onTransactionAdded(); // This triggers refetch and closes form
          
        } catch (error) {
          console.error('Error updating transaction:', error);
          setError('Failed to update transaction. Please try again.');
        } finally {
          setLoading(false);
        }
    } else {
        // NEW TRANSACTION: IMPROVED OPTIMISTIC APPROACH
        
        // INSTANT UI UPDATE: Close form right away
        onTransactionAdded(); // This closes the form immediately and triggers a refetch
        
        // BACKGROUND API CALL with retry logic
        const saveWithRetry = async (attempts = 0) => {
          try {
            const response = await fetch(`${API_BASE_URL}/api/records`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(transactionData)
            });

            if (!response.ok) {
              throw new Error(`Failed to save transaction: ${response.status}`);
            }

            const result = await response.json();
            console.log('Transaction saved successfully:', result);
            
            // Force another refetch after successful save to ensure data is current
            setTimeout(() => {
              onTransactionAdded();
            }, 500);
            
            // Handle alerts silently in background
            if (result.alerts && result.alerts.length > 0) {
              result.alerts.forEach((alert: any) => {
                if ('Notification' in window && Notification.permission === 'granted') {
                  const notification = new Notification('SpendSmart Budget Alert', {
                    body: alert.message,
                    icon: '/favicon.ico',
                    tag: alert.id
                  });
                  setTimeout(() => notification.close(), 5000);
                }
              });
            }
            
          } catch (error) {
            console.error('Error saving transaction (attempt ' + (attempts + 1) + '):', error);
            
            // Retry up to 2 times
            if (attempts < 2) {
              console.log('Retrying transaction save...');
              setTimeout(() => saveWithRetry(attempts + 1), 1000);
            } else {
              // Final failure - show error and force refetch
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('SpendSmart Error', {
                  body: 'Failed to save transaction after multiple attempts. Please check your connection.',
                  icon: '/favicon.ico'
                });
              }
              
              // Force refetch to get current state from server
              setTimeout(() => {
                onTransactionAdded();
              }, 500);
            }
          }
        };
        
        // Start the save process
        saveWithRetry();
      }
    };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const isEditing = !!editingTransaction;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-0 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            {isEditing ? (
              <>
                <Edit className="h-5 w-5 text-accent" />
                Edit Transaction
              </>
            ) : (
              <>
                <DollarSign className="h-5 w-5 text-primary" />
                Add Transaction
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Show non-blocking alert notification */}
        {newAlerts.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-600" />
              <p className="text-sm font-medium text-orange-800">
                Budget Alert{newAlerts.length > 1 ? 's' : ''} Triggered ({newAlerts.length})
              </p>
            </div>
            <p className="text-xs text-orange-700 mt-1">
              Check the dashboard for details. Alerts will also appear as browser notifications.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success Message for Editing */}
          {isEditing && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-sm text-accent">Editing existing transaction</p>
            </div>
          )}

          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">Transaction Type</Label>
            <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
              <SelectTrigger className="border-border/50 focus:border-primary transition-colors">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Income">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-income"></div>
                    Income
                  </span>
                </SelectItem>
                <SelectItem value="Expense">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-expense"></div>
                    Expense
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => handleInputChange("category", value)}
              disabled={!formData.type}
            >
              <SelectTrigger className="border-border/50 focus:border-primary transition-colors">
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

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                placeholder="0.00"
                className="pl-10 border-border/50 focus:border-primary transition-colors"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className="pl-10 border-border/50 focus:border-primary transition-colors"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Add a note about this transaction..."
              className="border-border/50 focus:border-primary transition-colors resize-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className={`flex-1 ${
                isEditing 
                  ? 'bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent' 
                  : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary'
              } text-primary-foreground shadow-md hover:shadow-success transition-all duration-200`}
              disabled={!formData.type || !formData.category || !formData.amount || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? 'Update Transaction' : 'Save Transaction'}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border/50 hover:bg-muted/50 transition-colors"
              disabled={loading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionForm;