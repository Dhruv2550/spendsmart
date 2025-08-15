import { API_BASE_URL } from '../config/api';
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
  ChevronRight,
  Info,
  Undo2
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

// Optimistic operation tracking
interface OptimisticOperation {
  id: string;
  type: 'create_goal' | 'update_goal' | 'delete_goal' | 'add_contribution';
  goalId?: number;
  originalData?: any;
}

const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<InvestmentGoal[]>([]);
  const [contributions, setContributions] = useState<InvestmentContribution[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddContribution, setShowAddContribution] = useState(false);
  const [editingGoal, setEditingGoal] = useState<InvestmentGoal | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCompletedGoals, setShowCompletedGoals] = useState(false);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [activeTab, setActiveTab] = useState('goals');
  
  // Optimistic state (removed toast system)
  const [optimisticOperations, setOptimisticOperations] = useState<OptimisticOperation[]>([]);
  const [deletedGoalId, setDeletedGoalId] = useState<number | null>(null);
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());

  // Load current savings from Dashboard data with optimistic updates
  useEffect(() => {
    const fetchCurrentSavings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/records`);
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

  // Calculate goal metrics with optimistic updates
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

  // Tab switching (removed toast feedback)
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Goal Form Component with FIXED modal positioning
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

        // Optimistic update - immediately save
        onSave(goalData);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        onClose();
      } catch (error) {
        console.error('Error saving goal:', error);
      } finally {
        setSaving(false);
      }
    };

    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {goal ? 'Edit Financial Goal' : 'Create New Financial Goal test'}
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
                  className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as InvestmentGoal['category'] }))}
                >
                  <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House/Real Estate</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="car">Vehicle</SelectItem>
                    <SelectItem value="vacation">Vacation/Travel</SelectItem>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="baby">Baby/Family</SelectItem>
                    <SelectItem value="business">Business/Startup</SelectItem>
                    <SelectItem value="retirement">Retirement</SelectItem>
                    <SelectItem value="emergency">Emergency Fund</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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
                className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
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
                  className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
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
                  className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
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
                  className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
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
                  className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as InvestmentGoal['priority'] }))}
              >
                <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                  <SelectValue placeholder="Select priority" />
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
                className="w-4 h-4 transition-all duration-200"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Goal is active</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1 transition-all duration-200 hover:scale-[1.02]" 
                disabled={saving}
              >
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={saving}
                className="transition-all duration-200 hover:scale-[1.02]"
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

  // Contribution Form Component with FIXED modal positioning
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

        // Optimistic update - immediately save
        onSave(contributionData);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        onClose();
      } catch (error) {
        console.error('Error saving contribution:', error);
      } finally {
        setSaving(false);
      }
    };

    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
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
                className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Source</Label>
              <Select 
                value={formData.source} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, source: value as InvestmentContribution['source'] }))}
              >
                <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                  <SelectValue placeholder="Select source" />
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
                className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1 transition-all duration-200 hover:scale-[1.02]" 
                disabled={saving}
              >
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={saving}
                className="transition-all duration-200 hover:scale-[1.02]"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  // Optimistic goal operations
  const handleAddGoal = (goalData: Omit<InvestmentGoal, 'id'>) => {
    const newGoal = {
      ...goalData,
      id: Math.max(...goals.map(g => g.id), 0) + 1
    };
    
    // Immediate optimistic update
    setGoals(prev => [...prev, newGoal]);
    
    // Track operation for potential rollback
    const operationId = Math.random().toString(36).substr(2, 9);
    setOptimisticOperations(prev => [...prev, {
      id: operationId,
      type: 'create_goal',
      goalId: newGoal.id
    }]);

    // Background "API call"
    setTimeout(() => {
      setOptimisticOperations(prev => prev.filter(op => op.id !== operationId));
    }, 1000);
  };

  const handleEditGoal = (goalData: Omit<InvestmentGoal, 'id'>) => {
    if (editingGoal) {
      const originalGoal = editingGoal;
      const updatedGoal = { ...goalData, id: editingGoal.id };
      
      // Immediate optimistic update
      setGoals(prev => prev.map(goal => 
        goal.id === editingGoal.id ? updatedGoal : goal
      ));
      
      // Track operation for potential rollback
      const operationId = Math.random().toString(36).substr(2, 9);
      setOptimisticOperations(prev => [...prev, {
        id: operationId,
        type: 'update_goal',
        goalId: editingGoal.id,
        originalData: originalGoal
      }]);

      setEditingGoal(null);

      // Background "API call"
      setTimeout(() => {
        setOptimisticOperations(prev => prev.filter(op => op.id !== operationId));
      }, 1000);
    }
  };

  const handleDeleteGoal = (id: number) => {
    const goalToDelete = goals.find(g => g.id === id);
    if (!goalToDelete) return;

    const confirmed = window.confirm('Are you sure you want to delete this goal? All associated contributions will also be deleted.');
    
    if (confirmed) {
      // Immediate optimistic update
      const originalGoals = goals;
      const originalContributions = contributions;
      
      setGoals(prev => prev.filter(goal => goal.id !== id));
      setContributions(prev => prev.filter(contrib => contrib.goalId !== id));
      setDeletedGoalId(id);

      // Track operation for undo
      const operationId = Math.random().toString(36).substr(2, 9);
      setOptimisticOperations(prev => [...prev, {
        id: operationId,
        type: 'delete_goal',
        goalId: id,
        originalData: { goals: originalGoals, contributions: originalContributions }
      }]);

      // Background "API call" - remove undo option after delay
      setTimeout(() => {
        setOptimisticOperations(prev => prev.filter(op => op.id !== operationId));
        setDeletedGoalId(null);
      }, 5000);
    }
  };

  const handleUndoDelete = () => {
    const deleteOperation = optimisticOperations.find(op => 
      op.type === 'delete_goal' && op.goalId === deletedGoalId
    );
    
    if (deleteOperation && deleteOperation.originalData) {
      setGoals(deleteOperation.originalData.goals);
      setContributions(deleteOperation.originalData.contributions);
      setOptimisticOperations(prev => prev.filter(op => op.id !== deleteOperation.id));
      setDeletedGoalId(null);
    }
  };

  const handleAddContribution = (contributionData: Omit<InvestmentContribution, 'id'>) => {
    const newContribution = {
      ...contributionData,
      id: Math.max(...contributions.map(c => c.id), 0) + 1
    };
    
    // Immediate optimistic updates
    setContributions(prev => [...prev, newContribution]);
    setGoals(prev => prev.map(goal => 
      goal.id === contributionData.goalId 
        ? { ...goal, currentAmount: goal.currentAmount + contributionData.amount }
        : goal
    ));

    // Track operation
    const operationId = Math.random().toString(36).substr(2, 9);
    setOptimisticOperations(prev => [...prev, {
      id: operationId,
      type: 'add_contribution'
    }]);

    // Background "API call"
    setTimeout(() => {
      setOptimisticOperations(prev => prev.filter(op => op.id !== operationId));
    }, 1000);
  };

  // Completed goals toggle (removed toast feedback)
  const handleToggleCompletedGoals = () => {
    setShowCompletedGoals(prev => !prev);
  };

  // Dynamic skeleton loading instead of static spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>

          {/* Overview Cards Skeleton */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                  {i === 4 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs Skeleton */}
          <div className="space-y-6">
            <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
            
            {/* Goals Header Skeleton */}
            <div className="flex justify-between items-center">
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>

            {/* Goal Cards Skeleton */}
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-gray-200 animate-pulse">
                          <div className="h-5 w-5 bg-gray-300 rounded animate-pulse"></div>
                        </div>
                        <div className="flex-1">
                          <div className="h-6 bg-gray-200 rounded w-48 mb-1 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
                          <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>

                    {/* Progress Section Skeleton */}
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3 animate-pulse"></div>

                      {/* Goal Insights Skeleton */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((j) => (
                          <div key={j}>
                            <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                          </div>
                        ))}
                      </div>

                      {/* Status Alert Skeleton */}
                      <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <div className="h-4 w-4 bg-gray-200 rounded mr-2 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Undo deleted goal notification */}
        {deletedGoalId && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg bg-orange-50 text-orange-800 border-orange-200">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Goal deleted</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndoDelete}
              className="ml-2 text-orange-700 hover:text-orange-900 transition-colors duration-200"
            >
              <Undo2 className="h-3 w-3 mr-1" />
              Undo
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 transition-all duration-300">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Goals
          </h1>
          <p className="text-muted-foreground">Plan and track progress toward your life goals</p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold transition-all duration-300">
                {goalMetrics.totalGoals}
              </div>
              <p className="text-xs text-muted-foreground">
                {goalMetrics.achievedGoals} achieved
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Target</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold transition-all duration-300">
                {formatCurrency(goalMetrics.totalTargetAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all goals
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold transition-all duration-300">
                {goalMetrics.overallProgress.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(goalMetrics.totalCurrentAmount)} saved
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Commitment</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold transition-all duration-300">
                {formatCurrency(goalMetrics.totalMonthlyContribution)}
              </div>
              <p className="text-xs text-muted-foreground">
                Goal contributions
              </p>
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Current Savings:</span>
                  <span className={`font-medium transition-colors duration-200 ${currentSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(currentSavings)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 transition-all duration-200">
            <TabsTrigger value="goals" className="transition-all duration-200">My Goals</TabsTrigger>
            <TabsTrigger value="analytics" className="transition-all duration-200">Analytics</TabsTrigger>
          </TabsList>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Goals</h2>
              <Button 
                onClick={() => setShowAddGoal(true)}
                className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Goal
              </Button>
            </div>

            <div className="grid gap-4">
              {goals.filter(g => g.isActive && g.currentAmount < g.targetAmount).map((goal) => {
                const insights = getGoalInsights(goal);
                const CategoryIcon = getCategoryIcon(goal.category);

                return (
                  <Card key={goal.id} className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 transition-colors duration-200">
                            <CategoryIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{goal.name}</h3>
                            <p className="text-sm text-muted-foreground">{goal.description}</p>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-2 py-1 rounded-full border transition-all duration-200 ${getPriorityColor(goal.priority)}`}>
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
                            className="transition-all duration-200 hover:scale-[1.05] hover:bg-green-50 hover:border-green-300"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Money
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingGoal(goal);
                              setShowAddGoal(true);
                            }}
                            className="transition-all duration-200 hover:scale-[1.05] hover:bg-blue-50 hover:border-blue-300"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-red-500 hover:text-red-600 transition-all duration-200 hover:scale-[1.05] hover:bg-red-50 hover:border-red-300"
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
                            className={`h-3 rounded-full transition-all duration-500 ease-out ${
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
                            <p className={`font-medium transition-colors duration-200 ${insights.isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
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
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 transition-all duration-200">
                            <div className="flex items-center">
                              <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                              <span className="text-sm font-medium text-yellow-700">
                                Behind target - increase monthly contribution by {formatCurrency(insights.requiredMonthlyContribution - goal.monthlyContribution)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 transition-all duration-200">
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
                <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg">
                  <CardContent className="text-center py-12">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No active goals yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first goal to start planning your financial future
                    </p>
                    <Button 
                      onClick={() => setShowAddGoal(true)}
                      className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                    >
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
                  onClick={handleToggleCompletedGoals}
                  className="mb-4 p-0 h-auto font-medium text-left transition-all duration-200 hover:text-primary"
                >
                  {showCompletedGoals ? (
                    <ChevronDown className="h-4 w-4 mr-2 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2 transition-transform duration-200" />
                  )}
                  Completed Goals ({goals.filter(g => g.currentAmount >= g.targetAmount).length})
                </Button>

                {showCompletedGoals && (
                  <div className="grid gap-4 transition-all duration-300">
                    {goals.filter(g => g.currentAmount >= g.targetAmount).map((goal) => {
                      const CategoryIcon = getCategoryIcon(goal.category);
                      const progressPercentage = (goal.currentAmount / goal.targetAmount) * 100;

                      return (
                        <Card key={goal.id} className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 opacity-75 transition-all duration-300 hover:opacity-90 hover:shadow-lg hover:scale-[1.005]">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/20 transition-colors duration-200">
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
                                  className="border-green-300 text-green-700 hover:bg-green-100 transition-all duration-200 hover:scale-[1.05]"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteGoal(goal.id)}
                                  className="text-red-500 hover:text-red-600 transition-all duration-200 hover:scale-[1.05] hover:bg-red-50 hover:border-red-300"
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
                                  className="h-2 rounded-full bg-green-500 transition-all duration-500"
                                  style={{ width: '100%' }}
                                />
                              </div>

                              <div className="bg-green-100 border border-green-200 rounded-lg p-3 transition-all duration-200">
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

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-xl font-semibold">Goal Analytics</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Goal Distribution */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
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
                          <div key={category} className="flex items-center justify-between transition-all duration-200 hover:bg-gray-50 -mx-2 px-2 py-1 rounded">
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
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
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
                        <div key={goal.id} className="flex items-center justify-between py-2 border-b last:border-b-0 transition-all duration-200 hover:bg-gray-50 -mx-2 px-2 rounded">
                          <div>
                            <p className="font-medium text-sm">{goal.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {insights.monthsRemaining} months left
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(goal.targetAmount)}</p>
                            <p className={`text-xs transition-colors duration-200 ${insights.isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
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

              {/* Goal Planning Tips */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
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
                    <div className="bg-blue-50 p-4 rounded-lg transition-colors duration-200">
                      <p className="text-sm text-blue-700">
                        <strong>Quick Tip:</strong> The 50/30/20 rule suggests allocating 20% of income to savings and investments. 
                        If you earn $5,000/month, that's $1,000 for all your investment goals combined.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Guide */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
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
                      <div className="flex items-center gap-2 text-sm transition-all duration-200 hover:bg-red-50 -mx-2 px-2 py-1 rounded">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center font-bold">1</span>
                        <span>Emergency Fund (3-6 months expenses)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm transition-all duration-200 hover:bg-yellow-50 -mx-2 px-2 py-1 rounded">
                        <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 text-xs flex items-center justify-center font-bold">2</span>
                        <span>High-interest debt payoff</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm transition-all duration-200 hover:bg-blue-50 -mx-2 px-2 py-1 rounded">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">3</span>
                        <span>Retirement (401k match)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm transition-all duration-200 hover:bg-green-50 -mx-2 px-2 py-1 rounded">
                        <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center font-bold">4</span>
                        <span>Other goals (house, car, etc.)</span>
                      </div>
                    </div>
                  </div>
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

export default GoalsPage;