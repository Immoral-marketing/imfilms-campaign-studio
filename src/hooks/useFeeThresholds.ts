import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeeThreshold {
    id: string;
    min_investment: number;
    max_investment: number | null;
    variable_fee_rate: number;
    fixed_fee_amount: number;
    setup_fee_per_platform: number;
    is_variable_fee_enabled: boolean;
    is_fixed_fee_enabled: boolean;
    is_setup_fee_enabled: boolean;
    created_at?: string;
    updated_at?: string;
}

const feeThresholdKeys = {
    all: ['fee-thresholds'] as const,
};

export const useFeeThresholds = () => {
    return useQuery({
        queryKey: feeThresholdKeys.all,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('fee_thresholds')
                .select('*')
                .order('min_investment', { ascending: true });

            if (error) throw error;
            return data as FeeThreshold[];
        },
    });
};

export const useUpsertFeeThreshold = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (threshold: Partial<FeeThreshold> & { min_investment: number }) => {
            const { data, error } = await supabase
                .from('fee_thresholds')
                .upsert(threshold)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeThresholdKeys.all });
            toast.success('Umbral guardado correctamente');
        },
        onError: (error: any) => {
            console.error('Error saving fee threshold:', error);
            toast.error('Error al guardar el umbral');
        },
    });
};

export const useDeleteFeeThreshold = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('fee_thresholds')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeThresholdKeys.all });
            toast.success('Umbral eliminado correctamente');
        },
        onError: (error: any) => {
            console.error('Error deleting fee threshold:', error);
            toast.error('Error al eliminar el umbral');
        },
    });
};
