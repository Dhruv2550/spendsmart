import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, Bell, AlertTriangle, CheckCircle, Eye, EyeOff, Info, Loader2, Undo2, RefreshCw } from 'lucide-react';
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
      case 'error': return <AlertTriangle className="h-4 w-4" />;
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
  const { userId, isAuthenticated, isLoading } = useAuth();
  const [alerts, setAlerts] = useState<SpendingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [dismissedAlert, setDismissedAlert] = useState<SpendingAlert | null>(null);
  const [isDismissingAll, setIsDismissingAll] = useState(false);

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const loadAlerts = async (showLoadingToast = false) => {
    if (!userId) {
      console.error('No user ID available for loading alerts');
      setLoading(false);
      return;
    }

    if (showLoadingToast) {
      setIsRefreshing(true);
      addToast({
        type: 'info',
        message: 'Refreshing alerts...',
        duration: 2000
      });
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
          'X-User-ID': userId,
        }
      });
      
      if (response.ok) {
        const alertsData = await response.json();
        const filteredAlerts = alertsData.data ? alertsData.data.filter((alert: SpendingAlert) => 
          alert.month === month || !alert.month
        ) : [];
        setAlerts(filteredAlerts);
        
        if (showLoadingToast) {
          addToast({
            type: 'success',
            message: 'Alerts updated successfully',
            duration: 2500
          });
        }
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      if (showLoadingToast) {
        addToast({
          type: 'error',
          message: 'Failed to refresh alerts'
        });
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && userId && !isLoading) {
      loadAlerts();
    } else {
      setLoading(false);
    }
  }, [month, userId, isAuthenticated, isLoading]);

  const markAsRead = async (alertId: string) => {
    if (processingIds.has(alertId) || !userId) return;
    
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    setProcessingIds(prev => new Set(prev).add(alertId));
    
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, is_read: true } : alert
    ));

    addToast({
      type: 'success',
      message: 'Alert marked as read',
      duration: 2500
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
          'X-User-ID': userId,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }
      
      onAlertAction?.();
    } catch (error) {
      console.error('Error marking alert as read:', error);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, is_read: false } : alert
      ));
      addToast({
        type: 'error',
        message: 'Failed to mark alert as read'
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const dismissAlert = async (alertId: string) => {
    if (processingIds.has(alertId) || !userId) return;
    
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    setProcessingIds(prev => new Set(prev).add(alertId));
    
    setDismissedAlert(alert);
    
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));

    addToast({
      type: 'info',
      message: 'Alert dismissed',
      duration: 5000
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/dismiss`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
          'X-User-ID': userId,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to dismiss alert');
      }
      
      onAlertAction?.();
      
      setTimeout(() => {
        setDismissedAlert(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error dismissing alert:', error);
      setAlerts(prev => [...prev, alert].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setDismissedAlert(null);
      addToast({
        type: 'error',
        message: 'Failed to dismiss alert'
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const undoDismiss = () => {
    if (dismissedAlert) {
      setAlerts(prev => [...prev, dismissedAlert].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setDismissedAlert(null);
      addToast({
        type: 'success',
        message: 'Alert restored successfully'
      });
    }
  };

  const dismissAllAlerts = async () => {
    if (isDismissingAll || alerts.length === 0 || !userId) return;
    
    const confirmed = window.confirm(`Are you sure you want to dismiss all ${alerts.length} alerts? This action cannot be undone.`);
    if (!confirmed) return;

    setIsDismissingAll(true);
    const originalAlerts = [...alerts];
    
    setAlerts([]);
    
    addToast({
      type: 'info',
      message: `Dismissing ${originalAlerts.length} alerts...`,
      duration: 3000
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/dismiss-all/${month}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
          'X-User-ID': userId,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to dismiss all alerts');
      }
      
      onAlertAction?.();
      addToast({
        type: 'success',
        message: `All ${originalAlerts.length} alerts dismissed successfully`
      });
    } catch (error) {
      console.error('Error dismissing all alerts:', error);
      setAlerts(originalAlerts);
      addToast({
        type: 'error',
        message: 'Failed to dismiss all alerts'
      });
    } finally {
      setIsDismissingAll(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      addToast({
        type: 'error',
        message: 'Browser notifications are not supported'
      });
      return;
    }

    if (Notification.permission === 'granted') {
      addToast({
        type: 'info',
        message: 'Browser notifications are already enabled'
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
        addToast({
          type: 'success',
          message: 'Browser notifications enabled successfully!'
        });
        
        new Notification('SpendSmart Alerts', {
          body: 'You will now receive spending alerts and reminders.',
          icon: '/favicon.ico'
        });
      } else {
        addToast({
          type: 'error',
          message: 'Browser notifications denied. Enable in browser settings.'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to enable notifications'
      });
    }
  };

  const handleViewToggle = () => {
    setShowAllAlerts(!showAllAlerts);
    addToast({
      type: 'info',
      message: showAllAlerts ? 'Collapsed alerts view' : 'Expanded alerts view',
      duration: 2000
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !isRefreshing && isAuthenticated && userId) {
        loadAlerts();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [month, loading, isRefreshing, isAuthenticated, userId]);

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

  if (isLoading) {
    return (
      <div className="mb-6">
        <Card className="border-blue-200 bg-blue-50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <p className="font-medium text-blue-800">Loading your alerts...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated || !userId) {
    return null;
  }

  if (loading) {
    return (
      <div className="mb-6">
        <Card className="border-blue-200 bg-blue-50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <p className="font-medium text-blue-800">Loading spending alerts...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  const unreadAlerts = alerts.filter(alert => !alert.is_read);
  const readAlerts = alerts.filter(alert => alert.is_read);

  return (
    <div className="mb-6">
      {toasts.map(toast => (
        <Toast key={toast.id} notification={toast} onRemove={removeToast} />
      ))}

      {dismissedAlert && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg bg-orange-50 text-orange-800 border-orange-200">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Alert dismissed</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={undoDismiss}
            className="ml-2 text-orange-700 hover:text-orange-900 transition-colors duration-200"
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Undo
          </Button>
        </div>
      )}

      {!showAllAlerts && alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
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
                  onClick={handleViewToggle}
                  className="bg-white border-orange-300 text-orange-700 hover:bg-orange-100 transition-all duration-200 hover:scale-[1.05]"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View All
                </Button>
                {alerts.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={dismissAllAlerts}
                    disabled={isDismissingAll}
                    className="bg-white border-orange-300 text-orange-700 hover:bg-orange-100 transition-all duration-200 hover:scale-[1.05] disabled:opacity-50"
                  >
                    {isDismissingAll ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    Dismiss All
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showAllAlerts && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Spending Alerts - {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => loadAlerts(true)}
                  disabled={isRefreshing}
                  className="transition-all duration-200 hover:scale-[1.05]"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Refresh
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleViewToggle}
                  className="transition-all duration-200 hover:scale-[1.05]"
                >
                  <EyeOff className="h-3 w-3 mr-1" />
                  Collapse
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unreadAlerts.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-orange-500" />
                    New Alerts ({unreadAlerts.length})
                  </h4>
                  <div className="space-y-3">
                    {unreadAlerts.map((alert) => {
                      const isProcessing = processingIds.has(alert.id);
                      
                      return (
                        <div key={alert.id} className={`p-4 rounded-lg border transition-all duration-300 hover:scale-[1.005] ${getAlertColor(alert.threshold_percentage)}`}>
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
                                disabled={isProcessing}
                                className="h-6 w-6 p-0 transition-all duration-200 hover:scale-[1.1] hover:bg-green-100 disabled:opacity-50"
                                title="Mark as read"
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => dismissAlert(alert.id)}
                                disabled={isProcessing}
                                className="h-6 w-6 p-0 transition-all duration-200 hover:scale-[1.1] hover:bg-red-100 disabled:opacity-50"
                                title="Dismiss"
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {readAlerts.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Read Alerts ({readAlerts.length})
                  </h4>
                  <div className="space-y-3">
                    {readAlerts.map((alert) => {
                      const isProcessing = processingIds.has(alert.id);
                      
                      return (
                        <div key={alert.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-75 transition-all duration-300 hover:opacity-90 hover:scale-[1.005]">
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
                              disabled={isProcessing}
                              className="h-6 w-6 p-0 transition-all duration-200 hover:scale-[1.1] hover:bg-red-100 disabled:opacity-50"
                              title="Dismiss"
                            >
                              {isProcessing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={dismissAllAlerts}
                  disabled={alerts.length === 0 || isDismissingAll}
                  className="flex-1 transition-all duration-200 hover:scale-[1.02] hover:shadow-md disabled:opacity-50"
                >
                  {isDismissingAll ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Dismissing...
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Dismiss All Alerts
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={requestNotificationPermission}
                  className="flex-1 transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
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