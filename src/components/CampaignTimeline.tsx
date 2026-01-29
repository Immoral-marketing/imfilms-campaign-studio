import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Calendar, FileText, Play, TrendingUp } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface TimelineStep {
  status: string;
  label: string;
  icon: React.ElementType;
  date?: string;
  completed: boolean;
  active: boolean;
  description?: React.ReactNode;
}

interface CampaignTimelineProps {
  campaignId: string;
  status: string;
  createdAt: string;
  creativesDeadline?: string;
  premiereStart?: string;
  finalReportDate?: string;
  onNavigateToCreatives?: () => void;
}

const CampaignTimeline = ({
  campaignId,
  status,
  createdAt,
  creativesDeadline,
  premiereStart,
  finalReportDate,
  onNavigateToCreatives,
}: CampaignTimelineProps) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  // Load creative assets for this campaign
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const { data, error } = await supabase
          .from('campaign_assets')
          .select('status')
          .eq('campaign_id', campaignId);

        if (!error && data) {
          setAssets(data);
        }
      } catch (error) {
        console.error('Error loading assets:', error);
      } finally {
        setLoadingAssets(false);
      }
    };

    loadAssets();
  }, [campaignId]);
  // Normalize status for backward compatibility
  const normalizeStatus = (s: string) => {
    if (s === 'aprobado') return 'aprobada';
    if (s === 'revisando') return 'en_revision';
    if (s === 'nuevo') return 'borrador';
    return s;
  };

  const normalizedStatus = normalizeStatus(status);

  const statusOrder = [
    'borrador',
    'en_revision',
    'aprobada',
    'creativos_en_revision',
    'activa',
    'finalizada',
  ];

  const currentIndex = statusOrder.indexOf(normalizedStatus);

  // Helper to determine step state
  const isCompleted = (stepIndex: number) => currentIndex > stepIndex;
  const isActive = (stepIndex: number) => currentIndex === stepIndex;

  // Custom mapping strictly for the requested flow
  // 0: Created
  // 1: Revision (en_revision)
  // 2: Upload Creatives (aprobada, creativos_en_revision)
  // 3: Active (activa)
  // 4: Final (finalizada)

  // We need to map the status index to the step index carefully.
  // Status 'borrador' (0) -> Step 0 Active
  // Status 'en_revision' (1) -> Step 1 Active
  // Status 'aprobada' (2) -> Step 2 Active
  // Status 'creativos_en_revision' (3) -> Step 2 Active (or Completed/Waiting?)
  // Let's make Step 2 Active for both 2 and 3, but maybe change text?
  // User said: "Cuando el equipo cambia para el estado de aprovado... tenemos que decir... tiene hasta el día..."
  // User said: "subir creatividades... cambiaremos a creatividades en revisión"

  // Let's try to map status to step explicitly.

  const steps: TimelineStep[] = [
    {
      status: 'borrador', // Step 0
      label: 'Campaña creada',
      icon: CheckCircle,
      date: createdAt,
      completed: currentIndex > 0,
      active: currentIndex === 0,
      description: 'Tu solicitud de campaña ha sido registrada',
    },
    {
      status: 'en_revision', // Step 1
      label: 'En revisión por imfilms',
      icon: Clock,
      completed: currentIndex > 1,
      active: currentIndex === 1,
      description: currentIndex > 1
        ? <span className="text-green-500 font-medium">Campaña aprobada</span>
        : 'Nuestro equipo está revisando tu campaña (24-48h)',
    },
    {
      status: 'aprobada', // Step 2 (covers aprobada & creativos_en_revision)
      label: 'Subida de creativos',
      icon: FileText,
      date: creativesDeadline,
      completed: currentIndex > 3, // Completed when active (4) or final (5)
      active: currentIndex === 2 || currentIndex === 3,
      description: creativesDeadline
        ? `Fecha límite: ${format(new Date(creativesDeadline), "d 'de' MMMM", { locale: es })}`
        : 'Pendiente de recibir materiales creativos',
    },
    {
      status: 'activa', // Step 3
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
      status: 'finalizada', // Step 4
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
                  className={`absolute left-5 top-12 w-0.5 h-12 transition-colors ${step.completed ? 'bg-primary' : 'bg-muted'
                    }`}
                />
              )}

              {/* Icono */}
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${step.completed
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
                      className={`font-cinema text-lg ${step.completed
                        ? 'text-foreground'
                        : step.active
                          ? 'text-yellow-400'
                          : 'text-muted-foreground'
                        }`}
                    >
                      {step.label}
                    </h4>
                    {step.description && (
                      <div className="text-sm text-muted-foreground">{step.description}</div>
                    )}
                  </div>

                  {step.date && (step.completed || step.active) && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(step.date), "d MMM yyyy", { locale: es })}
                    </span>
                  )}
                </div>

                {step.active && (
                  <div className="mt-2 rounded-md border border-yellow-400/20 bg-yellow-400/5 p-3">
                    <div className="text-sm text-yellow-400/90">
                      {getActiveStepMessage(normalizedStatus, creativesDeadline, onNavigateToCreatives, assets, loadingAssets)}
                    </div>
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

const getActiveStepMessage = (
  status: string,
  deadline?: string,
  onNavigate?: () => void,
  assets?: any[],
  loadingAssets?: boolean
): React.ReactNode => {
  let daysLeft = 0;
  if (deadline) {
    const today = new Date();
    const target = new Date(deadline);
    daysLeft = differenceInDays(target, today);
    if (daysLeft < 0) daysLeft = 0;
  }

  // Analyze assets for 'aprobada' status
  if (status === 'aprobada' && !loadingAssets) {
    if (!assets || assets.length === 0) {
      // No assets uploaded yet
      return (
        <span>
          Tienes {daysLeft} días para subir las creatividades en la pestaña de{' '}
          <button
            onClick={onNavigate}
            className="underline hover:text-yellow-200 font-medium cursor-pointer"
          >
            Creativos
          </button>
        </span>
      );
    }

    // Check asset statuses
    const rejectedCount = assets.filter(a => a.status === 'rechazado').length;
    const approvedCount = assets.filter(a => a.status === 'aprobado').length;
    const pendingCount = assets.filter(a => a.status === 'pendiente_revision').length;

    if (rejectedCount > 0) {
      return (
        <span className="text-red-400">
          Tienes {rejectedCount} creatividad{rejectedCount > 1 ? 'es' : ''} rechazada{rejectedCount > 1 ? 's' : ''}.
          Revísala{rejectedCount > 1 ? 's' : ''} en la pestaña de{' '}
          <button
            onClick={onNavigate}
            className="underline hover:text-red-300 font-medium cursor-pointer"
          >
            Creativos
          </button>
          {' '}para dar continuidad a la campaña.
        </span>
      );
    }

    if (approvedCount === assets.length) {
      return (
        <span className="text-green-400">
          ¡Todas tus creatividades han sido aprobadas! La campaña estará activa pronto.
        </span>
      );
    }

    // Some pending review
    return (
      <span>
        Tus creatividades están siendo revisadas por nuestro equipo. Te notificaremos cuando estén listas.
      </span>
    );
  }

  const messages: Record<string, React.ReactNode> = {
    borrador: 'Revisa y envía tu campaña cuando estés lista.',
    en_revision:
      'Nuestro equipo está analizando tu campaña. Te responderemos en 24-48h con feedback o aprobación.',
    creativos_en_revision:
      'Has subido tus creativos. Nuestro equipo los está revisando para asegurar que cumplen con los requisitos.',
    activa:
      'Tu campaña está en marcha. Te enviaremos actualizaciones periódicas sobre el rendimiento.',
    finalizada:
      'La campaña ha finalizado. Estamos preparando tu reporte completo de resultados.',
  };
  return messages[status] || 'Procesando...';
};

export default CampaignTimeline;
