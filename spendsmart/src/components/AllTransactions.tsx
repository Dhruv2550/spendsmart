import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Edit2, Trash2, Search, Filter, X, CheckCircle, AlertCircle } from "lucide-react";
import { useState, useMemo, useRef } from "react";

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
  date: string;
  timestamp: string;
}

interface AllTransactionsProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
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
            <Filter className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="ml-3 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ))}
  </div>
);

const AllTransactions = ({ transactions, onEdit, onDelete, onClose }: AllTransactionsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [pendingDeletes, setPendingDeletes] = useState<Set<number>>(new Set());
  const [undoTimeouts, setUndoTimeouts] = useState<Map<number, number>>(new Map());
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

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(transactions.map(t => t.category))];
    return uniqueCategories.sort();
  }, [transactions]);

  const optimisticFilterChange = (filterFn: () => void, message: string) => {
    filterFn();
  };

  const optimisticSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleOptimisticDelete = (id: number, transaction: Transaction) => {
    setPendingDeletes(prev => new Set([...prev, id]));
    
    addToast(
      `Deleted ${transaction.category} transaction. Undo available for 5 seconds.`, 
      'success', 
      5000
    );

    const timeoutId = setTimeout(() => {
      onDelete(id);
      setPendingDeletes(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setUndoTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }, 5000);

    setUndoTimeouts(prev => new Map([...prev, [id, timeoutId]]));
  };

  const handleUndoDelete = (id: number) => {
    const timeoutId = undoTimeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setPendingDeletes(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setUndoTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      
      const transaction = transactions.find(t => t.id === id);
      addToast(`Restored ${transaction?.category} transaction`, 'info', 2000);
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(t => !pendingDeletes.has(t.id));

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.note.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-old":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount":
          return b.amount - a.amount;
        case "amount-low":
          return a.amount - b.amount;
        case "category":
          return a.category.localeCompare(b.category);
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return filtered;
  }, [transactions, searchTerm, filterType, filterCategory, sortBy, pendingDeletes]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterCategory("all");
    setSortBy("date");
    addToast("All filters cleared", 'info', 2000);
  };

  const activeFilters = searchTerm || filterType !== "all" || filterCategory !== "all" || sortBy !== "date";

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-card border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="text-xl font-semibold">All Transactions</span>
              <span className="text-sm text-muted-foreground">
                {filteredTransactions.length} of {transactions.length - pendingDeletes.size} transactions
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => optimisticSearch(e.target.value)}
                className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <Select value={filterType} onValueChange={(value) => 
              optimisticFilterChange(() => setFilterType(value), `Filtered by ${value === 'all' ? 'all types' : value}`)
            }>
              <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={(value) => 
              optimisticFilterChange(() => setFilterCategory(value), `Filtered by ${value === 'all' ? 'all categories' : value}`)
            }>
              <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => 
              optimisticFilterChange(() => setSortBy(value), `Sorted by ${value}`)
            }>
              <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date (Newest)</SelectItem>
                <SelectItem value="date-old">Date (Oldest)</SelectItem>
                <SelectItem value="amount">Amount (Highest)</SelectItem>
                <SelectItem value="amount-low">Amount (Lowest)</SelectItem>
                <SelectItem value="category">Category (A-Z)</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeFilters && (
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="transition-all duration-200 hover:bg-primary/10"
              >
                <X className="h-3 w-3 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-auto max-h-96">
            {filteredTransactions.length > 0 ? (
              <div className="space-y-2">
                {filteredTransactions.map((transaction) => {
                  const isDeleting = pendingDeletes.has(transaction.id);
                  
                  return (
                    <div
                      key={transaction.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-all duration-300 group border ${
                        isDeleting 
                          ? 'bg-red-50 border-red-200 opacity-60' 
                          : 'bg-muted/20 hover:bg-muted/40 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-income' : 'bg-expense'}`}></div>
                            <span className="font-medium">{transaction.category}</span>
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">{transaction.type}</span>
                        </div>

                        <div className="text-right md:text-left">
                          <span className={`font-semibold ${
                            transaction.type === 'income' ? 'text-income' : 'text-expense'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                          </span>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>

                        <div className="text-sm text-muted-foreground truncate">
                          {transaction.note || "No description"}
                        </div>
                      </div>

                      <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-4">
                        {isDeleting ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUndoDelete(transaction.id)}
                            className="h-8 px-3 text-blue-600 hover:text-blue-700 border-blue-200"
                          >
                            Undo
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onEdit(transaction);
                                addToast(`Editing ${transaction.category} transaction`, 'info', 2000);
                              }}
                              className="h-8 w-8 p-0 transition-all duration-200 hover:bg-blue-50 hover:border-blue-200"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOptimisticDelete(transaction.id, transaction)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive transition-all duration-200 hover:bg-red-50 hover:border-red-200"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No transactions found</p>
                <p className="text-sm">Try adjusting your filters or add some transactions</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Total: {filteredTransactions.length} transactions
              {pendingDeletes.size > 0 && (
                <span className="ml-2 text-red-500">
                  ({pendingDeletes.size} pending deletion)
                </span>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="transition-all duration-200 hover:bg-primary/10"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};

export default AllTransactions;