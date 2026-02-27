import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NewBooklet from "./pages/NewBooklet";
import EditBookletWrapper from "./pages/EditBookletWrapper";
import ViewBooklet from "./pages/ViewBooklet";
import PreviewBooklet from "./pages/PreviewBooklet";
import AccessBooklet from "./pages/AccessBooklet";
import BookletWizardPage from "./pages/BookletWizardPage";
import NotFound from "./pages/NotFound";
import ExampleProprietaires from "./pages/ExampleProprietaires";
import ExampleConciergeries from "./pages/ExampleConciergeries";
import ExampleMaisonsDHotes from "./pages/ExampleMaisonsDHotes";
import ExampleHotelsResidences from "./pages/ExampleHotelsResidences";
import Pricing from "./pages/Pricing";
import BillingSuccess from "./pages/BillingSuccess";
import ExpiredDemoPage from "./components/ExpiredDemoPage";
import DashboardLayout from "./layouts/DashboardLayout";
import OwnerDashboardLayout from "./layouts/OwnerDashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import LivretsPage from "./pages/dashboard/LivretsPage";
import ProprietairesPage from "./pages/dashboard/ProprietairesPage";
import LogementsPage from "./pages/dashboard/LogementsPage";
import PropertyDetailPage from "./pages/dashboard/PropertyDetailPage";
import PrestatairesPage from "./pages/dashboard/PrestatairesPage";
import PerformancePage from "./pages/dashboard/PerformancePage";
import AbonnementPage from "./pages/dashboard/AbonnementPage";
import ParametresPage from "./pages/dashboard/ParametresPage";
import OwnerDashboardHome from "./pages/owner/OwnerDashboardHome";
import OwnerPropertiesPage from "./pages/owner/OwnerPropertiesPage";
import OwnerBookletsPage from "./pages/owner/OwnerBookletsPage";
import OwnerCleaningPhotosPage from "./pages/owner/OwnerCleaningPhotosPage";
import OwnerDocumentsPage from "./pages/owner/OwnerDocumentsPage";
import OwnerAccountPage from "./pages/owner/OwnerAccountPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/tarifs" element={<Pricing />} />
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="/acces-livret" element={<AccessBooklet />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Dashboard with sidebar layout */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="livrets" element={<LivretsPage />} />
            <Route path="proprietaires" element={<ProprietairesPage />} />
            <Route path="logements" element={<LogementsPage />} />
            <Route path="logements/:id" element={<PropertyDetailPage />} />
            <Route path="prestataires" element={<PrestatairesPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="abonnement" element={<AbonnementPage />} />
            <Route path="parametres" element={<ParametresPage />} />
          </Route>

          {/* Owner dashboard (propriétaires créés par conciergerie) */}
          <Route path="/proprietaire" element={<OwnerDashboardLayout />}>
            <Route index element={<OwnerDashboardHome />} />
            <Route path="biens" element={<OwnerPropertiesPage />} />
            <Route path="livrets" element={<OwnerBookletsPage />} />
            <Route path="photos-menage" element={<OwnerCleaningPhotosPage />} />
            <Route path="documents" element={<OwnerDocumentsPage />} />
            <Route path="compte" element={<OwnerAccountPage />} />
          </Route>

          <Route path="/booklets/new" element={<NewBooklet />} />
          <Route path="/booklets/:id/edit" element={<EditBookletWrapper />} />
          <Route path="/booklets/:id/wizard" element={<BookletWizardPage />} />
          <Route path="/view/:code" element={<ViewBooklet />} />
          <Route path="/preview/:id" element={<PreviewBooklet />} />
          <Route path="/expired-demo" element={<ExpiredDemoPage />} />
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
