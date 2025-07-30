// src/components/SettingsPage.tsx - Updated with Dark Mode from your latest code
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Save, Database, Shield, Bell, Palette, Moon, Sun } from "lucide-react";
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

  const handleSave = () => {
    // In a real app, this would save to backend/database
    console.log("Settings saved:", settings);
    console.log("Dark mode:", isDarkMode);
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

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when you exceed your budget</p>
                  </div>
                  <Switch
                    checked={settings.budgetAlerts}
                    onCheckedChange={(checked) => handleSettingChange("budgetAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive monthly summaries via email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
                  />
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
                { label: "Monthly Reports", description: "Get monthly spending summaries", enabled: true },
                { label: "Budget Warnings", description: "Alert when approaching budget limits", enabled: true },
                { label: "Goal Achievements", description: "Celebrate when you hit savings goals", enabled: false },
                { label: "Weekly Insights", description: "Receive weekly spending insights", enabled: false }
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
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;