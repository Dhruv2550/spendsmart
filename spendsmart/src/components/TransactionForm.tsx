import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Calendar, DollarSign, Save, X, Loader2, Edit } from "lucide-react";

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
  date: string;
  timestamp: string;
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

  const categories = {
    expense: ["Rent", "Groceries", "Shopping", "Dining", "Transportation", "Entertainment", "Utilities", "Healthcare",  "Other"],
    income: ["Salary", "Freelance", "Investment", "Bonus", "Gift", "Other"]
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Prepare data for backend
      const transactionData = {
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        note: formData.description,
        date: formData.date
      };

      let response;

      if (editingTransaction) {
        // Update existing transaction
        response = await fetch(`http://localhost:3001/api/records/${editingTransaction.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData)
        });
      } else {
        // Create new transaction
        response = await fetch('http://localhost:3001/api/records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData)
        });
      }

      if (!response.ok) {
        throw new Error(editingTransaction ? 'Failed to update transaction' : 'Failed to save transaction');
      }

      const savedTransaction = await response.json();
      console.log(`Transaction ${editingTransaction ? 'updated' : 'saved'} successfully:`, savedTransaction);
      
      // Call the callback to refresh data and close form
      onTransactionAdded();
      
    } catch (error) {
      console.error(`Error ${editingTransaction ? 'updating' : 'saving'} transaction:`, error);
      setError(`Failed to ${editingTransaction ? 'update' : 'save'} transaction. Please try again.`);
    } finally {
      setLoading(false);
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
                {formData.type === "income" ? (
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-income"></div>
                    Income
                  </span>
                ) : formData.type === "expense" ? (
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-expense"></div>
                    Expense
                  </span>
                ) : (
                  <SelectValue placeholder="Select type" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-income"></div>
                    Income
                  </span>
                </SelectItem>
                <SelectItem value="expense">
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