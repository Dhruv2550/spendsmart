import { API_BASE_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Switch } from './ui/switch';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  DollarSign, 
  Target, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Save,
  Package,
  BarChart3,
  X,
  Info,
  Loader2
} from 'lucide-react';

interface EnvelopeBudget {
  id: string;
  template_name: string;
  category: string;
  budget_amount: number;
  month: string;
  rollover_enabled: boolean;
  rollover_amount: number;
  is_active: boolean;
  created_at: string;
}

interface BudgetTemplate {
  template_name: string;
  category_count: number;
  total_budget: number;
  last_updated: string;
}

interface BudgetAnalysis {
  category: string;
  budgeted: number;
  actual: number;
  remaining: number;
  percentage: number;
  rollover_enabled: boolean;
  rollover_amount: number;
  has_budget: boolean;
  unbudgeted_spending: boolean;
}

interface BudgetSummary {
  totalBudgeted: number;
  totalActual: number;
  totalRemaining: number;
  overBudgetCategories: number;
  budgetUtilization: number;
}

const EnvelopeBudgetingPage: React.FC = () => {
  const { userId } = useAuth();
  
  const [budgets, setBudgets] = useState<EnvelopeBudget[]>([]);
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [analysis, setAnalysis] = useState<BudgetAnalysis[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    return localStorage.getItem('spendsmart_selected_budget_template') || 'Default';
  });
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  const categories = [
    "Rent", "Groceries", "Shopping", "Dining", "Transportation", 
    "Entertainment", "Utilities", "Healthcare", "Other"
  ];

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userId}`,
    'X-User-ID': userId || '',
  });

  const optimisticTemplateChange = (newTemplate: string) => {
    setSelectedTemplate(newTemplate);
    setBackgroundLoading(true);
    
    setTimeout(() => setBackgroundLoading(false), 1500);
  };

  const optimisticMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    setBackgroundLoading(true);
    
    setTimeout(() => setBackgroundLoading(false), 1500);
  };

  const optimisticTemplateCopy = async (templateName: string, sourceMonth: string, targetMonth: string) => {
    if (!userId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/budget-templates/${templateName}/copy`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          source_month: sourceMonth,
          target_month: targetMonth,
          apply_rollover: true
        })
      });
      
      if (response.ok) {
        loadData();
      } else {
        throw new Error('Failed to copy template');
      }
    } catch (error) {
      console.error('Error copying template:', error);
    }
  };

  const optimisticTemplateDelete = async (templateName: string) => {
    if (!window.confirm(`Delete template "${templateName}"?`)) return;
    if (!userId) return;
    
    setPendingDeletes(prev => new Set([...prev, templateName]));
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/budget-templates/${templateName}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        if (selectedTemplate === templateName) {
          localStorage.removeItem('spendsmart_selected_budget_template');
          setSelectedTemplate('Default');
        }
        loadData();
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      setPendingDeletes(prev => {
        const newSet = new Set(prev);
        newSet.delete(templateName);
        return newSet;
      });
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      localStorage.setItem('spendsmart_selected_budget_template', selectedTemplate);
    }
  }, [selectedTemplate]);

  const loadData = async () => {
    if (!userId) return;
    
    setBackgroundLoading(true);
    
    try {
      const templatesResponse = await fetch(`${API_BASE_URL}/api/budget-templates`, {
        headers: getAuthHeaders()
      });
      
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.filter((t: BudgetTemplate) => !pendingDeletes.has(t.template_name)));
        
        if (!selectedTemplate && templatesData.length > 0) {
          setSelectedTemplate(templatesData[0].template_name);
        }
        
        if (selectedTemplate && templatesData.length > 0) {
          const templateExists = templatesData.some((t: BudgetTemplate) => t.template_name === selectedTemplate);
          if (!templateExists) {
            setSelectedTemplate(templatesData[0].template_name);
          }
        }
      }
      
      if (selectedTemplate) {
        const budgetsResponse = await fetch(`${API_BASE_URL}/api/budgets/${selectedTemplate}/${selectedMonth}`, {
          headers: getAuthHeaders()
        });
        
        if (budgetsResponse.ok) {
          const budgetsData = await budgetsResponse.json();
          setBudgets(budgetsData);
        }
        
        const analysisResponse = await fetch(`${API_BASE_URL}/api/budget-analysis/${selectedTemplate}/${selectedMonth}`, {
          headers: getAuthHeaders()
        });
        
        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          setAnalysis(analysisData.analysis);
          setSummary(analysisData.summary);
        }
      }
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setBackgroundLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [selectedTemplate, selectedMonth, userId]);

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  const getBudgetStatusColor = (percentage: number, hasBudget: boolean, unbudgetedSpending: boolean) => {
    if (unbudgetedSpending) return 'text-purple-600 bg-purple-50 border-purple-200';
    if (percentage > 100) return 'text-red-600 bg-red-50 border-red-200';
    if (percentage >= 100) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (percentage > 80) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getBudgetStatusLabel = (percentage: number, hasbudget: boolean, unbudgetedSpending: boolean) => {
    if (unbudgetedSpending) return 'No Budget';
    if (percentage > 100) return 'Over Budget';
    if (percentage >= 100) return 'At Limit';
    if (percentage > 80) return 'Near Limit';
    return 'On Track';
  };

  const TemplateForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editingTemplateName?: string | null;
  }> = ({ isOpen, onClose, onSave, editingTemplateName }) => {
    const [templateData, setTemplateData] = useState({
      template_name: '',
      month: selectedMonth,
      budgets: categories.map(category => ({
        category,
        budget_amount: 0,
        rollover_enabled: false
      }))
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      if (editingTemplateName && budgets.length > 0) {
        setTemplateData({
          template_name: editingTemplateName,
          month: selectedMonth,
          budgets: categories.map(category => {
            const existingBudget = budgets.find(b => b.category === category);
            return {
              category,
              budget_amount: existingBudget?.budget_amount || 0,
              rollover_enabled: existingBudget?.rollover_enabled || false
            };
          })
        });
      } else if (!editingTemplateName) {
        setTemplateData({
          template_name: '',
          month: selectedMonth,
          budgets: categories.map(category => ({
            category,
            budget_amount: 0,
            rollover_enabled: false
          }))
        });
      }
    }, [editingTemplateName, budgets, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userId) return;
      
      setSaving(true);

      try {
        if (editingTemplateName) {
          const budgetsToUpdate = templateData.budgets
            .filter(b => b.budget_amount > 0)
            .map(budget => ({
              category: budget.category,
              budget_amount: budget.budget_amount
            }));

          const response = await fetch(`${API_BASE_URL}/api/budgets/${editingTemplateName}/${selectedMonth}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              budgets: budgetsToUpdate
            })
          });

          if (!response.ok) {
            throw new Error('Failed to update budgets');
          }
        } else {
          const response = await fetch(`${API_BASE_URL}/api/budget-templates`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              template_name: templateData.template_name,
              categories: templateData.budgets
                .filter(b => b.budget_amount > 0)
                .map(budget => ({
                  category: budget.category,
                  budget_amount: budget.budget_amount,
                  rollover_enabled: budget.rollover_enabled || false
                }))
            })
          });

          if (!response.ok) {
            throw new Error('Failed to create budget template');
          }

          setSelectedTemplate(templateData.template_name);
        }
        
        onSave();
        onClose();
      } catch (error) {
        console.error('Error saving template:', error);
      } finally {
        setSaving(false);
      }
    };

    const updateBudgetAmount = (category: string, amount: string) => {
      setTemplateData(prev => ({
        ...prev,
        budgets: prev.budgets.map(b => 
          b.category === category 
            ? { ...b, budget_amount: parseFloat(amount) || 0 }
            : b
        )
      }));
    };

    const totalBudget = templateData.budgets.reduce((sum, b) => sum + b.budget_amount, 0);

    if (!isOpen) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl w-full mx-4 my-8 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplateName ? `Edit ${editingTemplateName} Budget` : 'Create Budget Template'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={templateData.template_name}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, template_name: e.target.value }))}
                  placeholder="Default Budget"
                  required
                  disabled={!!editingTemplateName}
                  className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label>{editingTemplateName ? 'Month' : 'Starting Month'}</Label>
                <Input
                  type="month"
                  value={templateData.month}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, month: e.target.value }))}
                  required
                  disabled={!!editingTemplateName}
                  className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Category Budgets</h3>
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-medium">{formatCurrency(totalBudget)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map(category => {
                  const budget = templateData.budgets.find(b => b.category === category);
                  return (
                    <div key={category} className="space-y-2">
                      <Label>{category}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={budget?.budget_amount || ''}
                        onChange={(e) => updateBudgetAmount(category, e.target.value)}
                        placeholder="0.00"
                        className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1 transition-all duration-200 hover:scale-[1.02]" 
                disabled={!templateData.template_name || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingTemplateName ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {editingTemplateName ? 'Update Budget' : 'Create Template'}
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
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

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-lg">Loading user session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 transition-all duration-300">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Envelope Budgeting
          </h1>
          <p className="text-muted-foreground">Allocate your money to specific spending categories</p>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Template:</Label>
              <Select value={selectedTemplate} onValueChange={optimisticTemplateChange}>
                <SelectTrigger className="min-w-[150px] transition-all duration-200 hover:border-primary/50 focus:border-primary">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.template_name} value={template.template_name}>
                      {template.template_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {backgroundLoading && (
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Label>Month:</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => optimisticMonthChange(e.target.value)}
                className="min-w-[150px] transition-all duration-200 hover:border-primary/50 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateTemplate(true)}
              className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
        </div>

        {summary && (
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold transition-all duration-300">{formatCurrency(summary.totalBudgeted)}</div>
                <p className="text-xs text-muted-foreground">
                  Across all categories
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 transition-all duration-300">{formatCurrency(summary.totalActual)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.budgetUtilization.toFixed(1)}% of budget
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold transition-all duration-300 ${summary.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.totalRemaining)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.totalRemaining >= 0 ? 'Under budget' : 'Over budget'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold transition-all duration-300">{analysis.length}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.overBudgetCategories} over budget
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {analysis.length > 0 ? (
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 mb-8 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle>Budget vs Actual Spending</CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - {selectedTemplate} Template
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.map((item) => (
                  <div key={item.category} className="space-y-3 transition-all duration-300 hover:bg-gray-50 p-3 rounded-lg hover:scale-[1.005]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{item.category}</span>
                        <span className={`text-xs px-2 py-1 rounded-full border transition-all duration-300 ${getBudgetStatusColor(item.percentage, item.has_budget, item.unbudgeted_spending)}`}>
                          {getBudgetStatusLabel(item.percentage, item.has_budget, item.unbudgeted_spending)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(item.actual)} / {formatCurrency(item.budgeted)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.unbudgeted_spending ? (
                            <span className="text-purple-600">Unbudgeted spending</span>
                          ) : item.remaining >= 0 ? (
                            <>Remaining: <span className="text-green-600">{formatCurrency(Math.abs(item.remaining))}</span></>
                          ) : (
                            <>Over by: <span className="text-red-600">{formatCurrency(Math.abs(item.remaining))}</span></>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          item.unbudgeted_spending ? 'bg-purple-500' :
                          item.percentage > 100 ? 'bg-red-500' : 
                          item.percentage >= 100 ? 'bg-orange-500' :
                          item.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${item.unbudgeted_spending ? 100 : Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {item.unbudgeted_spending ? 'No budget set' : `${item.percentage.toFixed(1)}% used`}
                      </span>
                      {item.rollover_enabled && item.rollover_amount > 0 && (
                        <span className="text-blue-600">
                          Rollover: {formatCurrency(item.rollover_amount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 mb-8 transition-all duration-300 hover:shadow-lg">
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Budget Template Found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first budget template to start envelope budgeting
              </p>
              <Button 
                onClick={() => setShowCreateTemplate(true)}
                className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Budget Template
              </Button>
            </CardContent>
          </Card>
        )}

        {templates.length > 0 && (
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle>Budget Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => {
                  const isDeleting = pendingDeletes.has(template.template_name);
                  
                  return (
                    <div 
                      key={template.template_name} 
                      className={`flex justify-between items-center p-4 border rounded-lg transition-all duration-300 ${
                        isDeleting 
                          ? 'opacity-50 bg-red-50 border-red-200' 
                          : 'hover:shadow-sm hover:bg-gray-50 hover:scale-[1.005]'
                      }`}
                    >
                      <div>
                        <h4 className="font-medium">{template.template_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {template.category_count} categories - {formatCurrency(template.total_budget)} total budget
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(template.last_updated).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        {!isDeleting && (
                          <>
                            <Button
                              size="sm"
                              variant={selectedTemplate === template.template_name ? "default" : "outline"}
                              onClick={() => optimisticTemplateChange(template.template_name)}
                              className="transition-all duration-200 hover:scale-[1.05]"
                            >
                              {selectedTemplate === template.template_name ? 'Selected' : 'Select'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingTemplate(template.template_name);
                                setShowEditTemplate(true);
                              }}
                              title="Edit Budget"
                              className="transition-all duration-200 hover:scale-[1.05] hover:bg-blue-50"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const targetMonth = prompt('Copy to which month? (YYYY-MM format)', selectedMonth);
                                if (targetMonth) {
                                  optimisticTemplateCopy(template.template_name, selectedMonth, targetMonth);
                                }
                              }}
                              title="Copy Template"
                              className="transition-all duration-200 hover:scale-[1.05] hover:bg-green-50"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => optimisticTemplateDelete(template.template_name)}
                              className="text-red-500 hover:text-red-600 transition-all duration-200 hover:scale-[1.05] hover:bg-red-50"
                              title="Delete Template"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {isDeleting && (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                            <span className="text-sm text-red-600 font-medium">Deleting...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <TemplateForm
          isOpen={showCreateTemplate}
          onClose={() => setShowCreateTemplate(false)}
          onSave={() => {
            loadData();
            setShowCreateTemplate(false);
          }}
        />

        <TemplateForm
          isOpen={showEditTemplate}
          editingTemplateName={editingTemplate}
          onClose={() => {
            setShowEditTemplate(false);
            setEditingTemplate(null);
          }}
          onSave={() => {
            loadData();
            setShowEditTemplate(false);
            setEditingTemplate(null);
          }}
        />
      </div>
    </div>
  );
};

export default EnvelopeBudgetingPage;