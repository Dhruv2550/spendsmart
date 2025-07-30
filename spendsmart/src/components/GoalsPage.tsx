import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Loader2,
  Home,
  GraduationCap,
  Car,
  Plane,
  Baby,
  Heart,
  Briefcase,
  PiggyBank,
  Calculator,
  TrendingDown,
  Clock,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

// Goal types
interface InvestmentGoal {
  id: number;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: 'low' | 'medium' | 'high';
  category: 'house' | 'education' | 'car' | 'vacation' | 'wedding' | 'baby' | 'business' | 'retirement' | 'emergency' | 'other';
  monthlyContribution: number;
  isActive: boolean;
  createdDate: string;
}

// Goal Contribution Tracking
interface InvestmentContribution {
  id: number;
  goalId: number;
  amount: number;
  date: string;
  source: 'manual' | 'auto' | 'bonus' | 'saved_expense';
  note?: string;
}

const InvestmentsPage: React.FC = () => {
  const [goals, setGoals] = useState<InvestmentGoal[]>([]);
  const [contributions, setContributions] = useState<InvestmentContribution[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddContribution, setShowAddContribution] = useState(false);
  const [editingGoal, setEditingGoal] = useState<InvestmentGoal | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCompletedGoals, setShowCompletedGoals] = useState(false);
  const [currentSavings, setCurrentSavings] = useState(0);

  // Load current savings from Dashboard data
  useEffect(() => {
    const fetchCurrentSavings = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/records');
        if (response.ok) {
          const transactions = await response.json();
          const totalIncome = transactions
            .filter((t: any) => t.type === 'income')
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
          const totalExpenses = transactions
            .filter((t: any) => t.type === 'expense')
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
          
          setCurrentSavings(totalIncome - totalExpenses);
        }
      } catch (error) {
        console.error('Error fetching current savings:', error);
      }
    };

    fetchCurrentSavings();
  }, []);

  // Load data from localStorage
  useEffect(() => {
    const savedGoals = localStorage.getItem('spendsmart_financial_goals');
    const savedContributions = localStorage.getItem('spendsmart_goal_contributions');
    
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
    if (savedContributions) {
      setContributions(JSON.parse(savedContributions));
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (goals.length > 0) {
      localStorage.setItem('spendsmart_financial_goals', JSON.stringify(goals));
    }
  }, [goals]);

  useEffect(() => {
    if (contributions.length > 0) {
      localStorage.setItem('spendsmart_goal_contributions', JSON.stringify(contributions));
    }
  }, [contributions]);

  // Calculate goal metrics
  const goalMetrics = useMemo(() => {
    const activeGoals = goals.filter(g => g.isActive && g.currentAmount < g.targetAmount);
    const totalTargetAmount = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrentAmount = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalMonthlyContribution = activeGoals.reduce((sum, g) => sum + g.monthlyContribution, 0);
    const achievedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length;

    return {
      totalGoals: activeGoals.length,
      achievedGoals,
      totalTargetAmount,
      totalCurrentAmount,
      totalMonthlyContribution,
      overallProgress: totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0
    };
  }, [goals]);

  const formatCurrency = (amount: number) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const getCategoryIcon = (category: InvestmentGoal['category']) => {
    const icons = {
      house: Home,
      education: GraduationCap,
      car: Car,
      vacation: Plane,
      wedding: Heart,
      baby: Baby,
      business: Briefcase,
      retirement: PiggyBank,
      emergency: AlertCircle,
      other: Target
    };
    return icons[category] || Target;
  };

  const getPriorityColor = (priority: InvestmentGoal['priority']) => {
    const colors = {
      low: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[priority];
  };

  // Calculate time-based insights for a goal
  const getGoalInsights = (goal: InvestmentGoal) => {
    const today = new Date();
    const targetDate = new Date(goal.targetDate);
    const monthsRemaining = Math.max(0, Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const requiredMonthlyContribution = monthsRemaining > 0 ? remainingAmount / monthsRemaining : 0;
    const isOnTrack = goal.monthlyContribution >= requiredMonthlyContribution;
    const projectedAmount = goal.currentAmount + (goal.monthlyContribution * monthsRemaining);
    const projectedShortfall = Math.max(0, goal.targetAmount - projectedAmount);

    return {
      monthsRemaining,
      remainingAmount,
      requiredMonthlyContribution,
      isOnTrack,
      projectedAmount,
      projectedShortfall,
      progressPercentage: (goal.currentAmount / goal.targetAmount) * 100
    };
  };

  // Goal Form Component
  const GoalForm: React.FC<{
    goal?: InvestmentGoal | null;
    onClose: () => void;
    onSave: (goal: Omit<InvestmentGoal, 'id'>) => void;
  }> = ({ goal, onClose, onSave }) => {
    const [formData, setFormData] = useState({
      name: goal?.name || '',
      description: goal?.description || '',
      targetAmount: goal?.targetAmount?.toString() || '',
      currentAmount: goal?.currentAmount?.toString() || '0',
      targetDate: goal?.targetDate || '',
      priority: goal?.priority || 'medium' as InvestmentGoal['priority'],
      category: goal?.category || 'other' as InvestmentGoal['category'],
      monthlyContribution: goal?.monthlyContribution?.toString() || '',
      isActive: goal?.isActive ?? true
    });

    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);

      try {
        const goalData = {
          name: formData.name,
          description: formData.description,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount),
          targetDate: formData.targetDate,
          priority: formData.priority,
          category: formData.category,
          monthlyContribution: parseFloat(formData.monthlyContribution),
          isActive: formData.isActive,
          createdDate: goal?.createdDate || new Date().toISOString()
        };

        await new Promise(resolve => setTimeout(resolve, 500));
        onSave(goalData);
        onClose();
      } catch (error) {
        console.error('Error saving goal:', error);
      } finally {
        setSaving(false);
      }
    };

    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {goal ? 'Edit Financial Goal' : 'Create New Financial Goal'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goal Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="House Down Payment"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as InvestmentGoal['category'] }))}>
                  <SelectTrigger>
                    {formData.category ? (
                      <span className="flex items-center">
                        {formData.category === 'house' && '🏠 House/Real Estate'}
                        {formData.category === 'education' && '🎓 Education'}
                        {formData.category === 'car' && '🚗 Vehicle'}
                        {formData.category === 'vacation' && '✈️ Vacation/Travel'}
                        {formData.category === 'wedding' && '💍 Wedding'}
                        {formData.category === 'baby' && '👶 Baby/Family'}
                        {formData.category === 'business' && '💼 Business/Startup'}
                        {formData.category === 'retirement' && '🏦 Retirement'}
                        {formData.category === 'emergency' && '🚨 Emergency Fund'}
                        {formData.category === 'other' && '🎯 Other'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select a category</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">🏠 House/Real Estate</SelectItem>
                    <SelectItem value="education">🎓 Education</SelectItem>
                    <SelectItem value="car">🚗 Vehicle</SelectItem>
                    <SelectItem value="vacation">✈️ Vacation/Travel</SelectItem>
                    <SelectItem value="wedding">💍 Wedding</SelectItem>
                    <SelectItem value="baby">👶 Baby/Family</SelectItem>
                    <SelectItem value="business">💼 Business/Startup</SelectItem>
                    <SelectItem value="retirement">🏦 Retirement</SelectItem>
                    <SelectItem value="emergency">🚨 Emergency Fund</SelectItem>
                    <SelectItem value="other">🎯 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="20% down payment for first home purchase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                  placeholder="100000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Current Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentAmount: e.target.value }))}
                  placeholder="15000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Contribution</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monthlyContribution}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyContribution: e.target.value }))}
                  placeholder="1000"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as InvestmentGoal['priority'] }))}>
                <SelectTrigger>
                  {formData.priority ? (
                    <span className="capitalize">{formData.priority} Priority</span>
                  ) : (
                    <span className="text-muted-foreground">Select priority</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="isActive">Goal is active</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {goal ? 'Update' : 'Create'} Goal
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  // Contribution Form Component
  const ContributionForm: React.FC<{
    goalId: number;
    onClose: () => void;
    onSave: (contribution: Omit<InvestmentContribution, 'id'>) => void;
  }> = ({ goalId, onClose, onSave }) => {
    const [formData, setFormData] = useState({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      source: 'manual' as InvestmentContribution['source'],
      note: ''
    });

    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);

      try {
        const contributionData = {
          goalId,
          amount: parseFloat(formData.amount),
          date: formData.date,
          source: formData.source,
          note: formData.note
        };

        await new Promise(resolve => setTimeout(resolve, 300));
        onSave(contributionData);
        onClose();
      } catch (error) {
        console.error('Error saving contribution:', error);
      } finally {
        setSaving(false);
      }
    };

    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="500.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={formData.source} onValueChange={(value) => setFormData(prev => ({ ...prev, source: value as InvestmentContribution['source'] }))}>
                <SelectTrigger>
                  {formData.source ? (
                    <span>
                      {formData.source === 'manual' && 'Manual Contribution'}
                      {formData.source === 'auto' && 'Automatic Investment'}
                      {formData.source === 'bonus' && 'Bonus/Windfall'}
                      {formData.source === 'saved_expense' && 'Saved from Reduced Spending'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select source</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Contribution</SelectItem>
                  <SelectItem value="auto">Automatic Investment</SelectItem>
                  <SelectItem value="bonus">Bonus/Windfall</SelectItem>
                  <SelectItem value="saved_expense">Saved from Reduced Spending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Input
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Tax refund money"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contribution
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  const handleAddGoal = (goalData: Omit<InvestmentGoal, 'id'>) => {
    const newGoal = {
      ...goalData,
      id: Math.max(...goals.map(g => g.id), 0) + 1
    };
    setGoals(prev => [...prev, newGoal]);
  };

  const handleEditGoal = (goalData: Omit<InvestmentGoal, 'id'>) => {
    if (editingGoal) {
      setGoals(prev => prev.map(goal => 
        goal.id === editingGoal.id 
          ? { ...goalData, id: editingGoal.id }
          : goal
      ));
      setEditingGoal(null);
    }
  };

  const handleDeleteGoal = (id: number) => {
    if (window.confirm('Are you sure you want to delete this goal? All associated contributions will also be deleted.')) {
      setGoals(prev => prev.filter(goal => goal.id !== id));
      setContributions(prev => prev.filter(contrib => contrib.goalId !== id));
    }
  };

  const handleAddContribution = (contributionData: Omit<InvestmentContribution, 'id'>) => {
    const newContribution = {
      ...contributionData,
      id: Math.max(...contributions.map(c => c.id), 0) + 1
    };
    setContributions(prev => [...prev, newContribution]);
    
    // Update the goal's current amount
    setGoals(prev => prev.map(goal => 
      goal.id === contributionData.goalId 
        ? { ...goal, currentAmount: goal.currentAmount + contributionData.amount }
        : goal
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-lg">Loading your financial goals...</p>
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
            Goals
          </h1>
          <p className="text-muted-foreground">Plan and track progress toward your life goals</p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goalMetrics.totalGoals}</div>
              <p className="text-xs text-muted-foreground">
                {goalMetrics.achievedGoals} achieved
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Target</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(goalMetrics.totalTargetAmount)}</div>
              <p className="text-xs text-muted-foreground">
                Across all goals
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goalMetrics.overallProgress.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(goalMetrics.totalCurrentAmount)} saved
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Commitment</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(goalMetrics.totalMonthlyContribution)}</div>
              <p className="text-xs text-muted-foreground">
                Goal contributions
              </p>
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Current Savings:</span>
                  <span className={`font-medium ${currentSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(currentSavings)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="goals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="goals">My Goals</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Goals</h2>
              <Button onClick={() => setShowAddGoal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Goal
              </Button>
            </div>

            <div className="grid gap-4">
              {goals.filter(g => g.isActive && g.currentAmount < g.targetAmount).map((goal) => {
                const insights = getGoalInsights(goal);
                const CategoryIcon = getCategoryIcon(goal.category);

                return (
                  <Card key={goal.id} className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <CategoryIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{goal.name}</h3>
                            <p className="text-sm text-muted-foreground">{goal.description}</p>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(goal.priority)}`}>
                                {goal.priority} priority
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedGoalId(goal.id);
                              setShowAddContribution(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add $
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingGoal(goal);
                              setShowAddGoal(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress Section */}
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span>Progress: {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                          <span className="font-medium">{insights.progressPercentage.toFixed(1)}%</span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-300 ${
                              insights.progressPercentage >= 100 ? 'bg-green-500' : 
                              insights.isOnTrack ? 'bg-blue-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.min(insights.progressPercentage, 100)}%` }}
                          />
                        </div>

                        {/* Goal Insights */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Time Left</p>
                            <p className="font-medium flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {insights.monthsRemaining} months
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Need to Save</p>
                            <p className="font-medium">{formatCurrency(insights.remainingAmount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Required Monthly</p>
                            <p className={`font-medium ${insights.isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(insights.requiredMonthlyContribution)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Your Monthly</p>
                            <p className="font-medium">{formatCurrency(goal.monthlyContribution)}</p>
                          </div>
                        </div>

                        {/* Status Alert */}
                        {!insights.isOnTrack ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center">
                              <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                              <span className="text-sm font-medium text-yellow-700">
                                Behind target - increase monthly contribution by {formatCurrency(insights.requiredMonthlyContribution - goal.monthlyContribution)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center">
                              <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
                              <span className="text-sm font-medium text-blue-700">
                                On track! Projected to reach {formatCurrency(insights.projectedAmount)} by target date
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {goals.filter(g => g.isActive && g.currentAmount < g.targetAmount).length === 0 && (
                <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                  <CardContent className="text-center py-12">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No active goals yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first goal to start planning your financial future
                    </p>
                    <Button onClick={() => setShowAddGoal(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Goal
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Completed Goals Section */}
            {goals.filter(g => g.currentAmount >= g.targetAmount).length > 0 && (
              <div className="mt-8">
                <Button
                  variant="ghost"
                  onClick={() => setShowCompletedGoals(!showCompletedGoals)}
                  className="mb-4 p-0 h-auto font-medium text-left"
                >
                  {showCompletedGoals ? (
                    <ChevronDown className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  Completed Goals ({goals.filter(g => g.currentAmount >= g.targetAmount).length})
                </Button>

                {showCompletedGoals && (
                  <div className="grid gap-4">
                    {goals.filter(g => g.currentAmount >= g.targetAmount).map((goal) => {
                      const CategoryIcon = getCategoryIcon(goal.category);
                      const progressPercentage = (goal.currentAmount / goal.targetAmount) * 100;

                      return (
                        <Card key={goal.id} className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 opacity-75">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/20">
                                  <CategoryIcon className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg text-green-800">{goal.name}</h3>
                                  <p className="text-sm text-green-700">{goal.description}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-xs text-green-600 font-medium">Completed!</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingGoal(goal);
                                    setShowAddGoal(true);
                                  }}
                                  className="border-green-300 text-green-700 hover:bg-green-100"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteGoal(goal.id)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-green-700">Final Amount: {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                                <span className="font-medium text-green-600">{progressPercentage.toFixed(1)}%</span>
                              </div>
                              
                              <div className="w-full bg-green-200 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full bg-green-500 transition-all duration-300"
                                  style={{ width: '100%' }}
                                />
                              </div>

                              <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                  <span className="text-sm font-medium text-green-700">
                                    Goal achieved! You saved {formatCurrency(goal.currentAmount - goal.targetAmount)} extra.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Goal Planner Tab */}
          <TabsContent value="planner" className="space-y-6">
            <h2 className="text-xl font-semibold">Smart Goal Planning</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Goal Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Use this calculator to determine how much you need to save monthly for any goal.
                    </p>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Quick Tip:</strong> The 50/30/20 rule suggests allocating 20% of income to savings and investments. 
                        If you earn $5,000/month, that's $1,000 for all your investment goals combined.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Goal Prioritization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Recommended goal priority order:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center font-bold">1</span>
                        <span>Emergency Fund (3-6 months expenses)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 text-xs flex items-center justify-center font-bold">2</span>
                        <span>High-interest debt payoff</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">3</span>
                        <span>Retirement (401k match)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center font-bold">4</span>
                        <span>Other goals (house, car, etc.)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-xl font-semibold">Goal Analytics</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Goal Distribution */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle>Goals by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {goals.length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(
                        goals.reduce((acc, goal) => {
                          acc[goal.category] = (acc[goal.category] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([category, count]) => {
                        const CategoryIcon = getCategoryIcon(category as InvestmentGoal['category']);
                        return (
                          <div key={category} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CategoryIcon className="h-4 w-4" />
                              <span className="capitalize text-sm">{category.replace('_', ' ')}</span>
                            </div>
                            <span className="font-medium">{count} goal{count > 1 ? 's' : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No goals to analyze</p>
                  )}
                </CardContent>
              </Card>

              {/* Goal Timeline */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle>Upcoming Milestones</CardTitle>
                </CardHeader>
                <CardContent>
                  {goals
                    .filter(g => g.isActive && new Date(g.targetDate) > new Date())
                    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
                    .slice(0, 5)
                    .map(goal => {
                      const insights = getGoalInsights(goal);
                      return (
                        <div key={goal.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div>
                            <p className="font-medium text-sm">{goal.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {insights.monthsRemaining} months left
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(goal.targetAmount)}</p>
                            <p className={`text-xs ${insights.isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
                              {insights.isOnTrack ? 'On track' : 'Behind'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  {goals.filter(g => g.isActive).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No active goals</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {showAddGoal && (
          <GoalForm
            goal={editingGoal}
            onClose={() => {
              setShowAddGoal(false);
              setEditingGoal(null);
            }}
            onSave={editingGoal ? handleEditGoal : handleAddGoal}
          />
        )}

        {showAddContribution && selectedGoalId && (
          <ContributionForm
            goalId={selectedGoalId}
            onClose={() => {
              setShowAddContribution(false);
              setSelectedGoalId(null);
            }}
            onSave={handleAddContribution}
          />
        )}
      </div>
    </div>
  );
};

export default InvestmentsPage;