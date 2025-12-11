import { CheckCircle, Clock, AlertCircle, Calendar, FileText, Play, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TimelineStep {
  status: string;
  label: string;
  icon: React.ElementType;
  date?: string;
  completed: boolean;
  active: boolean;
  description?: string;
}

interface CampaignTimelineProps {
  status: string;
  createdAt: string;
  creativesDeadline?: string;
  premiereStart?: string;
  finalReportDate?: string;
}

const CampaignTimeline = ({
  status,
  createdAt,
  creativesDeadline,
  premiereStart,
  finalReportDate,
}: CampaignTimelineProps) => {
  const statusOrder = [
    'borrador',
    'en_revision',
    'pendiente_creativos',
    'aprobada',
    'activa',
    'finalizada',
  ];

  const currentIndex = statusOrder.indexOf(status);

  const steps: TimelineStep[] = [
    {
      status: 'borrador',
      label: 'Campaña creada',
      icon: CheckCircle,
      date: createdAt,
      completed: currentIndex >= 0,
      active: currentIndex === 0,
      description: 'Tu solicitud de campaña ha sido registrada',
    },
    {
      status: 'en_revision',
      label: 'En revisión por imfilms',
      icon: Clock,
      completed: currentIndex > 1,
      active: currentIndex === 1,
      description: 'Nuestro equipo está revisando tu campaña (24-48h)',
    },
    {
      status: 'pendiente_creativos',
      label: 'Subida de creativos',
      icon: FileText,
      date: creativesDeadline,
      completed: currentIndex > 2,
      active: currentIndex === 2,
      description: creativesDeadline
        ? `Fecha límite: ${format(new Date(creativesDeadline), "d 'de' MMMM", { locale: es })}`
        : 'Pendiente de recibir materiales creativos',
    },
    {
      status: 'aprobada',
      label: 'Campaña aprobada',
      icon: CheckCircle,
      completed: currentIndex > 3,
      active: currentIndex === 3,
      description: 'Todo listo para el lanzamiento',
    },
    {
      status: 'activa',
      label: 'Campaña en marcha',
      icon: Play,
      date: premiereStart,
      completed: currentIndex > 4,
      active: currentIndex === 4,
      description: premiereStart
        ? `Lanzamiento: ${format(new Date(premiereStart), "d 'de' MMMM", { locale: es })}`
        : 'La campaña está ejecutándose',
    },
    {
      status: 'finalizada',
      label: 'Reporte final',
      icon: TrendingUp,
      date: finalReportDate,
      completed: currentIndex >= 5,
      active: currentIndex === 5,
      description: finalReportDate
        ? `Entrega: ${format(new Date(finalReportDate), "d 'de' MMMM", { locale: es })}`
        : 'Recibirás el reporte completo de resultados',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.status} className="relative flex gap-4">
              {/* Línea vertical conectora */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-5 top-12 w-0.5 h-12 transition-colors ${
                    step.completed ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}

              {/* Icono */}
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  step.completed
                    ? 'border-primary bg-primary text-primary-foreground cinema-glow'
                    : step.active
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 animate-pulse'
                    : 'border-muted bg-background text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Contenido */}
              <div className="flex-1 pb-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4
                      className={`font-cinema text-lg ${
                        step.completed
                          ? 'text-foreground'
                          : step.active
                          ? 'text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </h4>
                    {step.description && (
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    )}
                  </div>

                  {step.date && step.completed && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(step.date), "d MMM yyyy", { locale: es })}
                    </span>
                  )}
                </div>

                {step.active && (
                  <div className="mt-2 rounded-md border border-yellow-400/20 bg-yellow-400/5 p-3">
                    <p className="text-sm text-yellow-400/90">
                      {getActiveStepMessage(step.status)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getActiveStepMessage = (status: string): string => {
  const messages: Record<string, string> = {
    borrador: 'Revisa y envía tu campaña cuando estés lista.',
    en_revision:
      'Nuestro equipo está analizando tu campaña. Te responderemos en 24-48h con feedback o aprobación.',
    pendiente_creativos:
      'Sube los materiales creativos antes de la fecha límite para que podamos lanzar tu campaña a tiempo.',
    aprobada:
      'Tu campaña ha sido aprobada. Estamos preparando todo para el lanzamiento programado.',
    activa:
      'Tu campaña está en marcha. Te enviaremos actualizaciones periódicas sobre el rendimiento.',
    finalizada:
      'La campaña ha finalizado. Estamos preparando tu reporte completo de resultados.',
  };
  return messages[status] || 'Procesando...';
};

export default CampaignTimeline;
