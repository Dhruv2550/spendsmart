import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import { 
  User, 
  Mail, 
  Shield, 
  Clock,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

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
    }, notification.duration || 3000);

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
    <div className={`fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${getStyles()}`}>
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

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({ isOpen, onClose }) => {
  const { user, userId, isAuthenticated, isLoading } = useAuth();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [showUserId, setShowUserId] = useState(false);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);


  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Load last activity date
  useEffect(() => {
    if (isOpen && userId && isAuthenticated) {
      loadLastActivity();
    }
  }, [isOpen, userId, isAuthenticated]);

  const loadLastActivity = async () => {
    if (!userId) return;

    setIsLoadingActivity(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/records`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
          'X-User-ID': userId,
        }
      });

      if (response.ok) {
        const transactions = await response.json();
        
        if (transactions.length > 0) {
          // Get the most recent transaction date
          const sortedTransactions = transactions.sort((a: any, b: any) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setLastActivity(sortedTransactions[0].date);
        } else {
          // No transactions, use today's date
          setLastActivity(new Date().toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      console.error('Error loading last activity:', error);
      // Fallback to today's date
      setLastActivity(new Date().toISOString().split('T')[0]);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const handleClose = () => {
    addToast({
      type: 'info',
      message: 'Account panel closed',
      duration: 1500
    });
    onClose();
  };

  const handleCopyUserId = async () => {
    if (!userId) return;
    
    try {
      await navigator.clipboard.writeText(userId);
      addToast({
        type: 'success',
        message: 'User ID copied to clipboard',
        duration: 2000
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to copy User ID'
      });
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const getUserDisplayName = () => {
    if (!user) return 'User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email?.split('@')[0] || 'User';
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-0 shadow-xl transition-all duration-300">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading account...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isAuthenticated || !userId) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-0 shadow-xl transition-all duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Authentication Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Please log in to view your account information.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {toasts.map(toast => (
        <Toast key={toast.id} notification={toast} onRemove={removeToast} />
      ))}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-card border-0 shadow-xl transition-all duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                My Account
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClose}
                className="transition-all duration-200 hover:scale-[1.05] hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Profile Content */}
          <div className="space-y-6 mt-4">
            {/* Profile Header */}
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 transition-all duration-300 hover:scale-[1.05]">
                <span className="text-2xl font-bold text-white">{getUserInitials()}</span>
              </div>
              <h2 className="text-xl font-semibold">{getUserDisplayName()}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>

            {/* Account Info Cards */}
            <div className="grid gap-4">
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-xs text-muted-foreground">{user?.email || 'Not available'}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Verified</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100">
                        <Shield className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">User ID</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {showUserId ? userId : `${userId?.slice(0, 8)}...`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowUserId(!showUserId)}
                        className="h-8 w-8 p-0 transition-all duration-200 hover:bg-purple-100"
                      >
                        {showUserId ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopyUserId}
                        className="h-8 w-8 p-0 transition-all duration-200 hover:bg-purple-100"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Activity</p>
                      <p className="text-xs text-muted-foreground">
                        {isLoadingActivity ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          lastActivity ? formatDate(lastActivity) : 'Today'
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Status */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 transition-all duration-300 hover:shadow-lg hover:scale-[1.005]">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">Account Active</span>
                </div>
                <p className="text-sm text-green-700">
                  Your SpendSmart account is in good standing
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};