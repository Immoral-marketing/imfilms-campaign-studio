import { useState } from "react";
import AuthModal from "./AuthModal";

interface UnlockBudgetGateProps {
  message?: string;
  onSuccess?: () => void;
}

const UnlockBudgetGate = ({ 
  message = "Cuando crees tu cuenta de distribuidora te mostraremos la estimación económica completa para esta configuración, sin compromiso.",
  onSuccess
}: UnlockBudgetGateProps) => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSuccess = () => {
    setShowAuthModal(false);
    if (onSuccess) onSuccess();
  };

  return (
    <>
      <button
        onClick={() => setShowAuthModal(true)}
        className="text-cinema-ivory hover:text-primary transition-colors underline decoration-primary/50 hover:decoration-primary text-left w-full"
      >
        {message}
      </button>

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default UnlockBudgetGate;
