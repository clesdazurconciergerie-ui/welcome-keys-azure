import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NewBooklet from "./pages/NewBooklet";
import EditBooklet from "./pages/EditBooklet";
import ViewBooklet from "./pages/ViewBooklet";
import PreviewBooklet from "./pages/PreviewBooklet";
import AccessBooklet from "./pages/AccessBooklet";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/acces-livret" element={<AccessBooklet />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/booklets/new" element={<NewBooklet />} />
          <Route path="/booklets/:id/edit" element={<EditBooklet />} />
          <Route path="/view/:code" element={<ViewBooklet />} />
          <Route path="/preview/:id" element={<PreviewBooklet />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
