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
import DemoDashboardLayout from "./layouts/DemoDashboardLayout";
import DemoDashboardHome from "./pages/demo/DemoDashboardHome";
import DemoLogementsPage from "./pages/demo/DemoLogementsPage";
import DemoMissionsPage from "./pages/demo/DemoMissionsPage";
import DemoInspectionsPage from "./pages/demo/DemoInspectionsPage";
import DemoLivretsPage from "./pages/demo/DemoLivretsPage";
import DemoFinancePage from "./pages/demo/DemoFinancePage";
import DemoProspectionPage from "./pages/demo/DemoProspectionPage";
import DemoProprietairesPage from "./pages/demo/DemoProprietairesPage";
import DemoPrestatairesPage from "./pages/demo/DemoPrestatairesPage";
import DashboardLayout from "./layouts/DashboardLayout";
import { DashboardErrorBoundary } from "./components/DashboardErrorBoundary";
import OwnerDashboardLayout from "./layouts/OwnerDashboardLayout";
import ServiceProviderDashboardLayout from "./layouts/ServiceProviderDashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import LivretsPage from "./pages/dashboard/LivretsPage";
import ProprietairesPage from "./pages/dashboard/ProprietairesPage";
import LogementsPage from "./pages/dashboard/LogementsPage";
import PropertyDetailPage from "./pages/dashboard/PropertyDetailPage";
import PrestatairesPage from "./pages/dashboard/PrestatairesPage";
import MissionsPage from "./pages/dashboard/MissionsPage";
// InterventionsPage removed — missions is the single source
import ProspectionPage from "./pages/dashboard/ProspectionPage";
import PerformancePage from "./pages/dashboard/PerformancePage";
import AbonnementPage from "./pages/dashboard/AbonnementPage";
import ParametresPage from "./pages/dashboard/ParametresPage";
import CallPrompterPage from "./pages/dashboard/CallPrompterPage";
import AutomationPage from "./pages/dashboard/AutomationPage";
import BrandingPage from "./pages/dashboard/BrandingPage";
import HelpCenterPage from "./pages/dashboard/HelpCenterPage";
import OwnerDashboardHome from "./pages/owner/OwnerDashboardHome";
import OwnerPropertiesPage from "./pages/owner/OwnerPropertiesPage";
import OwnerBookletsPage from "./pages/owner/OwnerBookletsPage";
import OwnerInspectionsPage from "./pages/owner/OwnerInspectionsPage";
import OwnerDocumentsPage from "./pages/owner/OwnerDocumentsPage";
import OwnerAccountPage from "./pages/owner/OwnerAccountPage";
import OwnerCalendarPage from "./pages/owner/OwnerCalendarPage";
import OwnerRequestsPage from "./pages/owner/OwnerRequestsPage";
import OwnerRequestsAdminPage from "./pages/dashboard/OwnerRequestsAdminPage";
import SPDashboardHome from "./pages/service-provider/SPDashboardHome";
import SPMissionsUnifiedPage from "./pages/service-provider/SPMissionsUnifiedPage";
import SPPlanningPage from "./pages/service-provider/SPPlanningPage";
import SPHistoryPage from "./pages/service-provider/SPHistoryPage";
import SPPaymentsPage from "./pages/service-provider/SPPaymentsPage";
import SPMaterialPage from "./pages/service-provider/SPMaterialPage";
import SPSupportPage from "./pages/service-provider/SPSupportPage";
import SPSettingsPage from "./pages/service-provider/SPSettingsPage";
import SPAccountPage from "./pages/service-provider/SPAccountPage";
import FinancePage from "./pages/dashboard/FinancePage";
import InspectionsPage from "./pages/dashboard/InspectionsPage";
import OwnerFinancesPage from "./pages/owner/OwnerFinancesPage";

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
          <Route path="/dashboard" element={<DashboardErrorBoundary><DashboardLayout /></DashboardErrorBoundary>}>
            <Route index element={<DashboardHome />} />
            <Route path="livrets" element={<LivretsPage />} />
            <Route path="proprietaires" element={<ProprietairesPage />} />
            <Route path="logements" element={<LogementsPage />} />
            <Route path="logements/:id" element={<PropertyDetailPage />} />
            <Route path="prestataires" element={<PrestatairesPage />} />
            {/* Interventions removed — missions is the single source */}
            <Route path="missions" element={<MissionsPage />} />
            <Route path="etats-des-lieux" element={<InspectionsPage />} />
            <Route path="prospection" element={<ProspectionPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="demandes-proprietaires" element={<OwnerRequestsAdminPage />} />
            <Route path="call-prompter" element={<CallPrompterPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="abonnement" element={<AbonnementPage />} />
            <Route path="parametres" element={<ParametresPage />} />
            <Route path="automatisation" element={<AutomationPage />} />
            <Route path="branding" element={<BrandingPage />} />
            <Route path="aide" element={<HelpCenterPage />} />
          </Route>

          {/* Owner dashboard */}
          <Route path="/proprietaire" element={<OwnerDashboardLayout />}>
            <Route index element={<OwnerDashboardHome />} />
            <Route path="biens" element={<OwnerPropertiesPage />} />
            <Route path="calendrier" element={<OwnerCalendarPage />} />
            <Route path="livrets" element={<OwnerBookletsPage />} />
            <Route path="etats-des-lieux" element={<OwnerInspectionsPage />} />
            <Route path="documents" element={<OwnerDocumentsPage />} />
            <Route path="demandes" element={<OwnerRequestsPage />} />
            <Route path="finances" element={<OwnerFinancesPage />} />
            <Route path="compte" element={<OwnerAccountPage />} />
          </Route>

          {/* Service provider dashboard */}
          <Route path="/prestataire" element={<ServiceProviderDashboardLayout />}>
            <Route index element={<SPDashboardHome />} />
            <Route path="missions" element={<SPMissionsUnifiedPage />} />
            <Route path="historique" element={<SPHistoryPage />} />
            <Route path="paiements" element={<SPPaymentsPage />} />
            <Route path="materiel" element={<SPMaterialPage />} />
            <Route path="support" element={<SPSupportPage />} />
            <Route path="parametres" element={<SPSettingsPage />} />
            <Route path="compte" element={<SPAccountPage />} />
          </Route>

          <Route path="/booklets/new" element={<NewBooklet />} />
          <Route path="/booklets/:id/edit" element={<EditBookletWrapper />} />
          <Route path="/booklets/:id/wizard" element={<BookletWizardPage />} />
          <Route path="/view/:code" element={<ViewBooklet />} />
          <Route path="/preview/:id" element={<PreviewBooklet />} />
          {/* Demo dashboard with real layout */}
          <Route path="/demo" element={<DemoDashboardLayout />}>
            <Route index element={<DemoDashboardHome />} />
            <Route path="logements" element={<DemoLogementsPage />} />
            <Route path="proprietaires" element={<DemoProprietairesPage />} />
            <Route path="prestataires" element={<DemoPrestatairesPage />} />
            <Route path="missions" element={<DemoMissionsPage />} />
            <Route path="etats-des-lieux" element={<DemoInspectionsPage />} />
            <Route path="livrets" element={<DemoLivretsPage />} />
            <Route path="finance" element={<DemoFinancePage />} />
            <Route path="prospection" element={<DemoProspectionPage />} />
          </Route>
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
