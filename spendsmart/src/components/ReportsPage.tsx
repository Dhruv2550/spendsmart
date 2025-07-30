import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TrendingUp, PieChart, BarChart3, Calendar } from "lucide-react";
import { useState, useEffect } from "react";

// Add this interface at the top
interface ReportsPageProps {
  monthlySavings: number;
}

// Types for our data
interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
  date: string;
  timestamp: string;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

const ReportsPage = ({ monthlySavings }: ReportsPageProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Load transactions from backend
  const loadTransactions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/records');
      if (!response.ok) {
        throw new Error('Failed to load transactions');
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // Calculate monthly data from real transactions
  const getMonthlyData = (): MonthlyData[] => {
    const monthlyTotals: { [key: string]: { income: number; expenses: number } } = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (transaction.type === 'income') {
        monthlyTotals[monthKey].income += transaction.amount;
      } else {
        monthlyTotals[monthKey].expenses += transaction.amount;
      }
    });

    return Object.entries(monthlyTotals)
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months
  };

  // Calculate category data from real transactions
  const getCategoryData = (): CategoryData[] => {
    const categoryTotals: { [key: string]: number } = {};
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + transaction.amount;
      });

    const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    const colors = ['bg-primary', 'bg-accent', 'bg-warning', 'bg-success', 'bg-destructive', 'bg-muted-foreground'];

    return Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .map(([category, amount], index) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        color: colors[index] || 'bg-muted'
      }));
  };

  // Calculate real statistics
  const getStats = () => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    const thisMonthTransactions = transactions.filter(t => {
      const transactionMonth = new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      return transactionMonth === currentMonth;
    });

    const thisMonthIncome = thisMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const thisMonthExpenses = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const daysInMonth = new Date().getDate(); // Current day of month
    
    return {
      averageDailyIncome: daysInMonth > 0 ? Math.round(thisMonthIncome / daysInMonth) : 0,
      averageDailyExpenses: daysInMonth > 0 ? Math.round(thisMonthExpenses / daysInMonth) : 0,
      dailySavingsRate: daysInMonth > 0 ? Math.round((thisMonthIncome - thisMonthExpenses) / daysInMonth) : 0,
      savingsGoalProgress: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0
    };
  };

  const monthlyData = getMonthlyData();
  const categoryData = getCategoryData();
  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-lg">Loading your reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Reports
          </h1>
          <p className="text-muted-foreground">Analyze your spending patterns and financial trends</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Summary */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Recent Monthly Savings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                {monthlyData.length > 0 ? (
                  <div className="space-y-4">
                    {monthlyData.slice(-3).map((month, index) => {
                      const savingsGoal = monthlySavings; // Now uses the budget from Settings!
                      const actualSavings = month.net;
                      const savingsProgress = Math.max(0, Math.min((actualSavings / savingsGoal) * 100, 100));
                      const isGoalMet = actualSavings >= savingsGoal;
                      
                      return (
                        <div key={month.month} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{month.month}</span>
                            <div className="text-right">
                              <div className="text-sm text-income">+${month.income.toLocaleString()}</div>
                              <div className="text-sm text-expense">-${month.expenses.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                isGoalMet 
                                  ? 'bg-gradient-to-r from-success to-success/90' 
                                  : actualSavings > 0 
                                    ? 'bg-gradient-to-r from-warning to-warning/90'
                                    : 'bg-gradient-to-r from-destructive to-destructive/90'
                              }`}
                              style={{ width: `${savingsProgress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Net: ${month.net.toLocaleString()}</span>
                            <span>Goal: ${savingsGoal.toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-center">
                            {isGoalMet ? (
                              <span className="text-success font-medium">✓ Goal achieved!</span>
                            ) : actualSavings > 0 ? (
                              <span className="text-warning">
                                ${(savingsGoal - actualSavings).toLocaleString()} to goal ({savingsProgress.toFixed(0)}%)
                              </span>
                            ) : (
                              <span className="text-destructive">No savings this month</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No monthly data yet</p>
                    <p className="text-sm">Add some transactions to see monthly trends</p>
                  </div>
                )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle>This Month's Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-income/10 rounded-lg">
                      <span className="text-sm font-medium">Average Daily Income</span>
                      <span className="font-bold text-income">${stats.averageDailyIncome}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-expense/10 rounded-lg">
                      <span className="text-sm font-medium">Average Daily Expenses</span>
                      <span className="font-bold text-expense">${stats.averageDailyExpenses}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                      <span className="text-sm font-medium">Daily Savings Rate</span>
                      <span className="font-bold text-primary">${stats.dailySavingsRate}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                      <span className="text-sm font-medium">Savings Rate</span>
                      <span className="font-bold text-accent">{stats.savingsGoalProgress}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
              <CardHeader>
                <CardTitle>Expense Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Fixed Pie Chart */}
                    <div className="flex items-center justify-center">
                      <div className="relative w-48 h-48">
                        <svg className="w-full h-full" viewBox="0 0 200 200">
                          {categoryData.map((item, index) => {
                            const radius = 80;
                            const centerX = 100;
                            const centerY = 100;
                            const circumference = 2 * Math.PI * radius;
                            
                            // Calculate start angle
                            const startAngle = categoryData
                              .slice(0, index)
                              .reduce((acc, curr) => acc + (curr.percentage / 100) * 360, 0);
                            
                            const endAngle = startAngle + (item.percentage / 100) * 360;
                            
                            // Convert to radians
                            const startAngleRad = (startAngle - 90) * (Math.PI / 180);
                            const endAngleRad = (endAngle - 90) * (Math.PI / 180);
                            
                            const x1 = centerX + radius * Math.cos(startAngleRad);
                            const y1 = centerY + radius * Math.sin(startAngleRad);
                            const x2 = centerX + radius * Math.cos(endAngleRad);
                            const y2 = centerY + radius * Math.sin(endAngleRad);
                            
                            const largeArcFlag = item.percentage > 50 ? 1 : 0;
                            
                            const pathData = [
                              `M ${centerX} ${centerY}`,
                              `L ${x1} ${y1}`,
                              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                              'Z'
                            ].join(' ');
                            
                            const colors = {
                              'bg-primary': '#22c55e',
                              'bg-accent': '#3b82f6', 
                              'bg-warning': '#f59e0b',
                              'bg-success': '#10b981',
                              'bg-destructive': '#ef4444',
                              'bg-muted-foreground': '#6b7280'
                            };
                            
                            return (
                              <path
                                key={item.category}
                                d={pathData}
                                fill={colors[item.color as keyof typeof colors] || '#6b7280'}
                                stroke="#fff"
                                strokeWidth="2"
                                className="transition-all duration-300 hover:opacity-80"
                              />
                            );
                          })}
                        </svg>
                      </div>
                    </div>

                    {/* Category Legend */}
                    <div className="grid grid-cols-2 gap-4">
                      {categoryData.map((item) => (
                        <div key={item.category} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{item.category}</div>
                            <div className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</div>
                          </div>
                          <div className="text-sm font-semibold">${item.amount.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No expense categories yet</p>
                    <p className="text-sm">Add some expense transactions to see category breakdown</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
              <CardHeader>
                <CardTitle>Income vs Expenses Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Simple Bar Chart */}
                    <div className="space-y-4">
                      {monthlyData.map((month) => (
                        <div key={month.month} className="space-y-2">
                          <div className="flex justify-between text-sm font-medium">
                            <span>{month.month}</span>
                            <span>Net: ${month.net.toLocaleString()}</span>
                          </div>
                          <div className="relative">
                            <div className="flex h-8 bg-muted rounded-lg overflow-hidden">
                              <div 
                                className="bg-income flex items-center justify-center text-xs text-white font-medium transition-all duration-500"
                                style={{ width: `${month.income + month.expenses > 0 ? (month.income / (month.income + month.expenses)) * 100 : 50}%` }}
                              >
                                {month.income > 0 && `$${month.income.toLocaleString()}`}
                              </div>
                              <div 
                                className="bg-expense flex items-center justify-center text-xs text-white font-medium transition-all duration-500"
                                style={{ width: `${month.income + month.expenses > 0 ? (month.expenses / (month.income + month.expenses)) * 100 : 50}%` }}
                              >
                                {month.expenses > 0 && `$${month.expenses.toLocaleString()}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Trend Analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center p-4 bg-income/10 rounded-lg">
                        <div className="text-2xl font-bold text-income">
                          {monthlyData.length >= 2 ? 
                            `${((monthlyData[monthlyData.length - 1].income - monthlyData[monthlyData.length - 2].income) / monthlyData[monthlyData.length - 2].income * 100).toFixed(0)}%` 
                            : '0%'}
                        </div>
                        <div className="text-xs text-muted-foreground">Income Growth</div>
                      </div>
                      <div className="text-center p-4 bg-expense/10 rounded-lg">
                        <div className="text-2xl font-bold text-expense">
                          {monthlyData.length >= 2 ? 
                            `${((monthlyData[monthlyData.length - 1].expenses - monthlyData[monthlyData.length - 2].expenses) / monthlyData[monthlyData.length - 2].expenses * 100).toFixed(0)}%` 
                            : '0%'}
                        </div>
                        <div className="text-xs text-muted-foreground">Expense Growth</div>
                      </div>
                      <div className="text-center p-4 bg-success/10 rounded-lg">
                        <div className="text-2xl font-bold text-success">
                          {monthlyData.length >= 2 ? 
                            `${((monthlyData[monthlyData.length - 1].net - monthlyData[monthlyData.length - 2].net) / Math.abs(monthlyData[monthlyData.length - 2].net) * 100).toFixed(0)}%` 
                            : '0%'}
                        </div>
                        <div className="text-xs text-muted-foreground">Savings Growth</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No trend data yet</p>
                    <p className="text-sm">Add transactions over multiple months to see trends</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReportsPage;