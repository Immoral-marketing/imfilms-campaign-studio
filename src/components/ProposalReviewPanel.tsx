import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, AlertCircle } from 'lucide-react';
import { FilmEditProposal, useApproveFilmProposal, useRejectFilmProposal } from '@/hooks/useFilmEditProposals';
import { formatDateShort } from '@/utils/dateUtils';

interface ProposalReviewPanelProps {
    proposal: FilmEditProposal;
    currentFilm: {
        title: string;
        country: string;
        genre: string;
        target_audience_text?: string;
        main_goals?: string[];
    };
    onApproved?: () => void;
    onRejected?: () => void;
}

const ProposalReviewPanel = ({ proposal, currentFilm, onApproved, onRejected }: ProposalReviewPanelProps) => {
    const [rejectComment, setRejectComment] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    const approveProposal = useApproveFilmProposal();
    const rejectProposal = useRejectFilmProposal();

    const proposed = proposal.proposed_data;

    const handleApprove = async () => {
        try {
            await approveProposal.mutateAsync(proposal.id);
            onApproved?.();
        } catch (error) {
            console.error('Error approving:', error);
        }
    };

    const handleReject = async () => {
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
    };

    const fieldLabels: Record<keyof typeof proposed, string> = {
        title: 'Título',
        country: 'País',
        genre: 'Género',
        target_audience_text: 'Audiencia Objetivo',
        main_goals: 'Objetivos Principales',
    };

    const isLoading = approveProposal.isPending || rejectProposal.isPending;

    return (
        <Card className="p-6 border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/10">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                            <h3 className="font-cinema text-xl text-yellow-900 dark:text-yellow-100">
                                Propuesta de Edición Pendiente
                            </h3>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Propuesta creada el {formatDateShort(new Date(proposal.created_at))}
                        </p>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">
                        Cambios Propuestos
                    </h4>

                    <div className="space-y-4">
                        {(Object.keys(proposed) as Array<keyof typeof proposed>).map((field) => {
                            const currentValue = currentFilm[field];
                            const proposedValue = proposed[field];

                            // Check if values are different
                            const isDifferent = Array.isArray(currentValue) && Array.isArray(proposedValue)
                                ? JSON.stringify(currentValue) !== JSON.stringify(proposedValue)
                                : currentValue !== proposedValue;

                            return (
                                <div
                                    key={field}
                                    className={`p-4 rounded-lg border ${isDifferent
                                            ? 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                                        }`}
                                >
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        {fieldLabels[field]}
                                        {isDifferent && (
                                            <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                                                (Modificado)
                                            </span>
                                        )}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Current */}
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Actual:</p>
                                            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded min-h-[40px]">
                                                {Array.isArray(currentValue) ? (
                                                    <ul className="space-y-1">
                                                        {currentValue.map((item, i) => (
                                                            <li key={i} className="flex items-start gap-1 text-sm">
                                                                <span className="text-gray-400">•</span>
                                                                <span>{item}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                        {currentValue || '—'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Proposed */}
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Propuesto:</p>
                                            <div className={`p-2 rounded min-h-[40px] ${isDifferent
                                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-600'
                                                    : 'bg-gray-50 dark:bg-gray-800'
                                                }`}>
                                                {Array.isArray(proposedValue) ? (
                                                    <ul className="space-y-1">
                                                        {proposedValue.map((item, i) => (
                                                            <li key={i} className="flex items-start gap-1 text-sm">
                                                                <span className={isDifferent ? 'text-yellow-500' : 'text-gray-400'}>
                                                                    •
                                                                </span>
                                                                <span className={isDifferent ? 'font-medium' : ''}>
                                                                    {item}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className={`text-sm whitespace-pre-wrap ${isDifferent ? 'font-medium text-yellow-900 dark:text-yellow-100' : 'text-gray-700 dark:text-gray-300'
                                                        }`}>
                                                        {proposedValue || '—'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-4 pt-4 border-t border-yellow-300 dark:border-yellow-700">
                    {!showRejectForm ? (
                        <div className="flex gap-3">
                            <Button
                                onClick={handleApprove}
                                disabled={isLoading}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Check className="h-4 w-4 mr-2" />
                                {approveProposal.isPending ? 'Aprobando...' : 'Aprobar y Aplicar Cambios'}
                            </Button>
                            <Button
                                onClick={() => setShowRejectForm(true)}
                                disabled={isLoading}
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
                                <Label htmlFor="reject-comment">Comentario de rechazo (opcional)</Label>
                                <Textarea
                                    id="reject-comment"
                                    value={rejectComment}
                                    onChange={(e) => setRejectComment(e.target.value)}
                                    placeholder="Explica por qué se rechazan estos cambios..."
                                    rows={3}
                                    className="resize-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    onClick={handleReject}
                                    disabled={isLoading}
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
                                    disabled={isLoading}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default ProposalReviewPanel;
