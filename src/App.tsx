import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import Landing from "./pages/Landing";
import Wizard from "./pages/Wizard";
import Confirmation from "./pages/Confirmation";
import CampaignsHistory from "./pages/CampaignsHistory";
import Admin from "./pages/Admin";
import AdminDistributors from "./pages/AdminDistributors";
import CampaignDetail from "./pages/CampaignDetail";
import CasosExito from "./pages/CasosExito";
import DemoWizard from "./pages/DemoWizard";
import TeamManagement from "./pages/TeamManagement";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { performCompleteReset, isTestingMode } from "./utils/testingUtils";
import SmoothScroll from "./components/SmoothScroll";
import GlobalChatWidget from "./components/chat/GlobalChatWidget";
import { useAccessLogger } from "./hooks/useAccessLogger";

const queryClient = new QueryClient();

// Create a wrapper component to use the hook inside the provider context (if needed)
// or just to keep the main App clean.
const AppContent = () => {
  useAccessLogger(); // Log access on mount/session start

  const showTestingButton = isTestingMode();

  const handleCompleteReset = async () => {
    const confirmed = window.confirm(
      "⚠️ RESET COMPLETO\n\n" +
      "Esto eliminará:\n" +
      "• Todas las sesiones de usuario\n" +
      "• Borradores de campañas guardados\n" +
      "• Cookies y datos locales\n" +
      "• Cache de la aplicación\n\n" +
      "¿Continuar?"
    );

    if (confirmed) {
      await performCompleteReset();
      toast.success("Reset completo ejecutado. Recargando...", {
        duration: 2000,
      });

      // Recargar la página después de 2 segundos
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
  };

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />

      {/* Botón temporal de reset solo visible en modo testing */}
      {showTestingButton && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={handleCompleteReset}
            variant="outline"
            size="sm"
            className="bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20 shadow-lg"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset completo de pruebas
          </Button>
        </div>
      )}

      <SmoothScroll>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/wizard" element={<Wizard />} />
            <Route path="/campaigns" element={<CampaignsHistory />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/confirmation" element={<Confirmation />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/distributors" element={<AdminDistributors />} />
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
