import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Wizard from "./pages/Wizard";
import QuickWizard from "./pages/QuickWizard";
import Confirmation from "./pages/Confirmation";
import CampaignsHistory from "./pages/CampaignsHistory";
import Admin from "./pages/Admin";
import AdminDistributors from "./pages/AdminDistributors";
import CampaignDetail from "./pages/CampaignDetail";
import ProposalView from "./pages/ProposalView";
import CasosExito from "./pages/CasosExito";
import DemoWizard from "./pages/DemoWizard";
import TeamManagement from "./pages/TeamManagement";
import ResetPassword from "./pages/ResetPassword";
import MediaPlanEditor from "./pages/MediaPlanEditor";
import MediaPlanView from "./pages/MediaPlanView";
import NotFound from "./pages/NotFound";
import SmoothScroll from "./components/SmoothScroll";
import GlobalChatWidget from "./components/chat/GlobalChatWidget";
import { useAccessLogger } from "./hooks/useAccessLogger";

const queryClient = new QueryClient();

// Create a wrapper component to use the hook inside the provider context (if needed)
// or just to keep the main App clean.
const AppContent = () => {
  useAccessLogger(); // Log access on mount/session start

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <SmoothScroll>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/wizard" element={<Wizard />} />
            <Route path="/wizard/review/:campaignId" element={<Wizard />} />
            <Route path="/quick-wizard" element={<QuickWizard />} />
            <Route path="/campaigns" element={<CampaignsHistory />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/campaigns/:id/proposal" element={<ProposalView />} />
            <Route path="/confirmation" element={<Confirmation />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/distributors" element={<AdminDistributors />} />
            <Route path="/admin/media-plan/:campaignId" element={<MediaPlanEditor />} />
            <Route path="/campaigns/:id/media-plan" element={<MediaPlanView />} />
            <Route path="/team" element={<TeamManagement />} />
            <Route path="/casos-exito" element={<CasosExito />} />
            <Route path="/demo" element={<DemoWizard />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <GlobalChatWidget />
        </BrowserRouter>
      </SmoothScroll>
    </TooltipProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
