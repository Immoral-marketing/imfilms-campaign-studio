import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlags {
    [key: string]: boolean;
}

export const useFeatureFlags = () => {
    const [flags, setFlags] = useState<FeatureFlags>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFlags();
    }, []);

    const loadFlags = async () => {
        try {
            const { data, error } = await supabase
                .from('feature_flags')
                .select('key, enabled');

            if (error) throw error;

            const flagMap: FeatureFlags = {};
            (data || []).forEach((flag: any) => {
                flagMap[flag.key] = flag.enabled;
            });
            setFlags(flagMap);
        } catch (error) {
            console.error('Error loading feature flags:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFlag = async (key: string, enabled: boolean) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('feature_flags')
                .update({ enabled, updated_by: user?.id } as any)
                .eq('key', key);

            if (error) throw error;

            setFlags(prev => ({ ...prev, [key]: enabled }));
            return true;
        } catch (error) {
            console.error('Error toggling feature flag:', error);
            return false;
        }
    };

    const isEnabled = (key: string, defaultValue = true): boolean => {
        return flags[key] ?? defaultValue;
    };

    return { flags, loading, toggleFlag, isEnabled, refetch: loadFlags };
};
