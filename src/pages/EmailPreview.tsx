/**
 * EmailPreview — standalone page at /email-preview
 * Admin-only local preview of all transactional email templates.
 */
import { NavbarAdmin } from '@/components/NavbarAdmin';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmailPreviewPanel } from '@/components/EmailPreviewPanel';

const EmailPreview = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#141416] text-cinema-ivory">
      <NavbarAdmin />

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-12">
        <Button variant="ghost" onClick={() => navigate('/campaigns')} className="mb-6 text-muted-foreground hover:text-cinema-ivory -ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>

        <div className="mb-6">
          <h1 className="font-cinema text-3xl tracking-wide">PREVIEW DE EMAILS</h1>
          <p className="text-sm text-muted-foreground mt-1">Vista previa de todos los emails transaccionales que se envían a los usuarios</p>
        </div>

        <EmailPreviewPanel height="calc(100vh - 240px)" />
      </div>
    </div>
  );
};

export default EmailPreview;
