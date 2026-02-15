import { Check, ChevronLeft } from "lucide-react";

interface StepInfo {
  title: string;
  subtitle: string;
}

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  steps?: StepInfo[];
}

const WizardProgress = ({ currentStep, totalSteps, onBack, steps }: WizardProgressProps) => {
  const defaultSteps: StepInfo[] = [
    { title: "Película", subtitle: "Datos del film" },
    { title: "Fechas", subtitle: "Calendario" },
    { title: "Inversión", subtitle: "Plataformas" },
    { title: "Materiales", subtitle: "Creatividades" },
    { title: "Resumen", subtitle: "Enviar campaña" },
  ];

  const stepData = steps || defaultSteps.slice(0, totalSteps);

  const getStatus = (step: number) => {
    if (step < currentStep) return "completed";
    if (step === currentStep) return "current";
    return "pending";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "COMPLETADO";
      case "current": return "PASO ACTUAL";
      default: return "PENDIENTE";
    }
  };

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-center gap-2 md:gap-0">
        {/* Back button */}
        {currentStep > 1 && onBack && (
          <button
            onClick={onBack}
            className="flex-shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors mr-2 md:mr-4"
            aria-label="Volver al paso anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {currentStep === 1 && <div className="w-0 md:w-0" />}

        {/* Steps */}
        <div className="flex-1 flex items-stretch overflow-x-auto gap-0" style={{ scrollbarWidth: 'none' }}>
          {stepData.map((step, index) => {
            const stepNum = index + 1;
            const status = getStatus(stepNum);

            return (
              <div
                key={stepNum}
                className={`flex-1 min-w-0 px-2 md:px-4 py-2 flex flex-col items-start relative transition-all ${status === "current" ? "opacity-100" : status === "completed" ? "opacity-80" : "opacity-45"
                  }`}
              >
                {/* Status label */}
                <span
                  className={`text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 whitespace-nowrap ${status === "completed"
                    ? "text-green-400"
                    : status === "current"
                      ? "text-primary"
                      : "text-muted-foreground"
                    }`}
                >
                  {getStatusLabel(status)}
                  {status === "completed" && (
                    <Check className="inline-block w-3 h-3 ml-1 -mt-0.5" />
                  )}
                </span>

                {/* Step title */}
                <p className={`text-sm md:text-base font-semibold whitespace-nowrap truncate w-full ${status === "current" ? "text-cinema-ivory" : status === "completed" ? "text-cinema-ivory/80" : "text-muted-foreground"
                  }`}>
                  {stepNum}. {step.title}
                </p>

                {/* Step subtitle */}
                <p className="text-[11px] md:text-xs text-muted-foreground whitespace-nowrap truncate w-full mt-0.5">
                  {step.subtitle}
                </p>

                {/* Active indicator bar */}
                {status === "current" && (
                  <div className="absolute bottom-0 left-2 right-2 md:left-4 md:right-4 h-[3px] bg-primary rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WizardProgress;
