import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { FilmEditProposal } from '@/hooks/useFilmEditProposals';

interface PendingEditBannerProps {
    proposal: FilmEditProposal;
    currentFilm: {
        title: string;
        country: string;
        genre: string;
        target_audience_text?: string;
        main_goals?: string[];
    };
}

const PendingEditBanner = ({ proposal, currentFilm }: PendingEditBannerProps) => {
    const [expanded, setExpanded] = useState(false);
    const proposed = proposal.proposed_data;

    // Helper to check if field changed
    const hasChanged = (field: keyof typeof proposed) => {
        const currentValue = currentFilm[field];
        const proposedValue = proposed[field];

        if (Array.isArray(currentValue) && Array.isArray(proposedValue)) {
            return JSON.stringify(currentValue) !== JSON.stringify(proposedValue);
        }

        return currentValue !== proposedValue;
    };

    // Get list of changed fields
    const changedFields = (Object.keys(proposed) as Array<keyof typeof proposed>).filter(
        (field) => hasChanged(field)
    );

    const fieldLabels: Record<keyof typeof proposed, string> = {
        title: 'Título',
        country: 'País',
        genre: 'Género',
        target_audience_text: 'Audiencia Objetivo',
        main_goals: 'Objetivos Principales',
    };

    return (
        <Alert className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-900 dark:text-yellow-100 font-semibold">
                Cambios en revisión
            </AlertTitle>
            <AlertDescription className="space-y-2">
                <p className="text-yellow-800 dark:text-yellow-200">
                    Tienes una propuesta de edición pendiente de aprobación por un administrador.
                </p>

                {changedFields.length > 0 && (
                    <div className="mt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(!expanded)}
                            className="text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 p-0 h-auto"
                        >
                            {expanded ? (
                                <>
                                    <ChevronUp className="h-4 w-4 mr-1" />
                                    Ocultar detalles
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                    Ver cambios propuestos ({changedFields.length})
                                </>
                            )}
                        </Button>

                        {expanded && (
                            <div className="mt-3 space-y-3 p-3 bg-white dark:bg-gray-900 rounded-md border border-yellow-200 dark:border-yellow-800">
                                {changedFields.map((field) => (
                                    <div key={field} className="space-y-1">
                                        <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-100">
                                            {fieldLabels[field]}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            {/* Current value */}
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground">Actual:</p>
                                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                                    {Array.isArray(currentFilm[field]) ? (
                                                        <ul className="space-y-1">
                                                            {(currentFilm[field] as string[]).map((item, i) => (
                                                                <li key={i} className="flex items-start gap-1">
                                                                    <span className="text-gray-400">•</span>
                                                                    <span>{item}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-gray-700 dark:text-gray-300">
                                                            {currentFilm[field] || '—'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Proposed value */}
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground">Propuesto:</p>
                                                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
                                                    {Array.isArray(proposed[field]) ? (
                                                        <ul className="space-y-1">
                                                            {(proposed[field] as string[]).map((item, i) => (
                                                                <li key={i} className="flex items-start gap-1">
                                                                    <span className="text-yellow-500">•</span>
                                                                    <span className="text-yellow-900 dark:text-yellow-100">
                                                                        {item}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-yellow-900 dark:text-yellow-100 font-medium">
                                                            {proposed[field] || '—'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
};

export default PendingEditBanner;
