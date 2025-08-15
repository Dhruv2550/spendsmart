import { useState, useRef } from "react";
import Navigation from "./Navigation";
import Dashboard from "./Dashboard";
import AnalyticsPage from "./AnalyticsPage";
import SettingsPage from "./SettingsPage";
import GoalsPage from "./GoalsPage";
import RecurringTransactionsPage from "./RecurringTransactionsPage";
import EnvelopeBudgetingPage from "./EnvelopeBudgetingPage";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContainer = ({ toasts, removeToast }: { 
  toasts: Toast[]; 
  removeToast: (id: number) => void;
}) => (
  <div className="fixed top-4 right-4 z-50 space-y-2">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`max-w-md px-4 py-3 rounded-lg shadow-lg border flex items-center justify-between animate-in slide-in-from-right-full duration-300 ${
          toast.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}
      >
        <div className="flex items-center gap-2">
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="ml-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ))}
  </div>
);

const AppLayout = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sharedBudget, setSharedBudget] = useState(2000);
  const [sharedExpenseLimit, setSharedExpenseLimit] = useState(3000);
  const [pageTransitioning, setPageTransitioning] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const toastIdRef = useRef(0);

  const addToast = (message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const id = ++toastIdRef.current;
    const newToast: Toast = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => removeToast(id), duration);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const optimisticPageChange = (newPage: string) => {
    const pageNames: { [key: string]: string } = {
      dashboard: 'Dashboard',
      goals: 'Goals',
      analytics: 'Analytics', 
      recurring: 'Recurring Transactions',
      budgeting: 'Envelope Budgeting',
      settings: 'Settings'
    };

    setPageTransitioning(true);
    setCurrentPage(newPage);
    
    setTimeout(() => setPageTransitioning(false), 300);
  };

  const optimisticBudgetChange = (newBudget: number) => {
    const oldBudget = sharedBudget;
    setSharedBudget(newBudget);
    
    const change = newBudget - oldBudget;
    const changeText = change > 0 ? `increased by $${change}` : `decreased by $${Math.abs(change)}`;
    
    addToast(`Monthly budget ${changeText} to $${newBudget.toLocaleString()}`, 'success', 3000);
  };

  const optimisticExpenseLimitChange = (newLimit: number) => {
    const oldLimit = sharedExpenseLimit;
    setSharedExpenseLimit(newLimit);
    
    const change = newLimit - oldLimit;
    const changeText = change > 0 ? `increased by $${change}` : `decreased by $${Math.abs(change)}`;
    
    addToast(`Expense limit ${changeText} to $${newLimit.toLocaleString()}`, 'success', 3000);
  };

  const renderPage = () => {
    const pageProps = {
      className: `transition-all duration-300 ${pageTransitioning ? 'opacity-75 scale-[0.99]' : 'opacity-100 scale-100'}`
    };

    switch (currentPage) {
      case "dashboard":
        return (
          <div {...pageProps}>
            <Dashboard monthlySavings={sharedBudget} expenseLimit={sharedExpenseLimit} />
          </div>
        );
      case "goals":
        return (
          <div {...pageProps}>
            <GoalsPage />
          </div>
        );
      case "analytics":
        return (
          <div {...pageProps}>
            <AnalyticsPage monthlySavings={sharedBudget} />
          </div>
        );
      case "recurring":
        return (
          <div {...pageProps}>
            <RecurringTransactionsPage />
          </div>
        );
      case "budgeting":
        return (
          <div {...pageProps}>
            <EnvelopeBudgetingPage />
          </div>
        );
      case "settings":
        return (
          <div {...pageProps}>
            <SettingsPage 
              monthlySavings={sharedBudget} 
              onBudgetChange={optimisticBudgetChange}
              expenseLimit={sharedExpenseLimit}
              onExpenseLimitChange={optimisticExpenseLimitChange}
            />
          </div>
        );
      default:
        return (
          <div {...pageProps}>
            <Dashboard monthlySavings={sharedBudget} expenseLimit={sharedExpenseLimit} />
          </div>
        );
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
        <Navigation 
          currentPage={currentPage} 
          onPageChange={optimisticPageChange}
        />
        <div className="lg:ml-64 transition-all duration-200">
          {renderPage()}
        </div>
      </div>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};

export default AppLayout;