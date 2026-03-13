import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { FilmEditProposal, useApproveFilmProposal, useRejectFilmProposal } from '@/hooks/useFilmEditProposals';

interface PendingEditBannerProps {
    proposal: FilmEditProposal;
    currentFilm: {
        title: string;
        country: string;
        genre: string;
        secondary_genre?: string;
        target_audience_text?: string;
        main_goals?: string[];
    };
    currentPlatforms?: {
        platform_name: string;
        budget_percent: number;
    }[];
    currentCampaign?: {
        ad_investment_amount?: number;
        fixed_fee_amount?: number;
        variable_fee_amount?: number;
        setup_fee_amount?: number;
        total_estimated_amount?: number;
        pre_start_date?: string;
        pre_end_date?: string;
        premiere_weekend_start?: string;
        premiere_weekend_end?: string;
        final_report_date?: string;
        creatives_deadline?: string;
    };
    isAdmin?: boolean;
    onApproved?: () => void;
    onRejected?: () => void;
}

const PendingEditBanner = ({ 
    proposal, 
    currentFilm, 
    currentPlatforms = [], 
    currentCampaign = {},
    isAdmin = false, 
    onApproved, 
    onRejected 
}: PendingEditBannerProps) => {
    const [expanded, setExpanded] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectComment, setRejectComment] = useState('');

    const approveProposal = useApproveFilmProposal();
    const rejectProposal = useRejectFilmProposal();

    const proposed = proposal.proposed_data;

    // Helper to get current value for comparison and display
    const getCurrentValue = (field: keyof typeof proposed) => {
        // Platform fields
        if (field === 'platforms') return currentPlatforms;
        
        // Campaign fields
        const campaignFields: (keyof typeof proposed)[] = [
            'ad_investment_amount', 'fixed_fee_amount', 'variable_fee_amount', 
            'setup_fee_amount', 'total_estimated_amount', 'pre_start_date', 
            'pre_end_date', 'premiere_weekend_start', 'premiere_weekend_end', 
            'final_report_date', 'creatives_deadline'
        ];
        if (campaignFields.includes(field)) {
            return (currentCampaign as any)[field];
        }

        // Film fields
        return (currentFilm as any)[field];
    };

    // Helper to check if field changed
    const hasChanged = (field: keyof typeof proposed) => {
        if (field === 'platforms') {
            const current = currentPlatforms || [];
            const update = proposed.platforms || [];

            // Sort by platform name to ensure consistent comparison
            const sortedCurrent = [...current].sort((a, b) => a.platform_name.localeCompare(b.platform_name));
            const sortedUpdate = [...update].sort((a, b) => a.platform_name.localeCompare(b.platform_name));

            return JSON.stringify(sortedCurrent) !== JSON.stringify(sortedUpdate);
        }

        const currentValue = getCurrentValue(field);
        const proposedValue = proposed[field];

        if (Array.isArray(currentValue) && Array.isArray(proposedValue)) {
            // Sort arrays for comparison if they are string arrays (like main_goals)
            if (typeof currentValue[0] === 'string') {
                return JSON.stringify([...currentValue].sort()) !== JSON.stringify([...proposedValue].sort());
            }
            return JSON.stringify(currentValue) !== JSON.stringify(proposedValue);
        }

        // Handle undefined vs empty string cases or null
        const normCurrent = currentValue === null || currentValue === undefined ? '' : String(currentValue);
        const normProposed = proposedValue === null || proposedValue === undefined ? '' : String(proposedValue);

        return normCurrent !== normProposed;
    };

    // Get list of changed fields
    let changedFields = (Object.keys(proposed) as Array<keyof typeof proposed>).filter(
        (field) => hasChanged(field)
    );

    // Simplification: if release_date is changing, hide the recalculated/technical campaign dates
    if (changedFields.includes('release_date')) {
        const technicalDates: (keyof typeof proposed)[] = [
            'pre_start_date', 'pre_end_date', 'premiere_weekend_start', 
            'premiere_weekend_end', 'final_report_date', 'creatives_deadline'
        ];
        changedFields = changedFields.filter(f => !technicalDates.includes(f));
    }

    const fieldLabels: Record<keyof typeof proposed, string> = {
        title: 'Título',
        country: 'País',
        genre: 'Género',
        secondary_genre: 'Género Secundario',
        target_audience_text: 'Audiencia Objetivo',
        target_audience_urls: 'Enlaces de Audiencia',
        target_audience_files: 'Archivos de Audiencia',
        main_goals: 'Objetivos Principales',
        platforms: 'Distribución de Presupuesto',
        ad_investment_amount: 'Presupuesto Ads',
        fixed_fee_amount: 'Fee Fijo',
        variable_fee_amount: 'Fee Variable',
        setup_fee_amount: 'Fee Setup',
        total_estimated_amount: 'Total Estimado',
        release_date: 'Fecha de Estreno',
        pre_start_date: 'Inicio Pre-campaña',
        pre_end_date: 'Fin Pre-campaña',
        premiere_weekend_start: 'Inicio Finde Estreno',
        premiere_weekend_end: 'Fin Finde Estreno',
        final_report_date: 'Reporte Final',
        creatives_deadline: 'Deadline Creativos',
    };

    const renderValue = (field: keyof typeof proposed, value: any, isCurrent: boolean) => {
        if (value === undefined || value === null) return '—';

        if (field === 'platforms') {
            const platforms = value as { platform_name: string; budget_percent: number; }[];
            if (!platforms || platforms.length === 0) return '—';
            return (
                <ul className="space-y-1">
                    {platforms.map((p, i) => (
                        <li key={i} className="flex justify-between text-xs">
                            <span className={isCurrent ? "text-gray-300" : "text-cinema-yellow"}>{p.platform_name}</span>
                            <span className={isCurrent ? "text-white font-mono" : "text-white font-mono font-bold"}>
                                {p.budget_percent}%
                            </span>
                        </li>
                    ))}
                </ul>
            );
        }

        if (Array.isArray(value)) {
            if (value.length === 0) return '—';
            return (
                <ul className="space-y-1">
                    {value.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                            <span className={isCurrent ? "text-gray-500" : "text-cinema-yellow"}>•</span>
                            <span className={isCurrent ? "text-white" : "text-cinema-yellow font-semibold"}>
                                {item}
                            </span>
                        </li>
                    ))}
                </ul>
            );
        }

        return (
            <p className={isCurrent ? "text-white" : "text-cinema-yellow font-semibold"}>
                {String(value)}
            </p>
        );
    };


    return (
        <Alert className="border-cinema-yellow bg-cinema-yellow/20">
            <AlertCircle className="h-4 w-4 text-white" />
            <AlertTitle className="text-white font-semibold">
                Cambios en revisión
            </AlertTitle>
            <AlertDescription className="space-y-2">
                <p className="text-white">
                    Tienes una propuesta de edición pendiente de aprobación por un administrador.
                </p>

                {changedFields.length > 0 && (
                    <div className="mt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(!expanded)}
                            className="text-white hover:text-gray-200 p-0 h-auto font-medium"
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
                            <div className="mt-3 space-y-3 p-3 rounded-md border" style={{ backgroundColor: '#404040', borderColor: '#6e6e6e' }}>
                                {changedFields.map((field) => (
                                    <div key={field} className="space-y-1 p-3 rounded-md border" style={{ backgroundColor: '#404040', borderColor: '#6e6e6e' }}>
                                        <p className="text-sm font-bold text-cinema-yellow">
                                            {fieldLabels[field]}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            {/* Current value */}
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-gray-400">Actual:</p>
                                                <div className="p-2 rounded border" style={{ backgroundColor: '#404040', borderColor: '#6e6e6e' }}>
                                                    {renderValue(field, getCurrentValue(field), true)}
                                                </div>
                                            </div>

                                            {/* Proposed value */}
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-cinema-yellow">Propuesto:</p>
                                                <div className="p-2 bg-cinema-yellow/20 rounded border-2 border-cinema-yellow">
                                                    {renderValue(field, proposed[field], false)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Admin Actions */}
                {isAdmin && (
                    <div className="mt-4 pt-4 border-t border-cinema-yellow">
                        {!showRejectForm ? (
                            <div className="flex gap-3">
                                <Button
                                    onClick={async () => {
                                        try {
                                            await approveProposal.mutateAsync(proposal.id);
                                            onApproved?.();
                                        } catch (error) {
                                            console.error('Error approving:', error);
                                        }
                                    }}
                                    disabled={approveProposal.isPending || rejectProposal.isPending}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    {approveProposal.isPending ? 'Aprobando...' : 'Aprobar y Aplicar Cambios'}
                                </Button>
                                <Button
                                    onClick={() => setShowRejectForm(true)}
                                    disabled={approveProposal.isPending || rejectProposal.isPending}
                                    variant="destructive"
                                    className="flex-1"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Rechazar
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="reject-comment" className="text-white font-medium">
                                        Comentario de rechazo (opcional)
                                    </Label>
                                    <Textarea
                                        id="reject-comment"
                                        value={rejectComment}
                                        onChange={(e) => setRejectComment(e.target.value)}
                                        placeholder="Explica por qué se rechazan estos cambios..."
                                        rows={3}
                                        className="resize-none bg-black/40 border-cinema-yellow/30 text-white placeholder:text-gray-500"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={async () => {
                                            try {
                                                await rejectProposal.mutateAsync({
                                                    proposalId: proposal.id,
                                                    comment: rejectComment.trim() || undefined,
                                                });
                                                setShowRejectForm(false);
                                                setRejectComment('');
                                                onRejected?.();
                                            } catch (error) {
                                                console.error('Error rejecting:', error);
                                            }
                                        }}
                                        disabled={approveProposal.isPending || rejectProposal.isPending}
                                        variant="destructive"
                                        className="flex-1"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        {rejectProposal.isPending ? 'Rechazando...' : 'Confirmar Rechazo'}
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setShowRejectForm(false);
                                            setRejectComment('');
                                        }}
                                        disabled={approveProposal.isPending || rejectProposal.isPending}
                                        variant="outline"
                                        className="flex-1 border-gray-300"
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
};

export default PendingEditBanner;
