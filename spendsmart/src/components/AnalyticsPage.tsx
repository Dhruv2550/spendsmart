import { API_BASE_URL } from '../config/api';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { TrendingUp, BarChart3, Brain, Calendar, Clock, AlertTriangle, CheckCircle, TrendingDown, Activity, FileText, Download, Printer, Bot } from "lucide-react";
import { useState, useMemo } from "react";
import AIInsightsComponent from "./AIInsightsComponent";

interface AnalyticsPageProps {
  monthlySavings: number;
}

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
  date: string;
  timestamp: string;
}

interface SpendingPattern {
  dayOfWeek: string;
  averageSpending: number;
  transactionCount: number;
  topCategory: string;
}

interface CategoryTrend {
  category: string;
  currentMonth: number;
  previousMonth: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

interface MonthlyTrendData {
  month: string;
  monthLabel: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
}

interface CategoryTrendData {
  month: string;
  monthLabel: string;
  [key: string]: string | number;
}

const AnalyticsPage = ({ monthlySavings }: AnalyticsPageProps) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const previousMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async (): Promise<Transaction[]> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/records`);
        if (!response.ok) throw new Error('Failed to fetch transactions');
        const rawData = await response.json();
        
        const mappedData = rawData.map((transaction: any) => ({
          id: parseInt(transaction.id),
          type: transaction.type.toLowerCase(),
          category: transaction.category,
          amount: Number(transaction.amount),
          note: transaction.note || transaction.category,
          date: transaction.date,
          timestamp: transaction.id
        }));
        
        return mappedData;
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
    },
  });

  const getSelectedMonthTransactions = () => {
    return transactions.filter(t => {
      const transactionMonth = t.date.substring(0, 7);
      return transactionMonth === selectedMonth;
    });
  };

  const getAvailableMonths = () => {
    const months = new Set<string>();
    transactions.forEach(t => {
      months.add(t.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  };

  const getMonthlyTrendData = (): MonthlyTrendData[] => {
    const monthlyData: { [month: string]: MonthlyTrendData } = {};
    
    const allMonths = new Set<string>();
    transactions.forEach(t => {
      allMonths.add(t.date.substring(0, 7));
    });
    
    const sortedMonths = Array.from(allMonths).sort();
    
    sortedMonths.forEach(month => {
      const monthTransactions = transactions.filter(t => t.date.startsWith(month));
      const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      monthlyData[month] = {
        month,
        monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        totalIncome: income,
        totalExpenses: expenses,
        netSavings: income - expenses
      };
    });
    
    return sortedMonths.map(month => monthlyData[month]);
  };

  const getCategoryTrendData = (): CategoryTrendData[] => {
    const monthlyData: { [month: string]: CategoryTrendData } = {};
    
    const allMonths = new Set<string>();
    const allCategories = new Set<string>();
    
    transactions.forEach(t => {
      allMonths.add(t.date.substring(0, 7));
      if (t.type === 'expense') {
        allCategories.add(t.category);
      }
    });
    
    const sortedMonths = Array.from(allMonths).sort();
    const sortedCategories = Array.from(allCategories).sort();
    
    sortedMonths.forEach(month => {
      monthlyData[month] = {
        month,
        monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      };
      
      sortedCategories.forEach(category => {
        monthlyData[month][category] = 0;
      });
    });
    
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const month = t.date.substring(0, 7);
      if (monthlyData[month]) {
        monthlyData[month][t.category] = (monthlyData[month][t.category] as number) + t.amount;
      }
    });
    
    return sortedMonths.map(month => monthlyData[month]);
  };

  const getTopCategories = (limit: number = 6): string[] => {
    const categoryTotals: { [cat: string]: number } = {};
    
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    
    return Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([category]) => category);
  };

  const getFinancialHealthScore = () => {
    const selectedMonthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
    const income = selectedMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = selectedMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const savings = income - expenses;
    
    let score = 0;
    
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    if (savingsRate >= 20) score += 40;
    else if (savingsRate >= 10) score += 30;
    else if (savingsRate >= 5) score += 20;
    else if (savingsRate >= 0) score += 10;
    
    const expenseCategories = [...new Set(selectedMonthTransactions.filter(t => t.type === 'expense').map(t => t.category))];
    if (expenseCategories.length >= 3) score += 20;
    if (savings >= monthlySavings * 0.8) score += 10;
    
    const transactionDays = [...new Set(selectedMonthTransactions.map(t => t.date))];
    if (transactionDays.length >= 15) score += 20;
    else if (transactionDays.length >= 10) score += 15;
    else if (transactionDays.length >= 5) score += 10;
    
    if (income > 0 && expenses > 0) score += 10;
    
    return Math.min(score, 100);
  };

  const getSpendingPatterns = (): SpendingPattern[] => {
    const patterns: { [key: string]: { total: number; count: number; categories: { [cat: string]: number } } } = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    dayNames.forEach(day => {
      patterns[day] = { total: 0, count: 0, categories: {} };
    });
    
    transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(selectedMonth))
      .forEach(transaction => {
        const dayOfWeek = dayNames[new Date(transaction.date).getDay()];
        patterns[dayOfWeek].total += transaction.amount;
        patterns[dayOfWeek].count += 1;
        patterns[dayOfWeek].categories[transaction.category] = (patterns[dayOfWeek].categories[transaction.category] || 0) + transaction.amount;
      });

    return dayNames.map(day => ({
      dayOfWeek: day,
      averageSpending: patterns[day].count > 0 ? patterns[day].total / patterns[day].count : 0,
      transactionCount: patterns[day].count,
      topCategory: Object.entries(patterns[day].categories)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
    }));
  };

  const getCategoryTrends = (): CategoryTrend[] => {
    const selectedMonthExpenses: { [cat: string]: number } = {};
    const previousMonthExpenses: { [cat: string]: number } = {};
    
    transactions.forEach(t => {
      if (t.type === 'expense') {
        if (t.date.startsWith(selectedMonth)) {
          selectedMonthExpenses[t.category] = (selectedMonthExpenses[t.category] || 0) + t.amount;
        } else if (t.date.startsWith(previousMonth)) {
          previousMonthExpenses[t.category] = (previousMonthExpenses[t.category] || 0) + t.amount;
        }
      }
    });

    const allCategories = new Set([...Object.keys(selectedMonthExpenses), ...Object.keys(previousMonthExpenses)]);
    
    return Array.from(allCategories).map(category => {
      const current = selectedMonthExpenses[category] || 0;
      const previous = previousMonthExpenses[category] || 0;
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : (current > 0 ? 100 : 0);
      
      let trend: 'up' | 'down' | 'stable';
      if (Math.abs(changePercent) < 5) {
        trend = 'stable';
      } else if (changePercent > 0) {
        trend = 'up';
      } else {
        trend = 'down';
      }
      
      return {
        category,
        currentMonth: current,
        previousMonth: previous,
        change,
        changePercent,
        trend
      };
    }).sort((a, b) => b.currentMonth - a.currentMonth);
  };

  const getSpendingVelocity = () => {
    const selectedMonthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense');
    const totalExpenses = selectedMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const isCurrentMonth = selectedMonth === currentMonth;
    const [year, month] = selectedMonth.split('-').map(Number);
    const selectedDate = new Date(year, month - 1);
    const currentDay = isCurrentMonth ? new Date().getDate() : new Date(year, month, 0).getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const daysPassed = isCurrentMonth ? currentDay : daysInMonth;
    const dailyBurnRate = daysPassed > 0 ? totalExpenses / daysPassed : 0;
    const projectedMonthlySpend = dailyBurnRate * daysInMonth;
    const budgetBurnRate = monthlySavings > 0 ? (totalExpenses / monthlySavings) * 100 : 0;
    
    return {
      dailyBurnRate,
      projectedMonthlySpend,
      budgetBurnRate,
      daysToSpendBudget: dailyBurnRate > 0 ? monthlySavings / dailyBurnRate : Infinity,
      isCurrentMonth
    };
  };

  const getSpendingHeatmap = () => {
    const heatmapData: { [date: string]: number } = {};
    
    transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(selectedMonth))
      .forEach(t => {
        const date = t.date;
        heatmapData[date] = (heatmapData[date] || 0) + t.amount;
      });
    
    return heatmapData;
  };

  const getSelectedMonthStats = () => {
    const selectedMonthTransactions = getSelectedMonthTransactions();
    
    const thisMonthIncome = selectedMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const thisMonthExpenses = selectedMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const isCurrentMonth = selectedMonth === currentMonth;
    const [year, month] = selectedMonth.split('-').map(Number);
    const currentDay = isCurrentMonth ? new Date().getDate() : new Date(year, month, 0).getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysPassed = isCurrentMonth ? currentDay : daysInMonth;
    const daysRemaining = isCurrentMonth ? daysInMonth - currentDay : 0;
    
    const projectedMonthlyIncome = isCurrentMonth && daysPassed > 0 ? (thisMonthIncome / daysPassed) * daysInMonth : thisMonthIncome;
    const projectedMonthlyExpenses = isCurrentMonth && daysPassed > 0 ? (thisMonthExpenses / daysPassed) * daysInMonth : thisMonthExpenses;
    
    return {
      thisMonthIncome,
      thisMonthExpenses,
      thisMonthNet: thisMonthIncome - thisMonthExpenses,
      averageDailyIncome: daysPassed > 0 ? Math.round(thisMonthIncome / daysPassed) : 0,
      averageDailyExpenses: daysPassed > 0 ? Math.round(thisMonthExpenses / daysPassed) : 0,
      projectedMonthlyIncome: Math.round(projectedMonthlyIncome),
      projectedMonthlyExpenses: Math.round(projectedMonthlyExpenses),
      projectedMonthlySavings: Math.round(projectedMonthlyIncome - projectedMonthlyExpenses),
      daysPassed,
      daysRemaining,
      transactionCount: selectedMonthTransactions.length,
      savingsGoalProgress: monthlySavings > 0 ? ((thisMonthIncome - thisMonthExpenses) / monthlySavings) * 100 : 0,
      isCurrentMonth
    };
  };

  const generateReportHTML = () => {
    const selectedMonthTransactions = getSelectedMonthTransactions();
    const stats = getSelectedMonthStats();
    const healthScore = getFinancialHealthScore();
    const spendingPatterns = getSpendingPatterns();
    const categoryTrends = getCategoryTrends();
    const spendingVelocity = getSpendingVelocity();
    
    const categoryBreakdown = selectedMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const sortedCategories = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SpendSmart Monthly Report - ${monthName}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            background: #fff;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #3b82f6; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .header h1 { 
            color: #1e40af; 
            margin: 0; 
            font-size: 2.5em; 
          }
          .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
          }
          .summary-card { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 20px; 
            text-align: center; 
          }
          .income { color: #059669; }
          .expense { color: #dc2626; }
          .savings { color: #2563eb; }
          .neutral { color: #374151; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SpendSmart Monthly Report</h1>
          <p>Financial Analytics for ${monthName}</p>
        </div>
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total Income</h3>
            <p class="income">$${stats.thisMonthIncome.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h3>Total Expenses</h3>
            <p class="expense">$${stats.thisMonthExpenses.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h3>Net Savings</h3>
            <p class="${stats.thisMonthNet >= 0 ? 'savings' : 'expense'}">$${stats.thisMonthNet.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h3>Health Score</h3>
            <p class="neutral">${healthScore}/100</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const exportReportAsPDF = () => {
    setGeneratingReport(true);
    
    const reportHTML = generateReportHTML();
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    }).replace(' ', '-');
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setGeneratingReport(false);
          setShowReportModal(false);
        }, 500);
      };
    } else {
      setGeneratingReport(false);
      setShowReportModal(false);
    }
  };

  const exportDataAsCSV = () => {
    const selectedMonthTransactions = getSelectedMonthTransactions();
    
    const csvData = [
      ['Date', 'Type', 'Category', 'Amount', 'Description'],
      ...selectedMonthTransactions.map(t => [
        t.date,
        t.type,
        t.category,
        t.amount,
        t.note || ''
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(cell => typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpendSmart-Data-${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowReportModal(false);
  };

  const healthScore = getFinancialHealthScore();
  const spendingPatterns = getSpendingPatterns();
  const categoryTrends = getCategoryTrends();
  const spendingVelocity = getSpendingVelocity();
  const spendingHeatmap = getSpendingHeatmap();
  const selectedMonthStats = getSelectedMonthStats();

  const monthlyTrendData = getMonthlyTrendData();
  const categoryTrendData = getCategoryTrendData();
  const topCategories = getTopCategories();

  const categoryColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-lg">Loading your analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Analytics
          </h1>
          <p className="text-muted-foreground">Deep insights into your spending behavior and financial patterns</p>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Analyze Month:</label>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm min-w-[140px] bg-card"
            >
              {getAvailableMonths().map(month => (
                <option key={month} value={month}>
                  {new Date(month + '-01').toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </option>
              ))}
              {!getAvailableMonths().includes(selectedMonth) && (
                <option value={selectedMonth}>
                  {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </option>
              )}
            </select>
          </div>
          
          <Button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
          >
            <FileText className="h-4 w-4" />
            Generate Monthly Report
          </Button>
        </div>

        {selectedMonth !== currentMonth && (
          <div className="mb-6 text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
            Viewing historical data for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        )}

        <Tabs defaultValue="insights" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="patterns" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Patterns
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })} Health & Insights
              </h2>
              <p className="text-sm text-muted-foreground">
                Financial health analysis and smart recommendations for this month
              </p>
            </div>

            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Financial Health Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className={`text-4xl font-bold mb-2 ${getHealthScoreColor(healthScore).split(' ')[0]}`}>
                      {healthScore}/100
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthScoreColor(healthScore)}`}>
                      {getHealthScoreLabel(healthScore)}
                    </div>
                  </div>
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-200"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${(healthScore / 100) * 251.2} 251.2`}
                        className={healthScore >= 80 ? 'text-green-500' : healthScore >= 60 ? 'text-blue-500' : healthScore >= 40 ? 'text-yellow-500' : 'text-red-500'}
                      />
                    </svg>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Savings Rate:</span>
                      <span className="font-medium">{transactions.filter(t => t.type === 'income' && t.date.startsWith(selectedMonth)).reduce((sum, t) => sum + t.amount, 0) > 0 ? 
                        (((transactions.filter(t => t.type === 'income' && t.date.startsWith(selectedMonth)).reduce((sum, t) => sum + t.amount, 0) - 
                           transactions.filter(t => t.type === 'expense' && t.date.startsWith(selectedMonth)).reduce((sum, t) => sum + t.amount, 0)) / 
                          transactions.filter(t => t.type === 'income' && t.date.startsWith(selectedMonth)).reduce((sum, t) => sum + t.amount, 0)) * 100).toFixed(1) : '0'}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Budget Adherence:</span>
                      <span className="font-medium">{Math.min(100, Math.max(0, ((monthlySavings - Math.max(0, transactions.filter(t => t.type === 'expense' && t.date.startsWith(selectedMonth)).reduce((sum, t) => sum + t.amount, 0) - monthlySavings)) / monthlySavings * 100))).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Spending Diversity:</span>
                      <span className="font-medium">{new Set(transactions.filter(t => t.type === 'expense' && t.date.startsWith(selectedMonth)).map(t => t.category)).size} categories</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transaction Consistency:</span>
                      <span className="font-medium">{new Set(transactions.filter(t => t.date.startsWith(selectedMonth)).map(t => t.date)).size} active days</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle>Smart Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryTrends.slice(0, 3).map(trend => (
                    <div key={trend.category} className={`p-3 rounded-lg ${
                      trend.trend === 'up' ? 'bg-red-50 border border-red-200' : 
                      trend.trend === 'down' ? 'bg-green-50 border border-green-200' : 
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {trend.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : trend.trend === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        ) : (
                          <Activity className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="font-medium text-sm">{trend.category}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {trend.trend === 'up' ? 
                          `Increased by ${Math.abs(trend.changePercent).toFixed(1)}% vs previous month. Consider reducing spending here.` :
                          trend.trend === 'down' ?
                          `Decreased by ${Math.abs(trend.changePercent).toFixed(1)}% vs previous month. Great job controlling this category!` :
                          `Stable spending in this category.`
                        }
                      </p>
                    </div>
                  ))}
                  
                  {categoryTrends.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No category trends available</p>
                      <p className="text-xs">Need data from previous month for comparison</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle>Spending Velocity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">${spendingVelocity.dailyBurnRate.toFixed(0)}</div>
                    <div className="text-sm text-muted-foreground">
                      {spendingVelocity.isCurrentMonth ? 'Current daily spending' : 'Average daily spending'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{spendingVelocity.isCurrentMonth ? 'Projected monthly spend:' : 'Total monthly spend:'}</span>
                      <span className="font-medium">${spendingVelocity.projectedMonthlySpend.toFixed(0)}</span>
                    </div>
                    {spendingVelocity.isCurrentMonth && (
                      <div className="flex justify-between text-sm">
                        <span>Days to spend budget:</span>
                        <span className="font-medium">
                          {spendingVelocity.daysToSpendBudget === Infinity ? 'Unlimited' : Math.round(spendingVelocity.daysToSpendBudget)}
                        </span>
                      </div>
                    )}
                  </div>

                  {spendingVelocity.projectedMonthlySpend > monthlySavings && spendingVelocity.isCurrentMonth && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                        <span className="text-sm font-medium text-yellow-700">
                          Spending too fast! Slow down by ${((spendingVelocity.projectedMonthlySpend - monthlySavings) / (new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate())).toFixed(0)}/day
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })} Spending Patterns
              </h2>
              <p className="text-sm text-muted-foreground">
                Behavioral analysis and spending patterns for this month
              </p>
            </div>

            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
              <CardHeader>
                <CardTitle>Spending Patterns by Day of Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {spendingPatterns.map((pattern, index) => {
                    const maxSpending = Math.max(...spendingPatterns.map(p => p.averageSpending));
                    const barWidth = maxSpending > 0 ? (pattern.averageSpending / maxSpending) * 100 : 0;
                    const isWeekend = pattern.dayOfWeek === 'Saturday' || pattern.dayOfWeek === 'Sunday';
                    
                    return (
                      <div key={pattern.dayOfWeek} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className={`font-medium ${isWeekend ? 'text-purple-600' : ''}`}>
                            {pattern.dayOfWeek}
                          </span>
                          <div className="text-right">
                            <span className="font-medium">${pattern.averageSpending.toFixed(0)}</span>
                            <span className="text-muted-foreground ml-2">({pattern.transactionCount} transactions)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-300 ${
                              isWeekend ? 'bg-purple-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Top category: {pattern.topCategory}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium mb-2">Pattern Insights</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>- Weekend spending: ${spendingPatterns.filter(p => p.dayOfWeek === 'Saturday' || p.dayOfWeek === 'Sunday').reduce((sum, p) => sum + p.averageSpending, 0).toFixed(0)} average</p>
                    <p>- Weekday spending: ${spendingPatterns.filter(p => p.dayOfWeek !== 'Saturday' && p.dayOfWeek !== 'Sunday').reduce((sum, p) => sum + p.averageSpending, 0).toFixed(0)} average</p>
                    <p>- Most active day: {spendingPatterns.reduce((max, p) => p.transactionCount > max.transactionCount ? p : max, spendingPatterns[0])?.dayOfWeek || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
              <CardHeader>
                <CardTitle>Daily Spending Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate() }, (_, i) => {
                    const day = i + 1;
                    const date = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                    const amount = spendingHeatmap[date] || 0;
                    const maxAmount = Math.max(...Object.values(spendingHeatmap));
                    const intensity = maxAmount > 0 ? (amount / maxAmount) : 0;
                    
                    return (
                      <div
                        key={day}
                        className={`aspect-square rounded text-xs flex items-center justify-center font-medium transition-all duration-200 hover:scale-110 ${
                          amount > 0 
                            ? intensity > 0.7 ? 'bg-red-500 text-white' :
                              intensity > 0.4 ? 'bg-red-300 text-red-900' :
                              intensity > 0.1 ? 'bg-red-100 text-red-700' :
                              'bg-red-50 text-red-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                        title={`${day}: $${amount.toFixed(0)}`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                  <span>Less spending</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-gray-100 rounded"></div>
                    <div className="w-3 h-3 bg-red-50 rounded"></div>
                    <div className="w-3 h-3 bg-red-100 rounded"></div>
                    <div className="w-3 h-3 bg-red-300 rounded"></div>
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                  </div>
                  <span>More spending</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Financial Trends Over Time</h2>
              <p className="text-sm text-muted-foreground">
                Track your financial patterns and spending categories across all months
              </p>
            </div>

            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Income vs Expenses Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyTrendData.length >= 2 ? (
                  <div className="h-80">
                    <svg width="100%" height="100%" viewBox="0 0 800 320" className="border rounded">
                      <defs>
                        <pattern id="grid" width="40" height="32" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 32" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.3"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                      
                      {(() => {
                        const maxValue = Math.max(...monthlyTrendData.flatMap(d => [d.totalIncome, d.totalExpenses, Math.abs(d.netSavings)]));
                        const minValue = Math.min(...monthlyTrendData.map(d => d.netSavings));
                        const xStep = 720 / (monthlyTrendData.length - 1);
                        const yScale = 260 / (maxValue - Math.min(minValue, 0));
                        const yOffset = Math.max(-minValue * yScale, 0);
                        
                        const incomePath = monthlyTrendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${40 + i * xStep} ${280 - (d.totalIncome * yScale) + yOffset}`).join(' ');
                        const expensePath = monthlyTrendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${40 + i * xStep} ${280 - (d.totalExpenses * yScale) + yOffset}`).join(' ');
                        const savingsPath = monthlyTrendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${40 + i * xStep} ${280 - (d.netSavings * yScale) + yOffset}`).join(' ');
                        
                        return (
                          <>
                            <path d={incomePath} fill="none" stroke="#10b981" strokeWidth="3" />
                            <path d={expensePath} fill="none" stroke="#ef4444" strokeWidth="3" />
                            <path d={savingsPath} fill="none" stroke="#3b82f6" strokeWidth="3" />
                            
                            {monthlyTrendData.map((d, i) => (
                              <g key={i}>
                                <circle cx={40 + i * xStep} cy={280 - (d.totalIncome * yScale) + yOffset} r="5" fill="#10b981" />
                                <circle cx={40 + i * xStep} cy={280 - (d.totalExpenses * yScale) + yOffset} r="5" fill="#ef4444" />
                                <circle cx={40 + i * xStep} cy={280 - (d.netSavings * yScale) + yOffset} r="5" fill="#3b82f6" />
                              </g>
                            ))}
                            
                            {monthlyTrendData.map((d, i) => (
                              <text key={i} x={40 + i * xStep} y={310} textAnchor="middle" className="text-xs fill-gray-600">
                                {d.monthLabel}
                              </text>
                            ))}
                            
                            {[0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue].map((value, i) => (
                              <text key={i} x="30" y={290 - i * 65} textAnchor="end" className="text-xs fill-gray-600">
                                ${(value / 1000).toFixed(0)}k
                              </text>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                    
                    <div className="flex justify-center gap-6 mt-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-sm">Income</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="text-sm">Expenses</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-sm">Net Savings</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">Need More Data</p>
                      <p className="text-sm">Add transactions for at least 2 months to see trends</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Category Spending Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryTrendData.length >= 2 && topCategories.length > 0 ? (
                  <div className="h-80">
                    <svg width="100%" height="100%" viewBox="0 0 800 320" className="border rounded">
                      <rect width="100%" height="100%" fill="url(#grid)" />
                      
                      {(() => {
                        const maxValue = Math.max(...topCategories.flatMap(cat => 
                          categoryTrendData.map(d => d[cat] as number || 0)
                        ));
                        if (maxValue === 0) return null;
                        
                        const xStep = 720 / (categoryTrendData.length - 1);
                        const yScale = 260 / maxValue;
                        
                        return (
                          <>
                            {topCategories.map((category, catIndex) => {
                              const path = categoryTrendData.map((d, i) => {
                                const value = d[category] as number || 0;
                                return `${i === 0 ? 'M' : 'L'} ${40 + i * xStep} ${280 - (value * yScale)}`;
                              }).join(' ');
                              
                              return (
                                <g key={category}>
                                  <path 
                                    d={path} 
                                    fill="none" 
                                    stroke={categoryColors[catIndex % categoryColors.length]} 
                                    strokeWidth="2.5" 
                                  />
                                  {categoryTrendData.map((d, i) => {
                                    const value = d[category] as number || 0;
                                    return value > 0 ? (
                                      <circle 
                                        key={i}
                                        cx={40 + i * xStep} 
                                        cy={280 - (value * yScale)} 
                                        r="4" 
                                        fill={categoryColors[catIndex % categoryColors.length]} 
                                      />
                                    ) : null;
                                  })}
                                </g>
                              );
                            })}
                            
                            {categoryTrendData.map((d, i) => (
                              <text key={i} x={40 + i * xStep} y={310} textAnchor="middle" className="text-xs fill-gray-600">
                                {d.monthLabel}
                              </text>
                            ))}
                            
                            {[0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue].map((value, i) => (
                              <text key={i} x="30" y={290 - i * 65} textAnchor="end" className="text-xs fill-gray-600">
                                ${(value / 1000).toFixed(0)}k
                              </text>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                    
                    <div className="flex flex-wrap justify-center gap-4 mt-0.5">
                      {topCategories.map((category, index) => (
                        <div key={category} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded" 
                            style={{ backgroundColor: categoryColors[index % categoryColors.length] }}
                          ></div>
                          <span className="text-sm">{category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">Need More Data</p>
                      <p className="text-sm">Add expense transactions across multiple months to see category trends</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle className="text-lg">Trend Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Data Points:</span>
                      <span className="font-medium">{monthlyTrendData.length} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Income:</span>
                      <span className="font-medium text-green-600">
                        ${monthlyTrendData.length > 0 ? 
                          (monthlyTrendData.reduce((sum, m) => sum + m.totalIncome, 0) / monthlyTrendData.length).toFixed(0) : 
                          '0'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Expenses:</span>
                      <span className="font-medium text-red-600">
                        ${monthlyTrendData.length > 0 ? 
                          (monthlyTrendData.reduce((sum, m) => sum + m.totalExpenses, 0) / monthlyTrendData.length).toFixed(0) : 
                          '0'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Savings:</span>
                      <span className="font-medium text-blue-600">
                        ${monthlyTrendData.length > 0 ? 
                          (monthlyTrendData.reduce((sum, m) => sum + m.netSavings, 0) / monthlyTrendData.length).toFixed(0) : 
                          '0'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle className="text-lg">Best Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyTrendData.length > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        const bestSavingsMonth = monthlyTrendData.reduce((best, current) => 
                          current.netSavings > best.netSavings ? current : best
                        );
                        return (
                          <>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {bestSavingsMonth.monthLabel}
                              </div>
                              <div className="text-sm text-muted-foreground">Best Savings Month</div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Savings:</span>
                                <span className="font-medium text-green-600">${bestSavingsMonth.netSavings.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Income:</span>
                                <span className="font-medium">${bestSavingsMonth.totalIncome.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Expenses:</span>
                                <span className="font-medium">${bestSavingsMonth.totalExpenses.toLocaleString()}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle className="text-lg">Category Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  {topCategories.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">Top {Math.min(topCategories.length, 6)}</div>
                        <div className="text-sm text-muted-foreground">Spending Categories</div>
                      </div>
                      <div className="space-y-2">
                        {topCategories.slice(0, 4).map((category, index) => {
                          const totalSpent = transactions
                            .filter(t => t.type === 'expense' && t.category === category)
                            .reduce((sum, t) => sum + t.amount, 0);
                          return (
                            <div key={category} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: categoryColors[index % categoryColors.length] }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{category}</div>
                                <div className="text-xs text-muted-foreground">${totalSpent.toLocaleString()} total</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No category data</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">AI-Powered Financial Insights</h2>
              <p className="text-sm text-muted-foreground">
                Advanced mathematical analysis of your spending patterns with predictions and recommendations
              </p>
            </div>

            <AIInsightsComponent 
              selectedMonth={selectedMonth}
              budgetTemplate="Default"
            />
          </TabsContent>
        </Tabs>

        {showReportModal && (
          <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Export Monthly Report
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-blue-800">
                    {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long' 
                    })} Report
                  </h3>
                  <p className="text-sm text-blue-600 mt-1">
                    Complete financial analysis with insights and recommendations
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={exportReportAsPDF}
                    disabled={generatingReport}
                    className="flex-1"
                  >
                    {generatingReport ? (
                      <>
                        <Printer className="h-4 w-4 mr-2 animate-pulse" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Printer className="h-4 w-4 mr-2" />
                        PDF Report
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportDataAsCSV}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV Data
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;