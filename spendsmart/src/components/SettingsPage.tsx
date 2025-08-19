import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Save, Database, Shield, Bell, Palette, Moon, Sun, AlertTriangle, CheckCircle, Info, AlertCircle, Loader2, X, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useAuth } from '../contexts/AuthContext';

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
    <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${getStyles()}`}>
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

interface SettingsPageProps {
  monthlySavings: number;
  onBudgetChange: (budget: number) => void;
  expenseLimit: number;
  onExpenseLimitChange: (limit: number) => void;
}

const SettingsPage = ({ monthlySavings, onBudgetChange, expenseLimit, onExpenseLimitChange }: SettingsPageProps) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { userId, isAuthenticated, isLoading } = useAuth();
  
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<any>(null);

  const [settings, setSettings] = useState({
    currency: "USD",
    budgetAlerts: true,
    emailNotifications: false,
    monthlySavings: "4500",
    expenseLimit: "3000"
  });

  interface AlertSettings {
    categoryBudgetAlerts: boolean;
    totalBudgetAlerts: boolean;
    recurringDueAlerts: boolean;
    goalProgressAlerts: boolean;
    browserNotifications: boolean;
    alertThresholds: {
      warning: number;
      critical: number;
      exceeded: number;
    };
  }

  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => {
    if (!isAuthenticated || !userId) {
      return {
        categoryBudgetAlerts: true,
        totalBudgetAlerts: true,
        recurringDueAlerts: true,
        goalProgressAlerts: true,
        browserNotifications: true,
        alertThresholds: {
          warning: 80,
          critical: 90,
          exceeded: 100
        }
      };
    }

    const saved = localStorage.getItem(`spendsmart_alert_settings_${userId}`);
    const defaultSettings = {
      categoryBudgetAlerts: true,
      totalBudgetAlerts: true,
      recurringDueAlerts: true,
      goalProgressAlerts: true,
      browserNotifications: true,
      alertThresholds: {
        warning: 80,
        critical: 90,
        exceeded: 100
      }
    };
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    if (!originalSettings) {
      setOriginalSettings({
        settings: { ...settings },
        alertSettings: { ...alertSettings }
      });
    }
  }, [settings, alertSettings, originalSettings]);

  useEffect(() => {
    if (isAuthenticated && userId) {
      localStorage.setItem(`spendsmart_alert_settings_${userId}`, JSON.stringify(alertSettings));
    }
  }, [alertSettings, userId, isAuthenticated]);

  useEffect(() => {
    setSettings(prev => ({ 
      ...prev, 
      monthlySavings: monthlySavings.toString(),
      expenseLimit: expenseLimit.toString()
    }));
  }, [monthlySavings, expenseLimit]);

  const handleDarkModeToggle = () => {
    toggleDarkMode();
    addToast({
      type: 'success',
      message: `Switched to ${!isDarkMode ? 'dark' : 'light'} mode`,
      duration: 2500
    });
  };

  const handleSettingChange = (key: string, value: string | boolean) => {
    setHasUnsavedChanges(true);
    
    setSettings(prev => ({ ...prev, [key]: value }));
    
    const settingLabels: { [key: string]: string } = {
      currency: 'Currency',
      budgetAlerts: 'Budget Alerts',
      emailNotifications: 'Email Notifications',
      monthlySavings: 'Monthly Savings Goal',
      expenseLimit: 'Expense Limit'
    };

    const settingName = settingLabels[key] || key;
    
    if (key === 'currency') {
      addToast({
        type: 'info',
        message: `Currency changed to ${value}`,
        duration: 2500
      });
    } else if (typeof value === 'boolean') {
      addToast({
        type: 'info',
        message: `${settingName} ${value ? 'enabled' : 'disabled'}`,
        duration: 2000
      });
    } else if (key === 'monthlySavings' || key === 'expenseLimit') {
      const amount = parseFloat(value as string) || 0;
      const formattedAmount = `$${amount.toLocaleString()}`;
      addToast({
        type: 'info',
        message: `${settingName} set to ${formattedAmount}`,
        duration: 2500
      });
    }
    
    if (key === "monthlySavings" && typeof value === "string") {
      const budgetNumber = parseFloat(value) || 0;
      onBudgetChange(budgetNumber);
    }
    
    if (key === "expenseLimit" && typeof value === "string") {
      const limitNumber = parseFloat(value) || 0;
      onExpenseLimitChange(limitNumber);
    }
  };

  const handleAlertSettingChange = (key: string, value: string | boolean | number) => {
    setHasUnsavedChanges(true);
    
    if (key.startsWith('threshold_')) {
      const thresholdType = key.replace('threshold_', '');
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      setAlertSettings((prev: AlertSettings) => ({
        ...prev,
        alertThresholds: {
          ...prev.alertThresholds,
          [thresholdType]: numValue
        }
      }));
      
      const thresholdLabels: { [key: string]: string } = {
        warning: 'Warning',
        critical: 'Critical',
        exceeded: 'Exceeded'
      };
      
      addToast({
        type: 'info',
        message: `${thresholdLabels[thresholdType]} threshold set to ${numValue}%`,
        duration: 2500
      });
    } else {
      setAlertSettings((prev: AlertSettings) => ({ ...prev, [key]: value }));
      
      const alertLabels: { [key: string]: string } = {
        categoryBudgetAlerts: 'Category Budget Alerts',
        totalBudgetAlerts: 'Total Budget Alerts',
        recurringDueAlerts: 'Recurring Due Alerts',
        goalProgressAlerts: 'Goal Progress Alerts',
        browserNotifications: 'Browser Notifications'
      };
      
      const alertName = alertLabels[key] || key;
      
      if (typeof value === 'boolean') {
        addToast({
          type: 'success',
          message: `${alertName} ${value ? 'enabled' : 'disabled'}`,
          duration: 2500
        });
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      addToast({
        type: 'error',
        message: 'Browser notifications are not supported in this browser'
      });
      return;
    }

    addToast({
      type: 'info',
      message: 'Requesting notification permission...',
      duration: 2000
    });

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setAlertSettings((prev: AlertSettings) => ({ ...prev, browserNotifications: true }));
        addToast({
          type: 'success',
          message: 'Browser notifications enabled successfully!'
        });
        
        new Notification('SpendSmart Notifications', {
          body: 'You will now receive spending alerts and reminders.',
          icon: '/favicon.ico'
        });
      } else {
        setAlertSettings((prev: AlertSettings) => ({ ...prev, browserNotifications: false }));
        addToast({
          type: 'error',
          message: 'Browser notifications denied. You can enable them later in your browser settings.'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to request notification permission'
      });
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    if (!isAuthenticated || !userId) {
      addToast({
        type: 'error',
        message: 'Please log in to save settings'
      });
      return;
    }
    
    setIsSaving(true);
    addToast({
      type: 'info',
      message: 'Saving settings...',
      duration: 2000
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Settings saved for user:", userId);
      console.log("Settings:", settings);
      console.log("Alert settings:", alertSettings);
      console.log("Dark mode:", isDarkMode);
      
      setHasUnsavedChanges(false);
      setOriginalSettings({
        settings: { ...settings },
        alertSettings: { ...alertSettings }
      });
      
      addToast({
        type: 'success',
        message: 'All settings saved successfully!'
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to save settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (isResetting || !originalSettings) return;
    
    const confirmed = window.confirm('Are you sure you want to reset all settings to their original values? This cannot be undone.');
    if (!confirmed) return;
    
    setIsResetting(true);
    addToast({
      type: 'info',
      message: 'Resetting settings...',
      duration: 2000
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSettings(originalSettings.settings);
      setAlertSettings(originalSettings.alertSettings);
      setHasUnsavedChanges(false);
      
      addToast({
        type: 'success',
        message: 'Settings reset to original values'
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to reset settings'
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your settings...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">
              Please log in to access your settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {toasts.map(toast => (
          <Toast key={toast.id} notification={toast} onRemove={removeToast} />
        ))}

        <div className="mb-8 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">
                Settings
              </h1>
              <p className="text-muted-foreground">Manage your preferences and account settings</p>
            </div>
            
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-700 font-medium">Unsaved changes</span>
                </div>
              )}
              
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={isResetting || isSaving || !originalSettings}
                className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleSave}
                disabled={isSaving || isResetting}
                className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card transition-all duration-200 hover:bg-card/80 hover:scale-[1.005]">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10 transition-colors duration-200">
                    {isDarkMode ? (
                      <Moon className="h-5 w-5 text-primary" />
                    ) : (
                      <Sun className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium cursor-pointer">Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      {isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={handleDarkModeToggle}
                  className="transition-all duration-200"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Select 
                  value={settings.currency} 
                  onValueChange={(value) => handleSettingChange("currency", value)}
                >
                  <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlySavings">Monthly Savings Goal</Label>
                  <Input
                    id="monthlySavings"
                    type="number"
                    value={settings.monthlySavings}
                    onChange={(e) => handleSettingChange("monthlySavings", e.target.value)}
                    placeholder="Enter your monthly savings goal"
                    className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    How much you want to save each month
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expenseLimit">Monthly Expense Limit</Label>
                  <Input
                    id="expenseLimit"
                    type="number"
                    value={settings.expenseLimit}
                    onChange={(e) => handleSettingChange("expenseLimit", e.target.value)}
                    placeholder="Enter your monthly expense limit"
                    className="transition-all duration-200 hover:border-primary/50 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum amount you want to spend each month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Spending Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Alert Types</h4>
                
                <div className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-gray-50">
                  <div className="space-y-0.5">
                    <Label className="cursor-pointer">Category Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert when approaching category budget limits</p>
                  </div>
                  <Switch
                    checked={alertSettings.categoryBudgetAlerts}
                    onCheckedChange={(checked) => handleAlertSettingChange("categoryBudgetAlerts", checked)}
                    className="transition-all duration-200"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-gray-50">
                  <div className="space-y-0.5">
                    <Label className="cursor-pointer">Total Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert when approaching overall monthly limit</p>
                  </div>
                  <Switch
                    checked={alertSettings.totalBudgetAlerts}
                    onCheckedChange={(checked) => handleAlertSettingChange("totalBudgetAlerts", checked)}
                    className="transition-all duration-200"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-gray-50">
                  <div className="space-y-0.5">
                    <Label className="cursor-pointer">Recurring Due Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert about upcoming recurring transactions</p>
                  </div>
                  <Switch
                    checked={alertSettings.recurringDueAlerts}
                    onCheckedChange={(checked) => handleAlertSettingChange("recurringDueAlerts", checked)}
                    className="transition-all duration-200"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-gray-50">
                  <div className="space-y-0.5">
                    <Label className="cursor-pointer">Goal Progress Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert about savings goal progress</p>
                  </div>
                  <Switch
                    checked={alertSettings.goalProgressAlerts}
                    onCheckedChange={(checked) => handleAlertSettingChange("goalProgressAlerts", checked)}
                    className="transition-all duration-200"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Alert Thresholds</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Warning (%)</Label>
                    <Input
                      type="number"
                      min="50"
                      max="95"
                      value={alertSettings.alertThresholds.warning}
                      onChange={(e) => handleAlertSettingChange("threshold_warning", e.target.value)}
                      className="text-center transition-all duration-200 hover:border-primary/50 focus:border-primary"
                    />
                    <p className="text-xs text-yellow-600">Yellow alert</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Critical (%)</Label>
                    <Input
                      type="number"
                      min="85"
                      max="99"
                      value={alertSettings.alertThresholds.critical}
                      onChange={(e) => handleAlertSettingChange("threshold_critical", e.target.value)}
                      className="text-center transition-all duration-200 hover:border-primary/50 focus:border-primary"
                    />
                    <p className="text-xs text-orange-600">Orange alert</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Exceeded</Label>
                    <Input
                      type="number"
                      value={alertSettings.alertThresholds.exceeded}
                      disabled
                      className="text-center bg-gray-100 transition-colors duration-200"
                    />
                    <p className="text-xs text-red-600">Red alert</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-gray-50">
                  <div className="space-y-0.5">
                    <Label className="cursor-pointer">Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">Show popup notifications in browser</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={alertSettings.browserNotifications}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          requestNotificationPermission();
                        } else {
                          handleAlertSettingChange("browserNotifications", false);
                        }
                      }}
                      className="transition-all duration-200"
                    />
                    {!alertSettings.browserNotifications && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={requestNotificationPermission}
                        className="transition-all duration-200 hover:scale-[1.05] hover:shadow-sm"
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        Enable
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Account & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-medium">Account Information</h4>
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input 
                    type="text" 
                    value={userId || 'Not authenticated'} 
                    disabled 
                    className="transition-colors duration-200 font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Input 
                    value="AWS Cognito User" 
                    disabled 
                    className="transition-colors duration-200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { 
                  label: "Monthly analytics", 
                  description: "Get monthly spending summaries", 
                  enabled: settings.budgetAlerts 
                },
                { 
                  label: "Budget Warnings", 
                  description: "Alert when approaching budget limits", 
                  enabled: alertSettings.categoryBudgetAlerts 
                },
                { 
                  label: "Goal Achievements", 
                  description: "Celebrate when you hit savings goals", 
                  enabled: alertSettings.goalProgressAlerts 
                },
                { 
                  label: "Weekly Insights", 
                  description: "Receive weekly spending insights", 
                  enabled: false 
                }
              ].map((notification, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 transition-all duration-200 hover:bg-muted/50 hover:scale-[1.005]">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium cursor-pointer">{notification.label}</Label>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                  </div>
                  <Switch 
                    checked={notification.enabled} 
                    className="transition-all duration-200"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005] lg:col-span-2">
            <CardHeader>
              <CardTitle>About SpendSmart</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm"><strong>Version:</strong> 1.0.0 (AWS Deployed)</p>
                  <p className="text-sm"><strong>Built with:</strong> React, TypeScript, Tailwind CSS</p>
                  <p className="text-sm"><strong>Database:</strong> DynamoDB</p>
                  <p className="text-sm"><strong>Theme:</strong> {isDarkMode ? "Dark Mode" : "Light Mode"}</p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>- User Authentication with AWS Cognito</li>
                    <li>- Expense & Income Tracking</li>
                    <li>- Category Management</li>
                    <li>- Budget Monitoring</li>
                    <li>- Recurring Transactions</li>
                    <li>- Visual Reports & Analytics</li>
                    <li>- CSV Export/Import</li>
                    <li>- Dark/Light Mode</li>
                    <li>- Spending Alerts & Notifications</li>
                  </ul>
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-muted/30 rounded-lg p-4 transition-all duration-200 hover:bg-muted/50">
                <h4 className="font-medium mb-2">Current Settings Summary</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p><strong>User ID:</strong> {userId ? `${userId.substring(0, 8)}...` : 'Not authenticated'}</p>
                    <p><strong>Currency:</strong> {settings.currency}</p>
                    <p><strong>Monthly Savings Goal:</strong> ${Number(settings.monthlySavings).toLocaleString()}</p>
                    <p><strong>Monthly Expense Limit:</strong> ${Number(settings.expenseLimit).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p><strong>Alert Thresholds:</strong> {alertSettings.alertThresholds.warning}% / {alertSettings.alertThresholds.critical}%</p>
                    <p><strong>Browser Notifications:</strong> {alertSettings.browserNotifications ? 'Enabled' : 'Disabled'}</p>
                    <p><strong>Active Alerts:</strong> {Object.values(alertSettings).filter(v => v === true).length} enabled</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;