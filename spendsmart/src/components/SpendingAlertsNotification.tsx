import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, Bell, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface SpendingAlert {
  id: string;
  alert_type: 'category_budget' | 'total_budget' | 'recurring_due' | 'goal_progress';
  category: string | null;
  threshold_percentage: number;
  current_amount: number;
  budget_amount: number;
  month: string;
  template_name: string | null;
  message: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

interface SpendingAlertsNotificationProps {
  month: string;
  onAlertAction?: () => void;
}

const SpendingAlertsNotification: React.FC<SpendingAlertsNotificationProps> = ({ 
  month, 
  onAlertAction 
}) => {
  const [alerts, setAlerts] = useState<SpendingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Load alerts
  const loadAlerts = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/alerts/${month}`);
      if (response.ok) {
        const alertsData = await response.json();
        setAlerts(alertsData);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [month]);

  // Mark alert as read
  const markAsRead = async (alertId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/alerts/${alertId}/read`, {
        method: 'PATCH'
      });
      
      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, is_read: true } : alert
        ));
        onAlertAction?.();
      }
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  // Dismiss alert
  const dismissAlert = async (alertId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/alerts/${alertId}/dismiss`, {
        method: 'PATCH'
      });
      
      if (response.ok) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
        onAlertAction?.();
      }
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  // Dismiss all alerts
  const dismissAllAlerts = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/alerts/dismiss-all/${month}`, {
        method: 'PATCH'
      });
      
      if (response.ok) {
        setAlerts([]);
        onAlertAction?.();
      }
    } catch (error) {
      console.error('Error dismissing all alerts:', error);
    }
  };

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  // Monitor for new alerts (simulate real-time)
  useEffect(() => {
    const interval = setInterval(() => {
      loadAlerts();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [month]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const getAlertIcon = (alertType: string, thresholdPercentage: number) => {
    if (thresholdPercentage >= 100) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (thresholdPercentage >= 90) return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    return <Bell className="h-4 w-4 text-yellow-500" />;
  };

  const getAlertColor = (thresholdPercentage: number) => {
    if (thresholdPercentage >= 100) return 'border-red-200 bg-red-50';
    if (thresholdPercentage >= 90) return 'border-orange-200 bg-orange-50';
    return 'border-yellow-200 bg-yellow-50';
  };

  const unreadAlerts = alerts.filter(alert => !alert.is_read);
  const readAlerts = alerts.filter(alert => alert.is_read);

  if (loading) return null;

  if (alerts.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Compact Alert Summary */}
      {!showAllAlerts && alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">
                    {unreadAlerts.length > 0 ? `${unreadAlerts.length} new spending alert${unreadAlerts.length > 1 ? 's' : ''}` : 'All alerts reviewed'}
                  </p>
                  <p className="text-sm text-orange-600">
                    {alerts.length} total alert{alerts.length > 1 ? 's' : ''} for {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowAllAlerts(true)}
                  className="bg-white border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View All
                </Button>
                {alerts.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={dismissAllAlerts}
                    className="bg-white border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Dismiss All
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Alerts View */}
      {showAllAlerts && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Spending Alerts - {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowAllAlerts(false)}
              >
                <EyeOff className="h-3 w-3 mr-1" />
                Collapse
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Unread Alerts */}
              {unreadAlerts.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-orange-500" />
                    New Alerts ({unreadAlerts.length})
                  </h4>
                  <div className="space-y-3">
                    {unreadAlerts.map((alert) => (
                      <div key={alert.id} className={`p-4 rounded-lg border ${getAlertColor(alert.threshold_percentage)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.alert_type, alert.threshold_percentage)}
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-800">{alert.message}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {alert.category} - {formatDate(alert.created_at)} - {alert.template_name} template
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(alert.id)}
                              className="h-6 w-6 p-0"
                              title="Mark as read"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissAlert(alert.id)}
                              className="h-6 w-6 p-0"
                              title="Dismiss"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Read Alerts */}
              {readAlerts.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Read Alerts ({readAlerts.length})
                  </h4>
                  <div className="space-y-3">
                    {readAlerts.map((alert) => (
                      <div key={alert.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-75">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-600">{alert.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {alert.category} - {formatDate(alert.created_at)} - {alert.template_name} template
                              </p>
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => dismissAlert(alert.id)}
                            className="h-6 w-6 p-0"
                            title="Dismiss"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={dismissAllAlerts}
                  disabled={alerts.length === 0}
                  className="flex-1"
                >
                  <X className="h-3 w-3 mr-1" />
                  Dismiss All Alerts
                </Button>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    const hasPermission = await requestNotificationPermission();
                    if (hasPermission) {
                      alert('Browser notifications enabled!');
                    } else {
                      alert('Browser notifications denied. Enable in browser settings.');
                    }
                  }}
                  className="flex-1"
                >
                  <Bell className="h-3 w-3 mr-1" />
                  Enable Notifications
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpendingAlertsNotification;