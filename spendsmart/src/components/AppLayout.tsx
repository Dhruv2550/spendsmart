import { useState } from "react";
import Navigation from "./Navigation";
import Dashboard from "./Dashboard";
import AnalyticsPage from "./AnalyticsPage";
import SettingsPage from "./SettingsPage";
import GoalsPage from "./GoalsPage";
import RecurringTransactionsPage from "./RecurringTransactionsPage";
import EnvelopeBudgetingPage from "./EnvelopeBudgetingPage";

const AppLayout = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sharedBudget, setSharedBudget] = useState(2000); // Default starting budget
  const [sharedExpenseLimit, setSharedExpenseLimit] = useState(3000);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard monthlySavings={sharedBudget} expenseLimit={sharedExpenseLimit} />;
      case "goals":
        return <GoalsPage />;
      case "analytics":
        return <AnalyticsPage monthlySavings={sharedBudget} />;
      case "recurring":
        return <RecurringTransactionsPage />;
      case "budgeting":
        return <EnvelopeBudgetingPage />;
      case "settings":
        return <SettingsPage 
                  monthlySavings={sharedBudget} 
                  onBudgetChange={setSharedBudget}
                  expenseLimit={sharedExpenseLimit}
                  onExpenseLimitChange={setSharedExpenseLimit}
                />;
      default:
        return <Dashboard monthlySavings={sharedBudget} expenseLimit={sharedExpenseLimit} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="lg:ml-64 transition-all duration-200">
        {renderPage()}
      </div>
    </div>
  );
};

export default AppLayout;