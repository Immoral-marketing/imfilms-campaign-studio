import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Type definitions
export interface FilmEditProposal {
    id: string;
    film_id: string;
    campaign_id: string;
    proposed_data: {
        title?: string;
        country?: string;
        genre?: string;
        target_audience_text?: string;
        main_goals?: string[];
    };
    status: 'pending' | 'approved' | 'rejected';
    created_by: string;
    created_at: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_comment: string | null;
}

export interface CreateProposalInput {
    filmId: string;
    campaignId: string;
    proposedData: {
        title: string;
        country: string;
        genre: string;
        target_audience_text?: string;
        main_goals?: string[];
    };
}

// Query keys
const filmEditProposalKeys = {
    all: ['film-edit-proposals'] as const,
    byFilm: (filmId: string) => [...filmEditProposalKeys.all, 'film', filmId] as const,
    pending: (filmId: string) => [...filmEditProposalKeys.byFilm(filmId), 'pending'] as const,
};

/**
 * Hook to get pending proposal for a specific film
 */
export const usePendingFilmProposal = (filmId: string | undefined) => {
    return useQuery({
        queryKey: filmId ? filmEditProposalKeys.pending(filmId) : [],
        queryFn: async () => {
            if (!filmId) return null;

            const { data, error } = await supabase
                .from('film_edit_proposals')
                .select('*')
                .eq('film_id', filmId)
                .eq('status', 'pending')
                .maybeSingle();

            if (error) throw error;
            return data ? (data as unknown as FilmEditProposal) : null;
        },
        enabled: !!filmId,
    });
};

/**
 * Hook to create a new film edit proposal
 */
export const useCreateFilmProposal = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ filmId, campaignId, proposedData }: CreateProposalInput) => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            const { data, error } = await supabase
                .from('film_edit_proposals')
                .insert({
                    film_id: filmId,
                    campaign_id: campaignId,
                    proposed_data: proposedData,
                    status: 'pending',
                    created_by: user.id,
                })
                .select()
                .single();

            if (error) throw error;
            return data as unknown as FilmEditProposal;
        },
        onSuccess: (data) => {
            // Invalidate queries to refetch pending proposals
            queryClient.invalidateQueries({
                queryKey: filmEditProposalKeys.byFilm(data.film_id)
            });

            toast.success('Propuesta enviada', {
                description: 'Los cambios están pendientes de revisión por un administrador.',
            });
        },
        onError: (error: any) => {
            console.error('Error creating proposal:', error);

            // Handle specific errors
            if (error.message?.includes('unique_pending_proposal')) {
                toast.error('Ya existe una propuesta pendiente', {
                    description: 'Espera a que se resuelva la propuesta actual antes de crear una nueva.',
                });
            } else {
                toast.error('Error al crear propuesta', {
                    description: error.message || 'No se pudo enviar la propuesta de cambios.',
                });
            }
        },
    });
};

/**
 * Hook to approve a film edit proposal
 */
export const useApproveFilmProposal = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (proposalId: string) => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            // First, update the proposal status
            const { data: proposal, error: updateError } = await supabase
                .from('film_edit_proposals')
                .update({
                    status: 'approved',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', proposalId)
                .select()
                .single();

            if (updateError) throw updateError;

            // Then, apply the changes using the stored function
            const { error: applyError } = await supabase.rpc('apply_approved_film_edit', {
                proposal_id: proposalId,
            });

            if (applyError) throw applyError;

            return proposal as unknown as FilmEditProposal;
        },
        onSuccess: (data) => {
            // Invalidate all related queries
            queryClient.invalidateQueries({
                queryKey: filmEditProposalKeys.byFilm(data.film_id)
            });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['films'] });

            toast.success('Propuesta aprobada', {
                description: 'Los cambios se han aplicado correctamente a la película.',
            });
        },
        onError: (error: any) => {
            console.error('Error approving proposal:', error);
            toast.error('Error al aprobar propuesta', {
                description: error.message || 'No se pudo aprobar la propuesta.',
            });
        },
    });
};

/**
 * Hook to reject a film edit proposal
 */
export const useRejectFilmProposal = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ proposalId, comment }: { proposalId: string; comment?: string }) => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            const { data, error } = await supabase
                .from('film_edit_proposals')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    review_comment: comment || null,
                })
                .eq('id', proposalId)
                .select()
                .single();

            if (error) throw error;
            return data as unknown as FilmEditProposal;
        },
        onSuccess: (data) => {
            // Invalidate queries to refetch
            queryClient.invalidateQueries({
                queryKey: filmEditProposalKeys.byFilm(data.film_id)
            });

            toast.success('Propuesta rechazada', {
                description: 'La propuesta ha sido rechazada. La distribuidora puede crear una nueva.',
            });
        },
        onError: (error: any) => {
            console.error('Error rejecting proposal:', error);
            toast.error('Error al rechazar propuesta', {
                description: error.message || 'No se pudo rechazar la propuesta.',
            });
        },
    });
};

/**
 * Hook to get all proposals for a film (all statuses)
 */
export const useFilmProposals = (filmId: string | undefined) => {
    return useQuery({
        queryKey: filmId ? filmEditProposalKeys.byFilm(filmId) : [],
        queryFn: async () => {
            if (!filmId) return [];

            const { data, error } = await supabase
                .from('film_edit_proposals')
                .select('*')
                .eq('film_id', filmId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []) as unknown as FilmEditProposal[];
        },
        enabled: !!filmId,
    });
};
