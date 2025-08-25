// AppLayout.tsx - Updated to use React Router instead of page state
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import Dashboard from './Dashboard';
import GoalsPage from './GoalsPage';
import RecurringTransactionsPage from './RecurringTransactionsPage';
import EnvelopeBudgetingPage from './EnvelopeBudgetingPage';
import AnalyticsPage from './AnalyticsPage';
// import SettingsPage from './SettingsPage'; // Uncomment when you create this

interface AppLayoutProps {
  currentPage: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ currentPage }) => {
  const navigate = useNavigate();
  
  // Settings for your app - you can move these to context later if needed
  const [monthlySavings] = useState(2000);
  const [expenseLimit] = useState(3000);

  const handlePageChange = (page: string) => {
    // Use React Router navigation instead of state
    navigate(`/${page}`);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard monthlySavings={monthlySavings} expenseLimit={expenseLimit} />;
      case 'analytics':
        return <AnalyticsPage monthlySavings={monthlySavings} />;
      case 'goals':
        return <GoalsPage />;
      case 'recurring':
        return <RecurringTransactionsPage />;
      case 'budgeting':
        return <EnvelopeBudgetingPage />;
      case 'settings':
        // return <SettingsPage />; // Uncomment when you create this component
        return (
          <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-primary mb-2">Settings</h2>
              <p className="text-muted-foreground">Settings page coming soon!</p>
            </div>
          </div>
        );
      default:
        return <Dashboard monthlySavings={monthlySavings} expenseLimit={expenseLimit} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Navigation 
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        {renderCurrentPage()}
      </main>
    </div>
  );
};

export default AppLayout;