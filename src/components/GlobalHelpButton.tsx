import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HelpCenterEnhanced from '@/components/HelpCenterEnhanced';
import { useOnboarding } from '@/hooks/useOnboarding';

interface GlobalHelpButtonProps {
  context?: string;
}

const GlobalHelpButton = ({ context }: GlobalHelpButtonProps) => {
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const { resetOnboarding } = useOnboarding();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowHelpCenter(true)}
        className="gap-2 fixed bottom-6 right-6 z-50 shadow-lg cinema-glow pointer-events-auto"
      >
        <HelpCircle className="h-4 w-4" />
        Ayuda
      </Button>
      
      <HelpCenterEnhanced
        open={showHelpCenter}
        onOpenChange={setShowHelpCenter}
        initialContext={context}
      />
    </>
  );
};

export default GlobalHelpButton;
