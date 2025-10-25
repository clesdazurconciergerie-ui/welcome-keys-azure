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
import BookletWizardPage from "./pages/BookletWizardPage";
import NotFound from "./pages/NotFound";
import ExampleProprietaires from "./pages/ExampleProprietaires";
import ExampleConciergeries from "./pages/ExampleConciergeries";
import ExampleMaisonsDHotes from "./pages/ExampleMaisonsDHotes";
import ExampleHotelsResidences from "./pages/ExampleHotelsResidences";

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
          <Route path="/booklets/:id/wizard" element={<BookletWizardPage />} />
          <Route path="/view/:code" element={<ViewBooklet />} />
          <Route path="/preview/:id" element={<PreviewBooklet />} />
          <Route path="/exemples/proprietaires" element={<ExampleProprietaires />} />
          <Route path="/exemples/conciergeries" element={<ExampleConciergeries />} />
          <Route path="/exemples/maisons-d-hotes" element={<ExampleMaisonsDHotes />} />
          <Route path="/exemples/hotels-residences" element={<ExampleHotelsResidences />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
