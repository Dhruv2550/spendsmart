import { API_BASE_URL } from '../config/api';
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Calendar, DollarSign, Save, X, Loader2, Edit, Bell, CheckCircle, AlertCircle, Info, RefreshCw } from "lucide-react";

// Toast notification system
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
    }, notification.duration || 4000);

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
    <div className={`fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${getStyles()}`}>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Toast and optimistic state management
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const categories = {
    Expense: ["Rent", "Groceries", "Shopping", "Dining", "Transportation", "Entertainment", "Utilities", "Healthcare", "Other"],
    Income: ["Salary", "Freelance", "Investment", "Bonus", "Gift", "Other"]
  };

  // Populate form when editing with feedback
  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        type: editingTransaction.type,
        category: editingTransaction.category,
        amount: editingTransaction.amount.toString(),
        date: editingTransaction.date,
        description: editingTransaction.note || ""
      });
      
      addToast({
        type: 'info',
        message: `Editing transaction: ${editingTransaction.note || `${editingTransaction.category} - $${editingTransaction.amount}`}`,
        duration: 3000
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

  // Show browser notification for alerts with enhanced feedback
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

  // Enhanced optimistic submit with comprehensive feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNewAlerts([]);
    setIsSubmitting(true);

    // Validate required fields
    if (!formData.type || !formData.category || !formData.amount) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      addToast({
        type: 'error',
        message: 'Please complete all required fields'
      });
      return;
    }

    // Prepare transaction data
    const transactionData = {
      type: formData.type,
      category: formData.category,
      amount: parseFloat(formData.amount),
      note: formData.description,
      date: formData.date
    };

    const amountFormatted = `$${parseFloat(formData.amount).toLocaleString()}`;
    const isEditing = !!editingTransaction;

    if (isEditing) {
      // EDITING: Enhanced with optimistic feedback
      setLoading(true);
      
      addToast({
        type: 'info',
        message: `Updating ${formData.category} transaction...`,
        duration: 2000
      });

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
        
        // Success feedback
        setSaveSuccess(true);
        addToast({
          type: 'success',
          message: `Transaction updated: ${formData.category} - ${amountFormatted}`
        });
        
        // Handle alerts if any
        if (result.alerts && result.alerts.length > 0) {
          setNewAlerts(result.alerts);
          result.alerts.forEach((alert: SpendingAlert) => {
            showBrowserNotification(alert);
            addToast({
              type: 'info',
              message: `Budget alert: ${alert.message}`,
              duration: 5000
            });
          });
        }

        // Close form after brief success display
        setTimeout(() => {
          onTransactionAdded(); // This triggers refetch and closes form
        }, 1500);
        
      } catch (error) {
        console.error('Error updating transaction:', error);
        setError('Failed to update transaction. Please try again.');
        addToast({
          type: 'error',
          message: 'Failed to update transaction. Please try again.'
        });
      } finally {
        setLoading(false);
        setIsSubmitting(false);
      }
    } else {
      // NEW TRANSACTION: Enhanced optimistic approach
      
      // Immediate success feedback
      setSaveSuccess(true);
      
      // INSTANT UI UPDATE: Close form right away
      setTimeout(() => {
        onTransactionAdded(); // This closes the form immediately and triggers a refetch
      }, 800); // Brief delay to show success state
      
      // BACKGROUND API CALL with enhanced retry logic
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
          
          // Success confirmation toast
          const successToast = {
            type: 'success' as const,
            message: `Transaction saved successfully to database`,
            duration: 3000
          };
          
          // Add toast to current instance if still open, otherwise to global state
          if (document.querySelector('[data-transaction-form]')) {
            addToast(successToast);
          } else {
            // Form is closed, show global notification
            const globalToastId = Math.random().toString(36).substr(2, 9);
            const globalToast = document.createElement('div');
            globalToast.className = `fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 bg-green-50 text-green-800 border-green-200`;
            globalToast.innerHTML = `
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-sm font-medium">Transaction saved successfully</span>
            `;
            document.body.appendChild(globalToast);
            setTimeout(() => {
              if (document.body.contains(globalToast)) {
                document.body.removeChild(globalToast);
              }
            }, 3000);
          }
          
          // Force another refetch after successful save to ensure data is current
          setTimeout(() => {
            onTransactionAdded();
          }, 500);
          
          // Handle alerts silently in background
          if (result.alerts && result.alerts.length > 0) {
            result.alerts.forEach((alert: SpendingAlert) => {
              showBrowserNotification(alert);
              
              // Show alert toast
              const alertToast = {
                type: 'info' as const,
                message: `Budget Alert: ${alert.message}`,
                duration: 5000
              };
              
              if (document.querySelector('[data-transaction-form]')) {
                addToast(alertToast);
              } else {
                // Show global alert notification
                const globalAlertToast = document.createElement('div');
                globalAlertToast.className = `fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 bg-orange-50 text-orange-800 border-orange-200`;
                globalAlertToast.innerHTML = `
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5z"></path>
                  </svg>
                  <span class="text-sm font-medium">Budget Alert: ${alert.message}</span>
                `;
                document.body.appendChild(globalAlertToast);
                setTimeout(() => {
                  if (document.body.contains(globalAlertToast)) {
                    document.body.removeChild(globalAlertToast);
                  }
                }, 5000);
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
            // Final failure - show error
            const errorToast = {
              type: 'error' as const,
              message: 'Failed to save transaction after multiple attempts. Please check your connection.',
              duration: 6000
            };
            
            if (document.querySelector('[data-transaction-form]')) {
              addToast(errorToast);
            } else {
              // Show global error notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('SpendSmart Error', {
                  body: 'Failed to save transaction after multiple attempts. Please check your connection.',
                  icon: '/favicon.ico'
                });
              }
              
              const globalErrorToast = document.createElement('div');
              globalErrorToast.className = `fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 bg-red-50 text-red-800 border-red-200`;
              globalErrorToast.innerHTML = `
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-sm font-medium">Failed to save transaction. Please try again.</span>
              `;
              document.body.appendChild(globalErrorToast);
              setTimeout(() => {
                if (document.body.contains(globalErrorToast)) {
                  document.body.removeChild(globalErrorToast);
                }
              }, 6000);
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
      setIsSubmitting(false);
    }
  };

  // Optimistic input changes with validation feedback
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (error) setError("");
  };

  // Enhanced close handler with confirmation for unsaved changes
  const handleClose = () => {
    const hasChanges = formData.type || formData.category || formData.amount || formData.description;
    
    if (hasChanges && !saveSuccess && !editingTransaction) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
      
      addToast({
        type: 'info',
        message: 'Transaction form closed without saving',
        duration: 2000
      });
    } else {
      addToast({
        type: 'info',
        message: 'Transaction form closed',
        duration: 1500
      });
    }
    
    onClose();
  };

  const isEditing = !!editingTransaction;
  const canSubmit = formData.type && formData.category && formData.amount && !loading && !isSubmitting;

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-0 shadow-xl transition-all duration-300" data-transaction-form>
        {/* Toast notifications */}
        {toasts.map(toast => (
          <Toast key={toast.id} notification={toast} onRemove={removeToast} />
        ))}

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

        {/* Success State Display */}
        {saveSuccess && (
          <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 transition-all duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                {isEditing ? 'Transaction Updated Successfully!' : 'Transaction Added Successfully!'}
              </p>
            </div>
            <p className="text-xs text-green-700 mt-1">
              {isEditing ? 'Changes have been saved.' : 'Saving to database in background...'}
            </p>
          </div>
        )}

        {/* Alert notification */}
        {newAlerts.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200 transition-all duration-300">
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
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 transition-all duration-300">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}

          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">Transaction Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => handleInputChange("type", value)}
              disabled={loading || isSubmitting}
            >
              <SelectTrigger className="border-border/50 focus:border-primary transition-all duration-200 hover:border-primary/50">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Income">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Income
                  </span>
                </SelectItem>
                <SelectItem value="Expense">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
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
              disabled={!formData.type || loading || isSubmitting}
            >
              <SelectTrigger className="border-border/50 focus:border-primary transition-all duration-200 hover:border-primary/50 disabled:opacity-50">
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
                className="pl-10 border-border/50 focus:border-primary transition-all duration-200 hover:border-primary/50"
                disabled={loading || isSubmitting}
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
                className="pl-10 border-border/50 focus:border-primary transition-all duration-200 hover:border-primary/50"
                disabled={loading || isSubmitting}
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
              className="border-border/50 focus:border-primary transition-all duration-200 hover:border-primary/50 resize-none"
              disabled={loading || isSubmitting}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className={`flex-1 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                isEditing 
                  ? 'bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent' 
                  : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary'
              } text-primary-foreground shadow-md disabled:opacity-50`}
              disabled={!canSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Saving...'}
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isEditing ? 'Updated!' : 'Saved!'}
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
              onClick={handleClose}
              className="border-border/50 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
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