import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TVPanel from "./pages/TVPanel";
import StatusManagement from "./pages/StatusManagement";
import OperatorManagement from "./pages/OperatorManagement";
import WeekendSchedule from "./pages/WeekendSchedule";
import Navigation from "./components/Navigation";
import NotFound from "./pages/NotFound";
import ScaleConfig from "./pages/ScaleConfig";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<TVPanel />} />
          <Route path="/tv-panel" element={<TVPanel />} />
          <Route path="/weekend-schedule" element={<WeekendSchedule />} />
          <Route path="/status" element={<StatusManagement />} />
          <Route path="/operator-management" element={<OperatorManagement />} />
          <Route path="/scale-config" element={<ScaleConfig />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;