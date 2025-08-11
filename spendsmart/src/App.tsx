// src/App.tsx - Revert to your original working version
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