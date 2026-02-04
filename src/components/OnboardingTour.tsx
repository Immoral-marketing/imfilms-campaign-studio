import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Clapperboard, LayoutDashboard, MessageSquare, Calendar, HelpCircle } from 'lucide-react';
import HelpTooltip from '@/components/HelpTooltip';

interface OnboardingTourProps {
  onComplete: (persist: boolean) => void;
  onSkip: (persist: boolean) => void;
}

const tourSteps = [
  {
    title: 'Configura tu estreno paso a paso',
    description:
      'Este wizard te guía para definir tu campaña: datos de la película, fechas clave, plataformas, inversión y extras. Solo necesitas seguir las preguntas; nosotros traducimos todo a una estrategia digital clara.',
    icon: Clapperboard,
    highlights: [
      'Formulario sencillo sin tecnicismos',
      'Detección automática de conflictos entre audiencias y fechas con otras películas',
      'Estimación de alcance al instante',
    ],
    highlightTooltips: [
      null,
      'El sistema no permite que aceptemos una segunda campaña de una película que se dirige a la misma audiencia y que se solapa en fechas con otra película que ya tengamos en campaña o planificada con otra distribuidora. La primera en planificar su película es la que se gana el asiento.',
      null,
    ],
  },
  {
    title: '¿Qué pasa cuando envías una campaña?',
    description:
      'Cuando envías una campaña, nuestro equipo la revisa, te confirma la viabilidad y, si todo encaja, la activamos en las fechas acordadas. Siempre verás el estado y los siguientes pasos desde tu panel.',
    icon: Calendar,
    highlights: [
      'Revisión en 24-48h',
      'Validación de estrategia',
      'Notificaciones de cada cambio de estado',
    ],
  },
  {
    title: 'Nunca estás sola en esto',
    description:
      'Si tienes dudas, aquí encontrarás respuestas rápidas, ejemplos y un botón para hablar con nuestro equipo. No necesitas ser experto o experta en marketing digital: te acompañamos en todo el proceso.',
    icon: HelpCircle,
    highlights: [
      'Centro de ayuda con FAQ y guías',
      'Tooltips en cada campo del wizard',
      'Soporte personalizado siempre disponible',
    ],
  },
  {
    title: 'Así lees el estado de tu campaña',
    description:
      'Verás en qué fase está tu campaña (revisión, creatividades, activa, finalizada), las fechas clave y qué viene después. Piénsalo como el tracking de un pedido, pero para tu estreno.',
    icon: LayoutDashboard,
    highlights: [
      'Estados claros y transparentes',
      'Timeline visual del proceso',
      'Próximos pasos siempre visibles',
    ],
  },
  {
    title: 'Tu histórico de estrenos con imfilms',
    description:
      'Aquí tendrás todas tus campañas, reportes y próximos estrenos que trabajemos juntos. Es tu base de operaciones para revisar resultados y planificar lo siguiente.',
    icon: MessageSquare,
    highlights: [
      'Vista general de todas tus campañas',
      'Acceso a reportes finales',
      'Historial completo de tu trabajo con imfilms',
    ],
  },
];

const OnboardingTour = ({ onComplete, onSkip }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [open, setOpen] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setOpen(false);
    onComplete(dontShowAgain);
  };

  const handleSkip = () => {
    setOpen(false);
    onSkip(dontShowAgain);
  };

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="font-cinema text-2xl">{step.title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Paso {currentStep + 1} de {tourSteps.length}
              </p>
            </div>
          </div>
          <DialogDescription className="text-base pt-2">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {step.highlights.map((highlight, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-yellow-400/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                <span className="text-yellow-400 text-xs">✓</span>
              </div>
              <p className="text-sm text-foreground/80 flex-1">{highlight}</p>
              {step.highlightTooltips && step.highlightTooltips[index] && (
                <HelpTooltip
                  content={step.highlightTooltips[index]!}
                  title="Política de conflictos"
                />
              )}
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-2">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${index === currentStep
                ? 'w-8 bg-primary'
                : index < currentStep
                  ? 'w-2 bg-primary/40'
                  : 'w-2 bg-muted'
                }`}
            />
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip} className="sm:mr-auto">
            Saltar tour
          </Button>
          <Button onClick={handleNext} className="cinema-glow">
            {isLastStep ? '¡Empezar!' : 'Siguiente'}
          </Button>
        </DialogFooter>

        <div className="flex items-center justify-center space-x-2 pt-4 mt-2 border-t border-border/40">
          <Checkbox
            id="dontShowAgain"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(!!checked)}
            className="border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label
            htmlFor="dontShowAgain"
            className="text-sm font-medium leading-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          >
            No volver a mostrar este tour
          </Label>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingTour;
