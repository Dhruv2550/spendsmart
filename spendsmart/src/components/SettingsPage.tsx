import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Save, Database, Shield, Bell, Palette, Moon, Sun, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";

interface SettingsPageProps {
  monthlySavings: number;
  onBudgetChange: (budget: number) => void;
  expenseLimit: number;
  onExpenseLimitChange: (limit: number) => void;
}

const SettingsPage = ({ monthlySavings, onBudgetChange, expenseLimit, onExpenseLimitChange }: SettingsPageProps) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  const [settings, setSettings] = useState({
    currency: "USD",
    budgetAlerts: true,
    emailNotifications: false,
    monthlySavings: "4500",
    expenseLimit: "3000"
  });

  // Alert preferences interface
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

  // Alert preferences state
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => {
    const saved = localStorage.getItem('spendsmart_alert_settings');
    return saved ? JSON.parse(saved) : {
      categoryBudgetAlerts: true,
      totalBudgetAlerts: true,
      recurringDueAlerts: true,
      goalProgressAlerts: true,
      browserNotifications: true,
      alertThresholds: {
        warning: 80,    // Yellow warning at 80%
        critical: 90,   // Orange critical at 90%
        exceeded: 100   // Red when exceeded
      }
    };
  });

  // Save alert settings to localStorage
  useEffect(() => {
    localStorage.setItem('spendsmart_alert_settings', JSON.stringify(alertSettings));
  }, [alertSettings]);

  // Update settings when props change
  useEffect(() => {
    setSettings(prev => ({ 
      ...prev, 
      monthlySavings: monthlySavings.toString(),
      expenseLimit: expenseLimit.toString()
    }));
  }, [monthlySavings, expenseLimit]);

  const handleSettingChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Update the shared budget when monthly budget changes
    if (key === "monthlySavings" && typeof value === "string") {
      const budgetNumber = parseFloat(value) || 0;
      onBudgetChange(budgetNumber);
    }
    
    // Update the shared expense limit when it changes
    if (key === "expenseLimit" && typeof value === "string") {
      const limitNumber = parseFloat(value) || 0;
      onExpenseLimitChange(limitNumber);
    }
  };

  const handleAlertSettingChange = (key: string, value: string | boolean | number) => {
    if (key.startsWith('threshold_')) {
      const thresholdType = key.replace('threshold_', '');
      setAlertSettings((prev: AlertSettings) => ({
        ...prev,
        alertThresholds: {
          ...prev.alertThresholds,
          [thresholdType]: typeof value === 'string' ? parseFloat(value) : value
        }
      }));
    } else {
      setAlertSettings((prev: AlertSettings) => ({ ...prev, [key]: value }));
    }
  };

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setAlertSettings((prev: AlertSettings) => ({ ...prev, browserNotifications: true }));
        alert('Browser notifications enabled!');
      } else {
        setAlertSettings((prev: AlertSettings) => ({ ...prev, browserNotifications: false }));
        alert('Browser notifications denied. You can enable them later in your browser settings.');
      }
    } else {
      alert('Browser notifications are not supported in this browser.');
    }
  };

  const handleSave = () => {
    // In a real app, this would save to backend/database
    console.log("Settings saved:", settings);
    console.log("Alert settings saved:", alertSettings);
    console.log("Dark mode:", isDarkMode);
    alert('Settings saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your preferences and account settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {isDarkMode ? (
                      <Moon className="h-5 w-5 text-primary" />
                    ) : (
                      <Sun className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      {isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={toggleDarkMode}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Select value={settings.currency} onValueChange={(value) => handleSettingChange("currency", value)}>
                  <SelectTrigger>
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
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum amount you want to spend each month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spending Alerts Settings */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Spending Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alert Types */}
              <div className="space-y-4">
                <h4 className="font-medium">Alert Types</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Category Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert when approaching category budget limits</p>
                  </div>
                  <Switch
                    checked={alertSettings.categoryBudgetAlerts}
                    onCheckedChange={(checked) => handleAlertSettingChange("categoryBudgetAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Total Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert when approaching overall monthly limit</p>
                  </div>
                  <Switch
                    checked={alertSettings.totalBudgetAlerts}
                    onCheckedChange={(checked) => handleAlertSettingChange("totalBudgetAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Recurring Due Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert about upcoming recurring transactions</p>
                  </div>
                  <Switch
                    checked={alertSettings.recurringDueAlerts}
                    onCheckedChange={(checked) => handleAlertSettingChange("recurringDueAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Goal Progress Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert about savings goal progress</p>
                  </div>
                  <Switch
                    checked={alertSettings.goalProgressAlerts}
                    onCheckedChange={(checked) => handleAlertSettingChange("goalProgressAlerts", checked)}
                  />
                </div>
              </div>

              <Separator />

              {/* Alert Thresholds */}
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
                      className="text-center"
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
                      className="text-center"
                    />
                    <p className="text-xs text-orange-600">Orange alert</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Exceeded</Label>
                    <Input
                      type="number"
                      value={alertSettings.alertThresholds.exceeded}
                      disabled
                      className="text-center bg-gray-100"
                    />
                    <p className="text-xs text-red-600">Red alert</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Browser Notifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Browser Notifications</Label>
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
                    />
                    {!alertSettings.browserNotifications && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={requestNotificationPermission}
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

          {/* Account & Security */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
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
                  <Label>Email (Demo)</Label>
                  <Input type="email" value="demo@spendsmart.com" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Input value="Standalone Version" disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
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
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{notification.label}</Label>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                  </div>
                  <Switch checked={notification.enabled} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* About */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
            <CardHeader>
              <CardTitle>About SpendSmart</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm"><strong>Version:</strong> 1.0.0 (Standalone)</p>
                <p className="text-sm"><strong>Built with:</strong> React, TypeScript, Tailwind CSS</p>
                <p className="text-sm"><strong>Database:</strong> SQLite (Local) / DynamoDB (AWS)</p>
                <p className="text-sm"><strong>Theme:</strong> {isDarkMode ? "Dark Mode" : "Light Mode"}</p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium">Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Expense & Income Tracking</li>
                  <li>• Category Management</li>
                  <li>• Budget Monitoring</li>
                  <li>• Visual Reports & Analytics</li>
                  <li>• CSV Export/Import</li>
                  <li>• Dark/Light Mode</li>
                  <li>• Database Persistence</li>
                  <li>• AWS Deployment Ready</li>
                  <li>• Spending Alerts & Notifications</li>
                </ul>
              </div>
              
              <Separator />
              
              {/* Save Button */}
              <Button onClick={handleSave} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save All Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;