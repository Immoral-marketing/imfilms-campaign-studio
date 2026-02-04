import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LOG_INTERVAL = 1000 * 60 * 60; // 1 hour cooldown for logging

export const useAccessLogger = () => {
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserId(session?.user?.id || null);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const logAccess = async () => {
            if (!userId) return;

            const lastLogTime = sessionStorage.getItem('last_access_log');
            const now = Date.now();

            // Log if no record in session storage or if interval has passed
            if (!lastLogTime || (now - parseInt(lastLogTime)) > LOG_INTERVAL) {
                try {
                    // @ts-ignore - access_logs table might not be in types yet
                    const { error } = await supabase
                        .from('access_logs')
                        .insert({
                            user_id: userId
                        });

                    if (!error) {
                        sessionStorage.setItem('last_access_log', now.toString());
                        console.log('User access logged');
                    } else {
                        // Silent fail suitable for analytics
                        console.warn('Error logging access:', error);
                    }
                } catch (err) {
                    console.error('Failed to log access:', err);
                }
            }
        };

        logAccess();
    }, [userId]);
};
