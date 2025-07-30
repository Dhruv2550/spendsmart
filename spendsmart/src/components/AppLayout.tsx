import { useState } from "react";
import Navigation from "./Navigation";
import Dashboard from "./Dashboard";
import ReportsPage from "./ReportsPage";
import SettingsPage from "./SettingsPage";
import InvestmentsPage from "./GoalsPage";

const AppLayout = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sharedBudget, setSharedBudget] = useState(2000); // Default starting budget
  const [sharedExpenseLimit, setSharedExpenseLimit] = useState(3000);

  const renderPage = () => {
    console.log("Current page:", currentPage); // Debug line
    
    switch (currentPage) {
      case "dashboard":
        return <Dashboard monthlySavings={sharedBudget} expenseLimit={sharedExpenseLimit} />;
      case "investments":
        console.log("Rendering investments"); // Debug line
        return <InvestmentsPage />;
      case "reports":
        console.log("Rendering reports"); // Debug line
        return <ReportsPage monthlySavings={sharedBudget} />;
      case "settings":
        console.log("Rendering settings"); // Debug line
        return <SettingsPage 
                  monthlySavings={sharedBudget} 
                  onBudgetChange={setSharedBudget}
                  expenseLimit={sharedExpenseLimit}
                  onExpenseLimitChange={setSharedExpenseLimit}/>;
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