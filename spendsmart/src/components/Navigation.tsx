import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Home, BarChart3, Settings, Menu, X, TrendingUp, Repeat, Package, CheckCircle, AlertCircle, Info, Loader2, LogOut, User } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { UserAccountModal } from "./UserAccountModal"; // Import the new component

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

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Navigation = ({ currentPage, onPageChange }: NavigationProps) => {
  const { user, logout, userId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pendingPage, setPendingPage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false); // Add state for account modal

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "goals", label: "Goals", icon: TrendingUp },
    { id: "recurring", label: "Recurring", icon: Repeat },
    { id: "budgeting", label: "Budgeting", icon: Package },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setIsOpen(false);

    addToast({
      type: 'info',
      message: 'Logging out...',
      duration: 2000
    });

    try {
      await logout();
      
      addToast({
        type: 'success',
        message: 'Successfully logged out',
        duration: 1500
      });
    } catch (error) {
      console.error('Logout error:', error);
      addToast({
        type: 'error',
        message: 'Failed to logout. Please try again.',
        duration: 4000
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handlePageChange = async (pageId: string) => {
    if (pageId === currentPage || isNavigating) return;

    setIsNavigating(true);
    setPendingPage(pageId);
    setIsOpen(false);

    const pageLabel = navigation.find(item => item.id === pageId)?.label || pageId;

    try {
      onPageChange(pageId);
      
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.error('Navigation error:', error);
      addToast({
        type: 'error',
        message: `Failed to load ${pageLabel}. Please try again.`
      });
    } finally {
      setIsNavigating(false);
      setPendingPage(null);
    }
  };

  const handleMenuToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    addToast({
      type: 'info',
      message: newState ? 'Menu opened' : 'Menu closed',
      duration: 1500
    });
  };

  const handleOverlayClick = () => {
    setIsOpen(false);
    addToast({
      type: 'info',
      message: 'Menu closed',
      duration: 1500
    });
  };

  // Handle user panel click
  const handleUserPanelClick = () => {
    setShowAccountModal(true);
    addToast({
      type: 'info',
      message: 'Opening account information',
      duration: 2000
    });
  };

  const getNavigationItemState = (itemId: string) => {
    const isActive = currentPage === itemId;
    const isPending = pendingPage === itemId && isNavigating;
    const isDisabled = isNavigating && itemId !== pendingPage;
    
    return { isActive, isPending, isDisabled };
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || 'User';
  };

  return (
    <>
      {toasts.map(toast => (
        <Toast key={toast.id} notification={toast} onRemove={removeToast} />
      ))}

      {/* User Account Modal */}
      <UserAccountModal 
        isOpen={showAccountModal} 
        onClose={() => setShowAccountModal(false)} 
      />

      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={handleMenuToggle}
          className="bg-card shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.05] active:scale-[0.98]"
        >
          {isOpen ? (
            <X className="h-4 w-4 transition-transform duration-200" />
          ) : (
            <Menu className="h-4 w-4 transition-transform duration-200" />
          )}
        </Button>
      </div>

      <div className={cn(
        "fixed left-0 top-0 h-full w-64 bg-card border-r shadow-lg transform transition-all duration-300 z-40",
        "lg:translate-x-0",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="p-6 transition-all duration-200">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent transition-all duration-300 hover:scale-[1.02]">
            SpendSmart
          </h2>
          <p className="text-sm text-muted-foreground mt-1 transition-colors duration-200">
            Financial Dashboard
          </p>
        </div>

        {/* Clickable User Panel */}
        <div className="px-4 mb-4">
          <button
            onClick={handleUserPanelClick}
            className="w-full bg-secondary/30 rounded-lg p-3 transition-all duration-200 hover:bg-secondary/50 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center transition-colors duration-200 hover:bg-primary/20">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userId ? `ID: ${userId.substring(0, 8)}...` : 'Account Active'}
                </p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              </div>
            </div>
          </button>
        </div>

        <nav className="px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const { isActive, isPending, isDisabled } = getNavigationItemState(item.id);
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11 transition-all duration-200",
                  isActive && "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md",
                  !isActive && !isDisabled && "hover:bg-secondary/80 hover:scale-[1.02] hover:shadow-sm",
                  isPending && "opacity-80 cursor-wait",
                  isDisabled && "opacity-50 cursor-not-allowed",
                  !isDisabled && "active:scale-[0.98]"
                )}
                onClick={() => handlePageChange(item.id)}
                disabled={isDisabled}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className={cn(
                    "h-4 w-4 transition-all duration-200",
                    isActive && "drop-shadow-sm"
                  )} />
                )}
                <span className={cn(
                  "transition-all duration-200",
                  isPending && "opacity-80"
                )}>
                  {item.label}
                </span>
                {isPending && (
                  <div className="ml-auto">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-current rounded-full animate-pulse"></div>
                      <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                )}
              </Button>
            );
          })}
        </nav>

        <div className="absolute bottom-20 left-4 right-4">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "w-full justify-start gap-3 h-11 transition-all duration-200",
              "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-300",
              "dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300",
              !isLoggingOut && "hover:scale-[1.02] active:scale-[0.98]",
              isLoggingOut && "opacity-80 cursor-wait"
            )}
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span className={cn(
              "transition-all duration-200",
              isLoggingOut && "opacity-80"
            )}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </span>
          </Button>
        </div>

        {isNavigating && (
          <div className="absolute bottom-32 left-4 right-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 transition-all duration-300">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-primary font-medium">
                  Loading {navigation.find(item => item.id === pendingPage)?.label}...
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-xs text-muted-foreground text-center transition-opacity duration-200 hover:opacity-80">
            SpendSmart v2.0
          </div>
        </div>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden transition-all duration-300"
          onClick={handleOverlayClick}
        />
      )}
    </>
  );
};

export default Navigation;