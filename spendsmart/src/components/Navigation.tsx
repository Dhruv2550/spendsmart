import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Home, BarChart3, Settings, Menu, X, TrendingUp, Repeat, Package, CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

// Toast notification system
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
  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pendingPage, setPendingPage] = useState<string | null>(null);

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

  // Optimistic page navigation
  const handlePageChange = async (pageId: string) => {
    if (pageId === currentPage || isNavigating) return;

    // Immediate UI updates
    setIsNavigating(true);
    setPendingPage(pageId);
    setIsOpen(false); // Close mobile menu immediately

    const pageLabel = navigation.find(item => item.id === pageId)?.label || pageId;

    try {
      // Optimistic navigation - update immediately
      onPageChange(pageId);
      
      // Simulate background loading/preparation
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      // Error handling with rollback option
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

  // Optimistic mobile menu toggle
  const handleMenuToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    // Provide subtle feedback for menu state changes
    addToast({
      type: 'info',
      message: newState ? 'Menu opened' : 'Menu closed',
      duration: 1500
    });
  };

  // Handle overlay click with feedback
  const handleOverlayClick = () => {
    setIsOpen(false);
    addToast({
      type: 'info',
      message: 'Menu closed',
      duration: 1500
    });
  };

  // Get navigation item display state
  const getNavigationItemState = (itemId: string) => {
    const isActive = currentPage === itemId;
    const isPending = pendingPage === itemId && isNavigating;
    const isDisabled = isNavigating && itemId !== pendingPage;
    
    return { isActive, isPending, isDisabled };
  };

  return (
    <>
      {/* Toast notifications */}
      {toasts.map(toast => (
        <Toast key={toast.id} notification={toast} onRemove={removeToast} />
      ))}

      {/* Mobile Menu Button */}
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

      {/* Sidebar */}
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

        {/* Navigation Status Indicator */}
        {isNavigating && (
          <div className="absolute bottom-4 left-4 right-4">
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

        {/* Footer */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-xs text-muted-foreground text-center transition-opacity duration-200 hover:opacity-80">
            SpendSmart v2.0
          </div>
        </div>
      </div>

      {/* Overlay */}
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