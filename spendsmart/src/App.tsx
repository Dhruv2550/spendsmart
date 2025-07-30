// src/App.tsx - Updated with Dark Mode Provider
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkModeProvider } from "./contexts/DarkModeContext";
import AppLayout from "./components/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DarkModeProvider>
      <AppLayout />
    </DarkModeProvider>
  </QueryClientProvider>
);

export default App;