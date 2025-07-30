import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Edit2, Trash2, Search, Filter, X } from "lucide-react";
import { useState, useMemo } from "react";

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

const AllTransactions = ({ transactions, onEdit, onDelete, onClose }: AllTransactionsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(transactions.map(t => t.category))];
    return uniqueCategories.sort();
  }, [transactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.note.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Filter by category
    if (filterCategory !== "all") {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Sort transactions
    filtered.sort((a, b) => {
    switch (sortBy) {
        case "date":
        return new Date(b.date).getTime() - new Date(a.date).getTime(); // Newest first
        case "date-old":
        return new Date(a.date).getTime() - new Date(b.date).getTime(); // Oldest first
        case "amount":
        return b.amount - a.amount; // Highest first
        case "amount-low":
        return a.amount - b.amount; // Lowest first
        case "category":
        return a.category.localeCompare(b.category); // A-Z
        case "type":
        return a.type.localeCompare(b.type); // Expense, Income
        default:
        return 0;
    }
    });

    return filtered;
  }, [transactions, searchTerm, filterType, filterCategory, sortBy]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-card border-0 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl font-semibold">All Transactions</span>
            <span className="text-sm text-muted-foreground">
              {filteredTransactions.length} of {transactions.length} transactions
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Search */}
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            />
        </div>

        {/* Type Filter */}
        <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
            {filterType === "all" ? "All Types" :
            filterType === "income" ? "Income" :
            filterType === "expense" ? "Expense" : "All Types"}
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger>
            {filterCategory === "all" ? "All Categories" : filterCategory}
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
            </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger>
            {sortBy === "date" ? "Date (Newest)" :
            sortBy === "date-old" ? "Date (Oldest)" :
            sortBy === "amount" ? "Amount (Highest)" :
            sortBy === "amount-low" ? "Amount (Lowest)" :
            sortBy === "category" ? "Category (A-Z)" :
            sortBy === "type" ? "Type" : "Sort by"}
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

        {/* Clear Filters */}
        {(searchTerm || filterType !== "all" || filterCategory !== "all" || sortBy !== "date") && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFilterType("all");
                setFilterCategory("all");
                setSortBy("date");
              }}
            >
              <X className="h-3 w-3 mr-1" />
              Clear Filters
            </Button>
          </div>
        )}

        {/* Transactions List */}
        <div className="flex-1 overflow-auto max-h-96">
          {filteredTransactions.length > 0 ? (
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group border"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center">
                    {/* Type & Category */}
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-income' : 'bg-expense'}`}></div>
                        <span className="font-medium">{transaction.category}</span>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{transaction.type}</span>
                    </div>

                    {/* Amount */}
                    <div className="text-right md:text-left">
                      <span className={`font-semibold ${
                        transaction.type === 'income' ? 'text-income' : 'text-expense'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>

                    {/* Note */}
                    <div className="text-sm text-muted-foreground truncate">
                      {transaction.note || "No description"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(transaction)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(transaction.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No transactions found</p>
              <p className="text-sm">Try adjusting your filters or add some transactions</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Total: {filteredTransactions.length} transactions
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AllTransactions;