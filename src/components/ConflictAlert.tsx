import { AlertTriangle, Info, CheckCircle, Calendar, Users, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import HelpTooltip from '@/components/HelpTooltip';

interface ConflictAlertProps {
  level: 'none' | 'low' | 'medium' | 'high';
  conflicts: Array<{
    id: string;
    filmTitle: string;
    reason: string[];
    premiereDate: string;
  }>;
  onModifyDates?: () => void;
  isAdmin?: boolean;
}

const ConflictAlert = ({
  level,
  conflicts,
  onModifyDates,
  isAdmin = false,
}: ConflictAlertProps) => {
  const [showDetails, setShowDetails] = useState(false);

  if (level === 'none') {
    return (
      <Alert className="border-green-500/20 bg-green-500/5">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <div className="flex items-center gap-2">
          <AlertTitle className="text-green-500 font-cinema mb-0">Sin conflictos detectados</AlertTitle>
          <HelpTooltip
            title="Política de resolución de conflictos"
            content="🎯 Protegemos el rendimiento de cada estreno

Para que tu campaña funcione al máximo, no aceptamos proyectos que compitan directamente entre sí.

✓ Así te beneficia:
• Tu inversión no compite con otras películas similares
• Mayor efectividad en costes por alcance
• Audiencia 100% disponible para tu estreno

📋 Criterio sencillo y transparente:
La primera distribuidora en reservar fechas y audiencia tiene prioridad para ese espacio de campaña."
            fieldId="conflict_policy"
          />
        </div>
        <AlertDescription className="text-green-400/80">
          No hemos detectado solapamientos con otras campañas activas. Puedes continuar con confianza.
        </AlertDescription>
      </Alert>
    );
  }

  if (level === 'low') {
    return (
      <>
        <Alert className="border-blue-500/20 bg-blue-500/5">
          <Info className="h-5 w-5 text-blue-500" />
          <div className="flex items-center gap-2">
            <AlertTitle className="text-blue-500 font-cinema mb-0">Solapamiento mínimo</AlertTitle>
            <HelpTooltip
              title="Política de resolución de conflictos"
              content="🎯 Protegemos el rendimiento de cada estreno

  Para que tu campaña funcione al máximo, no aceptamos proyectos que compitan directamente entre sí.

  ✓ Así te beneficia:
  • Tu inversión no compite con otras películas similares
  • Mayor efectividad en costes por alcance
  • Audiencia 100% disponible para tu estreno

  📋 Criterio sencillo y transparente:
  La primera distribuidora en reservar fechas y audiencia tiene prioridad para ese espacio de campaña."
              fieldId="conflict_policy"
            />
          </div>
          <AlertDescription className="text-blue-400/80">
            Hemos detectado un ligero solapamiento con {conflicts.length} campaña(s).
            No es bloqueante, pero podríamos optimizar la estrategia. Nuestro equipo te contactará por cualquier posible conflicto.
            {isAdmin && (
              <button
                onClick={() => setShowDetails(true)}
                className="underline hover:text-blue-300 ml-1"
              >
                Ver detalles
              </button>
            )}
          </AlertDescription>
        </Alert>

        <ConflictDetailsDialog
          open={showDetails}
          onOpenChange={setShowDetails}
          level={level}
          conflicts={conflicts}
          onModifyDates={onModifyDates}
        />
      </>
    );
  }

  if (level === 'medium') {
    return (
      <>
        <Alert className="border-yellow-500/20 bg-yellow-500/5">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <div className="flex items-center gap-2">
            <AlertTitle className="text-yellow-500 font-cinema mb-0">
              Solapamiento moderado detectado
            </AlertTitle>
            <HelpTooltip
              title="Política de resolución de conflictos"
              content="🎯 Protegemos el rendimiento de cada estreno

Para que tu campaña funcione al máximo, no aceptamos proyectos que compitan directamente entre sí.

✓ Así te beneficia:
• Tu inversión no compite con otras películas similares
• Mayor efectividad en costes por alcance
• Audiencia 100% disponible para tu estreno

📋 Criterio sencillo y transparente:
La primera distribuidora en reservar fechas y audiencia tiene prioridad para ese espacio de campaña."
              fieldId="conflict_policy"
            />
          </div>
          <AlertDescription className="text-yellow-400/80 space-y-2">
            <p>
              Hemos detectado cierto solapamiento con {conflicts.length} campaña(s) programada(s) en fechas similares.
            </p>
            <p>
              No es bloqueante, pero podríamos revisar la estrategia para optimizar resultados y evitar competir contra nosotros mismos. Nuestro equipo te contactará por cualquier posible conflicto.
            </p>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(true)}
                className="mt-2"
              >
                Ver detalles y opciones
              </Button>
            )}
          </AlertDescription>
        </Alert>

        <ConflictDetailsDialog
          open={showDetails}
          onOpenChange={setShowDetails}
          level={level}
          conflicts={conflicts}
          onModifyDates={onModifyDates}

        />
      </>
    );
  }

  // level === 'high'
  return (
    <>
      <Alert className="border-red-500 bg-red-500/10">
        <AlertTriangle className="h-6 w-6 text-red-500" />
        <div className="flex items-center gap-2">
          <AlertTitle className="text-red-500 font-cinema text-xl mb-0">
            ⚠️ Conflicto de fechas detectado
          </AlertTitle>
          <HelpTooltip
            title="Política de resolución de conflictos"
            content="🎯 Protegemos el rendimiento de cada estreno

Para que tu campaña funcione al máximo, no aceptamos proyectos que compitan directamente entre sí.

✓ Así te beneficia:
• Tu inversión no compite con otras películas similares
• Mayor efectividad en costes por alcance
• Audiencia 100% disponible para tu estreno

📋 Criterio sencillo y transparente:
La primera distribuidora en reservar fechas y audiencia tiene prioridad para ese espacio de campaña."
            fieldId="conflict_policy"
          />
        </div>
        <AlertDescription className="text-red-400 space-y-3">
          <p className="font-semibold">
            Ya tenemos otra campaña programada en fechas similares para este género.
          </p>
          <p>
            Esto puede afectar al rendimiento al competir por la misma audiencia, pero <strong>puedes continuar con tu configuración</strong>. Nuestro equipo revisará la solicitud manualmente para optimizar los calendarios y resolver cualquier solapamiento.
          </p>
          <div className="space-y-2 pt-2">
            <p className="font-cinema text-yellow-400">¿Qué sucederá ahora?</p>
            <div className="space-y-1 text-sm">
              <p>• Puedes seguir completando los pasos del wizard.</p>
              <p>• Un administrador contactará contigo tras recibir la solicitud para validar las fechas.</p>
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="p-0 h-auto text-yellow-400 hover:text-yellow-300"
            >
              Ver detalles del conflicto → (Admin)
            </Button>
          )}
        </AlertDescription>
      </Alert>

      <ConflictDetailsDialog
        open={showDetails}
        onOpenChange={setShowDetails}
        level={level}
        conflicts={conflicts}
        onModifyDates={onModifyDates}
      />
    </>
  );
};

const ConflictDetailsDialog = ({
  open,
  onOpenChange,
  level,
  conflicts,
  onModifyDates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: string;
  conflicts: ConflictAlertProps['conflicts'];
  onModifyDates?: () => void;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cinema text-2xl flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-400" />
            Detalles del conflicto
          </DialogTitle>
          <DialogDescription>
            Campañas que podrían competir con tu configuración actual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {conflicts.map((conflict, index) => (
            <div
              key={conflict.id}
              className="border border-border/40 rounded-lg p-4 space-y-2 bg-muted/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-cinema text-lg text-yellow-400">
                    {conflict.filmTitle}
                  </h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    Estreno: {new Date(conflict.premiereDate).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground/80">Coincidencias detectadas:</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {conflict.reason.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}

          {level === 'high' && (
            <div className="border-t border-border/40 pt-4 space-y-3">
              <p className="text-sm font-semibold">Opciones para resolver el conflicto:</p>
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center px-3 py-1 rounded bg-cinema-yellow/20 text-cinema-yellow border border-cinema-yellow/30 text-sm font-medium cursor-default">
                  <Calendar className="mr-2 h-4 w-4" />
                  Cambiar fechas
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog >
  );
};

export default ConflictAlert;
