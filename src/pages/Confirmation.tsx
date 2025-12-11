import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Home } from "lucide-react";

const Confirmation = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="cinema-card max-w-2xl p-12 text-center space-y-6">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-16 h-16 text-primary cinema-glow" />
          </div>
        </div>
        <h1 className="font-cinema text-5xl text-primary">
          ¡Listo!
        </h1>
        <div className="space-y-4 text-cinema-ivory">
          <p className="text-xl">
            Tu campaña ha sido enviada correctamente.
          </p>
          <p className="text-lg text-muted-foreground">
            Nuestro equipo revisará los detalles y se pondrá en contacto contigo en menos de <strong className="text-primary">24-48 horas</strong>.
          </p>
          <p className="text-base text-muted-foreground">
            Desde ahora puedes acceder a tu <strong className="text-cinema-yellow">panel de distribuidora</strong> donde podrás ver el histórico de tus estrenos y seguir el estado de tus solicitudes.
          </p>
        </div>

        <div className="pt-6 space-y-3">
          <Button
            onClick={() => navigate("/campaigns")}
            className="bg-primary text-primary-foreground hover:bg-secondary w-full"
          >
            Ver mis campañas
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10 w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            Volver al inicio
          </Button>
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground italic">
            "Tu película tiene su público. Nosotros lo llevamos a la sala."
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Confirmation;
